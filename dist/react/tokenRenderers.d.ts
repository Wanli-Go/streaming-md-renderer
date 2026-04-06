/**
 * Shared token-to-element rendering logic.
 *
 * Provides pure functions that convert ContentTokens into React elements.
 * Used by both streaming and history renderers.
 */
import React from 'react';
import { ContentToken } from '../parser/types';
export interface TableRowData {
    cells: string[];
    isHeader: boolean;
}
export interface RenderedElement {
    id: string;
    element: React.ReactNode;
    type: 'text' | 'code_block' | 'other' | 'table';
    codeBlockId?: string;
    /** For live table accumulation during streaming */
    tableRows?: TableRowData[];
}
/**
 * Render inline markdown within a table cell string.
 * Handles **bold**, *italic*, and `code` markers.
 */
export declare const renderCellContent: (text: string, keyPrefix: string) => React.ReactNode;
/**
 * Build a <table> React element from accumulated row data.
 */
export declare const buildTableElement: (id: string, rows: TableRowData[]) => React.ReactNode;
export interface SimpleRenderResult {
    element: React.ReactNode;
    type: RenderedElement['type'];
}
/**
 * Render a token that doesn't require code-block or table-accumulation context.
 * Returns null for token types that need special handling by the caller
 * (code_block_start, code_block_end, code_content, table_row).
 *
 * @param reduceMotion - if true, skip fade-in animation on text tokens
 */
export declare function renderSimpleToken(token: ContentToken, elementId: string, reduceMotion?: boolean): SimpleRenderResult | null;
//# sourceMappingURL=tokenRenderers.d.ts.map