/**
 * Shared token-to-element rendering logic.
 *
 * Provides pure functions that convert ContentTokens into React elements.
 * Used by both streaming and history renderers.
 */
import React from 'react';
import classNames from 'classnames';
import { ContentToken } from '../parser/types';
import { MathRenderer } from './MathRenderer';

// ── Shared types ─────────────────────────────────────────────────────────────

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

// ── Table helpers ────────────────────────────────────────────────────────────

/**
 * Render inline markdown within a table cell string.
 * Handles **bold**, *italic*, and `code` markers.
 */
export const renderCellContent = (text: string, keyPrefix: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${keyPrefix}-${i}`} className="font-mono text-amber-100">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

/**
 * Build a <table> React element from accumulated row data.
 */
export const buildTableElement = (id: string, rows: TableRowData[]): React.ReactNode => {
  const headerRows = rows.filter(r => r.isHeader);
  const bodyRows = rows.filter(r => !r.isHeader);
  return (
    <table key={id} className="border-collapse w-full my-3 text-sm">
      {headerRows.length > 0 && (
        <thead>
          {headerRows.map((row, ri) => (
            <tr key={`${id}-h${ri}`} className="border-b border-white/20 fade-in">
              {row.cells.map((cell, ci) => (
                <th
                  key={`${id}-h${ri}-c${ci}`}
                  className="px-3 py-1.5 text-left font-semibold bg-white/20 border border-white/10"
                >
                  {renderCellContent(cell, `${id}-h${ri}-c${ci}`)}
                </th>
              ))}
            </tr>
          ))}
        </thead>
      )}
      {bodyRows.length > 0 && (
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={`${id}-b${ri}`} className="border-b border-white/10 even:bg-white/[0.03] fade-in">
              {row.cells.map((cell, ci) => (
                <td
                  key={`${id}-b${ri}-c${ci}`}
                  className="px-3 py-1.5 border border-white/10"
                >
                  {renderCellContent(cell, `${id}-b${ri}-c${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      )}
    </table>
  );
};

// ── Simple token renderer ────────────────────────────────────────────────────

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
export function renderSimpleToken(
  token: ContentToken,
  elementId: string,
  reduceMotion?: boolean,
): SimpleRenderResult | null {
  switch (token.type) {
    case 'text':
      return {
        element: (
          <span
            className={classNames({
              'fade-in': !reduceMotion,
              'text-xl': token.metadata?.titleLevel === 3,
              'text-2xl': token.metadata?.titleLevel === 2,
              'text-3xl': token.metadata?.titleLevel === 1,
              'font-bold': token.metadata?.isBold,
              'font-mono': token.metadata?.isBackticked,
              'text-amber-100': token.metadata?.isBackticked,
            })}
            key={elementId}
          >
            {token.content}
          </span>
        ),
        type: 'text',
      };

    case 'horizontal_rule':
      return {
        element: (
          <hr key={elementId} className="opacity-60 h-0.5 bg-gray-100 rounded-2xl mr-5 mt-2 mb-2" />
        ),
        type: 'other',
      };

    case 'list_item':
      return {
        element: (
          <span
            key={elementId}
            className="pi pi-angle-right !text-xs"
            style={{ lineHeight: '24px' }}
          />
        ),
        type: 'other',
      };

    case 'newline':
      return {
        element: <span key={elementId}>{'\n'}</span>,
        type: 'other',
      };

    case 'math_block':
    case 'math_inline': {
      const isDisplay = token.type === 'math_block';
      return {
        element: (
          <MathRenderer
            key={elementId}
            math={token.content}
            displayMode={isDisplay}
          />
        ),
        type: 'other',
      };
    }

    default:
      return null;
  }
}
