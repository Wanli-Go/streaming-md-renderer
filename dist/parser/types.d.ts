/**
 * A token emitted by the ContentProcessor.
 *
 * The streaming parser converts raw text chunks into a sequence of typed tokens.
 * Each token carries its content and optional metadata that informs rendering
 * (e.g., heading level, bold, code language, table cells, math display mode).
 */
export interface ContentToken {
    type: 'text' | 'code_block_start' | 'code_block_end' | 'code_content' | 'horizontal_rule' | 'list_item' | 'table_row' | 'newline' | 'math_block' | 'math_inline';
    content: string;
    metadata?: {
        /** Code block language identifier */
        language?: string;
        /** Unique ID for a code block session */
        codeBlockId?: string;
        /** Heading level: 1 = h1, 2 = h2, 3 = h3 */
        titleLevel?: number;
        /** Text is bold (**bold**) */
        isBold?: boolean;
        /** Text is inside backticks (`code`) */
        isBackticked?: boolean;
        /** true for display math (\[…\] or $$…$$), false for inline (\(…\)) */
        displayMode?: boolean;
        /** Parsed table cell strings for a table_row token */
        tableCells?: string[];
        /** Whether this table row is the header row */
        isTableHeader?: boolean;
        /** Whether this is a separator row (|---|---|) */
        isTableSeparator?: boolean;
    };
}
/**
 * Internal state of the ContentProcessor.
 * Exposed via `getState()` for debugging purposes.
 */
export interface ProcessingState {
    nextTitleFlag: number;
    nextBoldText: boolean;
    nextBacktickedText: boolean;
    newlineFlag: boolean;
    testNextWord: boolean;
    isInCodeBlock: boolean;
    currentCodeBlockId?: string;
    expectEmptyLine: boolean;
    codeLanguage?: string;
    isInTable: boolean;
    tableRowCount: number;
    tableRowBuffer: string;
    skipNewlineCount: number;
    isInMathBlock: boolean;
    isInMathInline: boolean;
    mathBuffer: string;
    mathClosingDelimiter: string;
    pendingMathPrefix: string;
}
/**
 * Optional configuration for the ContentProcessor.
 */
export interface ContentProcessorOptions {
    /**
     * Map of partial language tokens to their full language name.
     * During streaming the language identifier may arrive in fragments;
     * this map lets you accumulate partial tokens and resolve them.
     *
     * Example: `{ types: 'typescript', k: 'kotlin', kot: 'kotlin' }`
     *
     * Keys are the partial/short names, values are the resolved language.
     * When a partial key is received and the next chunk extends it to another
     * partial key, the processor continues accumulating. When the next chunk
     * doesn't match any prefix, the current accumulated value is resolved.
     */
    languageAliases?: Record<string, string>;
}
//# sourceMappingURL=types.d.ts.map