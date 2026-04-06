/**
 * Streaming Markdown Content Processor
 *
 * A stateful tokenizer that converts streaming text chunks (typically from LLM
 * APIs) into a sequence of typed ContentTokens. Designed for real-time rendering
 * with word-by-word animation support.
 *
 * Architecture:
 *   Streaming chunk → processContent() → ContentToken[]
 *   Complete string → processCompleteContent() → ContentToken[]
 *
 * Supported markdown features:
 *   - Headings (#, ##, ###)
 *   - Bold (**text**)
 *   - Inline code (`code`)
 *   - Fenced code blocks (```lang ... ```)
 *   - Horizontal rules (---)
 *   - Unordered list items (-)
 *   - Tables (| col | col |)
 *   - Display math (\[...\] and $$...$$)
 *   - Inline math (\(...\))
 */
// ── Utility functions ────────────────────────────────────────────────────────
const splitMarkdownTokens = (text) => text.match(/(#{1,6})|(\*{1,3})|(_{1,3})|(`{1,3})|(-{1,3})|([!\[\]\(\)>])|(\w+)|(\s+)|(\S)/g);
/** Parse "| A | B | C |" → ["A", "B", "C"] */
const parseTableRow = (line) => line.split('|').slice(1, -1).map(cell => cell.trim());
/** Returns true for separator rows like | --- | :---: | */
const isTableSeparator = (line) => /^\|(\s*:?-+:?\s*\|)+$/.test(line.trim());
/** Returns true for lines that look like table rows (| … |) */
const isTableRow = (line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1;
};
/** Generate a unique block ID */
const generateBlockId = () => Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
// ── Default state factory ────────────────────────────────────────────────────
const createInitialState = () => ({
    nextTitleFlag: 0,
    nextBoldText: false,
    nextBacktickedText: false,
    newlineFlag: true,
    testNextWord: false,
    isInCodeBlock: false,
    currentCodeBlockId: undefined,
    expectEmptyLine: false,
    codeLanguage: undefined,
    isInTable: false,
    tableRowCount: 0,
    tableRowBuffer: '',
    skipNewlineCount: 0,
    isInMathBlock: false,
    isInMathInline: false,
    mathBuffer: '',
    mathClosingDelimiter: '',
    pendingMathPrefix: '',
});
// ── ContentProcessor ─────────────────────────────────────────────────────────
export class ContentProcessor {
    constructor(options) {
        this.state = createInitialState();
        this.languageAliases = options?.languageAliases ?? {};
    }
    // ── Public API ───────────────────────────────────────────────────────────
    /**
     * Process a single streaming chunk and return tokens.
     * Call this once per chunk from the SSE/streaming response.
     */
    processContent(content) {
        const tokens = [];
        // Prepend any pending partial math delimiter from the previous chunk.
        if (this.state.pendingMathPrefix) {
            const prefix = this.state.pendingMathPrefix;
            this.state.pendingMathPrefix = '';
            if (this.state.isInCodeBlock) {
                tokens.push({
                    type: 'code_content',
                    content: prefix,
                    metadata: { codeBlockId: this.state.currentCodeBlockId },
                });
            }
            else {
                content = prefix + content;
            }
        }
        // ── Code block boundaries ──────────────────────────────────────────────
        if (content.includes('```')) {
            if (this.state.isInCodeBlock) {
                tokens.push({
                    type: 'code_block_end',
                    content: '',
                    metadata: { codeBlockId: this.state.currentCodeBlockId },
                });
                this.state.isInCodeBlock = false;
                this.state.currentCodeBlockId = undefined;
                this.state.codeLanguage = undefined;
                this.state.expectEmptyLine = false;
            }
            else {
                const blockId = generateBlockId();
                this.state.isInCodeBlock = true;
                this.state.currentCodeBlockId = blockId;
                tokens.push({
                    type: 'code_block_start',
                    content: '',
                    metadata: { codeBlockId: blockId },
                });
            }
            return tokens;
        }
        // Handle `` when inside a code block (stream may split ``` as `` + `)
        if (content.includes('``') && this.state.isInCodeBlock) {
            tokens.push({
                type: 'code_block_end',
                content: '',
                metadata: { codeBlockId: this.state.currentCodeBlockId },
            });
            this.state.isInCodeBlock = false;
            this.state.nextBacktickedText = true;
            this.state.currentCodeBlockId = undefined;
            this.state.codeLanguage = undefined;
            this.state.expectEmptyLine = false;
            return tokens;
        }
        // ── Content inside code blocks ─────────────────────────────────────────
        if (this.state.isInCodeBlock) {
            return this.processCodeContent(content, tokens);
        }
        // ── Math expression handling ───────────────────────────────────────────
        if (this.state.isInMathBlock || this.state.isInMathInline) {
            return this.processMathBuffer(content, tokens);
        }
        // Check for display math start: \[ or $$
        const displayStart = content.includes('\\[')
            ? { idx: content.indexOf('\\['), len: 2, closing: '\\]' }
            : content.includes('$$')
                ? { idx: content.indexOf('$$'), len: 2, closing: '$$' }
                : null;
        if (displayStart) {
            const before = content.slice(0, displayStart.idx);
            const after = content.slice(displayStart.idx + displayStart.len);
            if (before)
                tokens.push(...this.processContent(before));
            this.state.isInMathBlock = true;
            this.state.mathClosingDelimiter = displayStart.closing;
            this.state.mathBuffer = '';
            if (after)
                tokens.push(...this.processContent(after));
            return tokens;
        }
        // Check for inline math start: \(
        if (content.includes('\\(')) {
            const idx = content.indexOf('\\(');
            const before = content.slice(0, idx);
            const after = content.slice(idx + 2);
            if (before)
                tokens.push(...this.processContent(before));
            this.state.isInMathInline = true;
            this.state.mathClosingDelimiter = '\\)';
            this.state.mathBuffer = '';
            if (after)
                tokens.push(...this.processContent(after));
            return tokens;
        }
        // ── Table row detection ────────────────────────────────────────────────
        if (this.state.newlineFlag && content.trimStart().startsWith('|')) {
            this.state.isInTable = true;
        }
        if (this.state.isInTable) {
            return this.processTableContent(content, tokens);
        }
        // ── Normal text formatting ─────────────────────────────────────────────
        // Save a trailing '\' as pending — may be start of a math delimiter.
        if (content.endsWith('\\')) {
            this.state.pendingMathPrefix = '\\';
            content = content.slice(0, -1);
            if (!content)
                return tokens;
        }
        // Split on first \n to emit explicit newline tokens.
        const newlineIdx = content.indexOf('\n');
        if (newlineIdx !== -1) {
            const before = content.slice(0, newlineIdx);
            const after = content.slice(newlineIdx + 1);
            if (before) {
                tokens.push(...this.processTextContent(before));
            }
            this.emitNewline(tokens);
            this.state.newlineFlag = true;
            this.state.nextTitleFlag = 0;
            this.state.nextBoldText = false;
            if (after) {
                tokens.push(...this.processContent(after));
            }
            return tokens;
        }
        return this.processTextContent(content);
    }
    /**
     * Process complete content (for chat history / non-streaming).
     * Resets state, processes all lines, returns tokens.
     */
    processCompleteContent(content) {
        this.resetState();
        const tokens = [];
        const lines = content.split('\n');
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            // ── Code blocks ────────────────────────────────────────────────────
            if (line.trim().startsWith('```')) {
                const blockId = generateBlockId();
                tokens.push({ type: 'code_block_start', content: '', metadata: { codeBlockId: blockId } });
                const language = line.trim().substring(3).trim();
                if (language) {
                    tokens.push({
                        type: 'code_content',
                        content: '',
                        metadata: { codeBlockId: blockId, language },
                    });
                }
                i++;
                let codeContent = '';
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    if (codeContent)
                        codeContent += '\n';
                    codeContent += lines[i];
                    i++;
                }
                if (codeContent) {
                    tokens.push({ type: 'code_content', content: codeContent, metadata: { codeBlockId: blockId } });
                }
                tokens.push({ type: 'code_block_end', content: '', metadata: { codeBlockId: blockId } });
                i++;
                continue;
            }
            // ── Display math blocks ────────────────────────────────────────────
            {
                const displayDelim = line.includes('\\[')
                    ? { open: '\\[', close: '\\]', len: 2 }
                    : line.includes('$$')
                        ? { open: '$$', close: '$$', len: 2 }
                        : null;
                if (displayDelim) {
                    const openIdx = line.indexOf(displayDelim.open);
                    const beforeOpen = line.slice(0, openIdx);
                    if (beforeOpen.trim()) {
                        splitMarkdownTokens(beforeOpen)?.forEach(v => {
                            tokens.push(...this.processTextContent(v));
                        });
                    }
                    let mathContent = line.slice(openIdx + displayDelim.len);
                    let closeIdx = mathContent.indexOf(displayDelim.close);
                    if (closeIdx !== -1) {
                        tokens.push({
                            type: 'math_block',
                            content: mathContent.slice(0, closeIdx).trim(),
                            metadata: { displayMode: true },
                        });
                        this.state.skipNewlineCount = 1;
                        this.state.newlineFlag = true;
                        i++;
                        continue;
                    }
                    i++;
                    while (i < lines.length) {
                        const mathLine = lines[i];
                        closeIdx = mathLine.indexOf(displayDelim.close);
                        if (closeIdx !== -1) {
                            mathContent += '\n' + mathLine.slice(0, closeIdx);
                            break;
                        }
                        mathContent += '\n' + mathLine;
                        i++;
                    }
                    tokens.push({
                        type: 'math_block',
                        content: mathContent.trim(),
                        metadata: { displayMode: true },
                    });
                    this.state.skipNewlineCount = 1;
                    this.state.newlineFlag = true;
                    i++;
                    continue;
                }
            }
            // ── Table blocks ───────────────────────────────────────────────────
            if (isTableRow(line.trim())) {
                let tableRowCount = 0;
                while (i < lines.length && isTableRow(lines[i].trim())) {
                    const currentLine = lines[i].trim();
                    if (isTableSeparator(currentLine)) {
                        tokens.push({
                            type: 'table_row',
                            content: currentLine,
                            metadata: { isTableSeparator: true, tableCells: [] },
                        });
                    }
                    else {
                        const cells = parseTableRow(currentLine);
                        const isHeader = tableRowCount === 0;
                        tokens.push({
                            type: 'table_row',
                            content: currentLine,
                            metadata: { tableCells: cells, isTableHeader: isHeader, isTableSeparator: false },
                        });
                        tableRowCount++;
                    }
                    i++;
                }
                this.emitNewline(tokens);
                this.state.newlineFlag = true;
                this.state.nextTitleFlag = 0;
                this.state.nextBoldText = false;
                continue;
            }
            // ── Regular content ────────────────────────────────────────────────
            if (line || i < lines.length - 1) {
                this.processLineWithInlineMath(line, tokens);
                this.emitNewline(tokens);
                this.state.newlineFlag = true;
                this.state.nextTitleFlag = 0;
                this.state.nextBoldText = false;
            }
            i++;
        }
        return tokens;
    }
    /** Reset processor state for a new conversation / message. */
    reset() {
        this.resetState();
    }
    /** Get current processing state (for debugging). */
    getState() {
        return { ...this.state };
    }
    // ── Private helpers ──────────────────────────────────────────────────────
    resetState() {
        this.state = createInitialState();
    }
    /** Emit a newline token, respecting skipNewlineCount. */
    emitNewline(tokens) {
        if (this.state.skipNewlineCount > 0) {
            this.state.skipNewlineCount--;
        }
        else {
            tokens.push({ type: 'newline', content: '\n' });
        }
    }
    /** Process content inside a code block (language detection + content). */
    processCodeContent(content, tokens) {
        const aliases = this.languageAliases;
        const lang = this.state.codeLanguage;
        // Language detection: accumulate partial language tokens
        if (!lang || lang in aliases) {
            const trimmed = content.trim();
            if (trimmed in aliases) {
                // Partial language token — accumulate and wait
                this.state.codeLanguage = trimmed;
                return tokens;
            }
            else if (lang && lang in aliases) {
                // Previous partial resolved — replace with full name
                this.state.codeLanguage = aliases[lang];
            }
            else {
                this.state.codeLanguage = trimmed;
            }
            this.state.expectEmptyLine = true;
            tokens.push({
                type: 'code_content',
                content,
                metadata: {
                    codeBlockId: this.state.currentCodeBlockId,
                    language: this.state.codeLanguage,
                },
            });
            return tokens;
        }
        if (this.state.expectEmptyLine) {
            this.state.expectEmptyLine = false;
            return tokens;
        }
        tokens.push({
            type: 'code_content',
            content,
            metadata: { codeBlockId: this.state.currentCodeBlockId },
        });
        return tokens;
    }
    /** Buffer math content until closing delimiter is found. */
    processMathBuffer(content, tokens) {
        const closingDelim = this.state.mathClosingDelimiter;
        const combined = this.state.mathBuffer + content;
        const closingIdx = combined.indexOf(closingDelim);
        if (closingIdx === -1) {
            this.state.mathBuffer = combined;
            return tokens;
        }
        const mathContent = combined.slice(0, closingIdx);
        const isDisplay = this.state.isInMathBlock;
        tokens.push({
            type: isDisplay ? 'math_block' : 'math_inline',
            content: mathContent.trim(),
            metadata: { displayMode: isDisplay },
        });
        if (isDisplay) {
            this.state.skipNewlineCount = 1;
        }
        this.state.isInMathBlock = false;
        this.state.isInMathInline = false;
        this.state.mathBuffer = '';
        const remainder = combined.slice(closingIdx + closingDelim.length);
        this.state.mathClosingDelimiter = '';
        if (remainder) {
            tokens.push(...this.processContent(remainder));
        }
        return tokens;
    }
    /** Handle table row buffering and flushing. */
    processTableContent(content, tokens) {
        const newlineIdx = content.indexOf('\n');
        if (newlineIdx === -1) {
            this.state.tableRowBuffer += content;
            return tokens;
        }
        this.state.tableRowBuffer += content.slice(0, newlineIdx);
        const rowLine = this.state.tableRowBuffer.trim();
        this.state.tableRowBuffer = '';
        const remainder = content.slice(newlineIdx + 1);
        if (isTableRow(rowLine)) {
            if (isTableSeparator(rowLine)) {
                this.state.tableRowCount = 1;
                tokens.push({
                    type: 'table_row',
                    content: rowLine,
                    metadata: { isTableSeparator: true, tableCells: [] },
                });
            }
            else {
                const cells = parseTableRow(rowLine);
                const isHeader = this.state.tableRowCount === 0;
                this.state.tableRowCount++;
                tokens.push({
                    type: 'table_row',
                    content: rowLine,
                    metadata: { tableCells: cells, isTableHeader: isHeader, isTableSeparator: false },
                });
            }
            this.state.newlineFlag = true;
            this.state.nextTitleFlag = 0;
            this.state.nextBoldText = false;
        }
        else {
            this.state.isInTable = false;
            this.state.tableRowCount = 0;
            if (rowLine)
                tokens.push(...this.processTextContent(rowLine));
            this.emitNewline(tokens);
            this.state.newlineFlag = true;
            this.state.nextTitleFlag = 0;
            this.state.nextBoldText = false;
        }
        if (remainder) {
            tokens.push(...this.processContent(remainder));
        }
        return tokens;
    }
    /** Process a text chunk for inline formatting (bold, headers, backticks, etc.). */
    processTextContent(content) {
        const tokens = [];
        let processedContent = content;
        // Handle testNextWord: verify that the character after # is a space
        if (this.state.testNextWord) {
            this.state.testNextWord = false;
            if (!content.startsWith(' ')) {
                this.state.nextTitleFlag = 0;
            }
            else {
                processedContent = content.trim();
            }
        }
        const localTitleFlag = this.state.nextTitleFlag;
        let localBoldText = this.state.nextBoldText;
        let localBacktickedText = this.state.nextBacktickedText;
        // Handle backticks
        if (processedContent.includes('`')) {
            this.state.nextBacktickedText = !localBacktickedText;
            if (processedContent.trim().startsWith('`')) {
                localBacktickedText = !localBacktickedText;
            }
            processedContent = processedContent.replace('`', '');
        }
        // Handle special formatting (only outside backticks)
        if (!localBacktickedText) {
            if (processedContent.includes('---')) {
                this.state.skipNewlineCount = 1;
                tokens.push({ type: 'horizontal_rule', content: '' });
                return tokens;
            }
            if (processedContent.includes('-') && this.state.newlineFlag) {
                tokens.push({ type: 'list_item', content: '' });
                return tokens;
            }
            if (processedContent.startsWith('#')) {
                this.state.nextTitleFlag = Math.min(Math.max(processedContent.split('').length, 1), 3);
                this.state.testNextWord = true;
                return tokens;
            }
            if (processedContent.includes('**')) {
                this.state.nextBoldText = !localBoldText;
                if (!this.state.nextBoldText && processedContent.startsWith('**')) {
                    localBoldText = false;
                }
                processedContent = processedContent.replace('**', '');
            }
        }
        // Any text content clears the start-of-line flag
        this.state.newlineFlag = false;
        if (processedContent) {
            tokens.push({
                type: 'text',
                content: processedContent,
                metadata: {
                    titleLevel: localTitleFlag,
                    isBold: localTitleFlag > 0 || localBoldText,
                    isBackticked: localBacktickedText,
                },
            });
        }
        return tokens;
    }
    /** Process a line that may contain inline math \(…\) mixed with text. */
    processLineWithInlineMath(line, tokens) {
        let remaining = line;
        while (remaining) {
            const inlineIdx = remaining.indexOf('\\(');
            if (inlineIdx === -1) {
                splitMarkdownTokens(remaining)?.forEach(v => {
                    tokens.push(...this.processTextContent(v));
                });
                break;
            }
            if (inlineIdx > 0) {
                const before = remaining.slice(0, inlineIdx);
                splitMarkdownTokens(before)?.forEach(v => {
                    tokens.push(...this.processTextContent(v));
                });
            }
            const closeIdx = remaining.indexOf('\\)', inlineIdx + 2);
            if (closeIdx === -1) {
                splitMarkdownTokens(remaining.slice(inlineIdx))?.forEach(v => {
                    tokens.push(...this.processTextContent(v));
                });
                break;
            }
            const mathContent = remaining.slice(inlineIdx + 2, closeIdx);
            tokens.push({
                type: 'math_inline',
                content: mathContent.trim(),
                metadata: { displayMode: false },
            });
            remaining = remaining.slice(closeIdx + 2);
        }
    }
}
//# sourceMappingURL=ContentProcessor.js.map