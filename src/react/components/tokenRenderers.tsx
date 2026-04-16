/**
 * Shared token-to-element rendering logic.
 *
 * Provides pure functions that convert ContentTokens into React elements.
 * Used by both streaming and history renderers.
 */
import React from 'react';
import classNames from 'classnames';
import { ContentToken } from '../../parser/types';
import { MathBlock } from './MathBlock';

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
      return <code key={`${keyPrefix}-${i}`} className="smd-inline-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

/**
 * Build a <table> React element from accumulated row data.
 *
 * @param reduceMotion - if true, skip fade-in animation on table rows
 */
export const buildTableElement = (id: string, rows: TableRowData[], reduceMotion?: boolean): React.ReactNode => {
  const headerRows = rows.filter(r => r.isHeader);
  const bodyRows = rows.filter(r => !r.isHeader);
  return (
    <table key={id} className="smd-table">
      {headerRows.length > 0 && (
        <thead>
          {headerRows.map((row, ri) => (
            <tr key={`${id}-h${ri}`} className={classNames('smd-thead-row', { 'fade-in': !reduceMotion })}>
              {row.cells.map((cell, ci) => (
                <th
                  key={`${id}-h${ri}-c${ci}`}
                  className="smd-th"
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
            <tr key={`${id}-b${ri}`} className={classNames('smd-tbody-row', { 'fade-in': !reduceMotion })}>
              {row.cells.map((cell, ci) => (
                <td
                  key={`${id}-b${ri}-c${ci}`}
                  className="smd-td"
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
              'smd-text-h3': token.metadata?.titleLevel === 3,
              'smd-text-h2': token.metadata?.titleLevel === 2,
              'smd-text-h1': token.metadata?.titleLevel === 1,
              'smd-text-bold': token.metadata?.isBold,
              'smd-text-code': token.metadata?.isBackticked,
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
          <hr key={elementId} className="smd-hr" />
        ),
        type: 'other',
      };

    case 'list_item':
      return {
        element: (
          <span
            key={elementId}
            className="pi pi-angle-right smd-list-marker"
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
          <MathBlock
            key={elementId}
            math={token.content}
            displayMode={isDisplay}
            reduceMotion={reduceMotion}
          />
        ),
        type: 'other',
      };
    }

    default:
      return null;
  }
}
