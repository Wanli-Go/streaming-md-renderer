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
import { ContentToken, ProcessingState, ContentProcessorOptions } from './types';
export declare class ContentProcessor {
    private state;
    private readonly languageAliases;
    constructor(options?: ContentProcessorOptions);
    /**
     * Process a single streaming chunk and return tokens.
     * Call this once per chunk from the SSE/streaming response.
     */
    processContent(content: string): ContentToken[];
    /**
     * Process complete content (for chat history / non-streaming).
     * Resets state, processes all lines, returns tokens.
     */
    processCompleteContent(content: string): ContentToken[];
    /** Reset processor state for a new conversation / message. */
    reset(): void;
    /** Get current processing state (for debugging). */
    getState(): ProcessingState;
    private resetState;
    /** Emit a newline token, respecting skipNewlineCount. */
    private emitNewline;
    /** Process content inside a code block (language detection + content). */
    private processCodeContent;
    /** Buffer math content until closing delimiter is found. */
    private processMathBuffer;
    /** Handle table row buffering and flushing. */
    private processTableContent;
    /** Process a text chunk for inline formatting (bold, headers, backticks, etc.). */
    private processTextContent;
    /** Process a line that may contain inline math \(…\) mixed with text. */
    private processLineWithInlineMath;
}
//# sourceMappingURL=ContentProcessor.d.ts.map