import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import classNames from 'classnames';
import { MathRenderer } from './MathRenderer';
// ── Table helpers ────────────────────────────────────────────────────────────
/**
 * Render inline markdown within a table cell string.
 * Handles **bold**, *italic*, and `code` markers.
 */
export const renderCellContent = (text, keyPrefix) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return _jsx("strong", { children: part.slice(2, -2) }, `${keyPrefix}-${i}`);
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            return _jsx("em", { children: part.slice(1, -1) }, `${keyPrefix}-${i}`);
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return _jsx("code", { className: "font-mono text-amber-100", children: part.slice(1, -1) }, `${keyPrefix}-${i}`);
        }
        return part;
    });
};
/**
 * Build a <table> React element from accumulated row data.
 */
export const buildTableElement = (id, rows) => {
    const headerRows = rows.filter(r => r.isHeader);
    const bodyRows = rows.filter(r => !r.isHeader);
    return (_jsxs("table", { className: "border-collapse w-full my-3 text-sm", children: [headerRows.length > 0 && (_jsx("thead", { children: headerRows.map((row, ri) => (_jsx("tr", { className: "border-b border-white/20 fade-in", children: row.cells.map((cell, ci) => (_jsx("th", { className: "px-3 py-1.5 text-left font-semibold bg-white/20 border border-white/10", children: renderCellContent(cell, `${id}-h${ri}-c${ci}`) }, `${id}-h${ri}-c${ci}`))) }, `${id}-h${ri}`))) })), bodyRows.length > 0 && (_jsx("tbody", { children: bodyRows.map((row, ri) => (_jsx("tr", { className: "border-b border-white/10 even:bg-white/[0.03] fade-in", children: row.cells.map((cell, ci) => (_jsx("td", { className: "px-3 py-1.5 border border-white/10", children: renderCellContent(cell, `${id}-b${ri}-c${ci}`) }, `${id}-b${ri}-c${ci}`))) }, `${id}-b${ri}`))) }))] }, id));
};
/**
 * Render a token that doesn't require code-block or table-accumulation context.
 * Returns null for token types that need special handling by the caller
 * (code_block_start, code_block_end, code_content, table_row).
 *
 * @param reduceMotion - if true, skip fade-in animation on text tokens
 */
export function renderSimpleToken(token, elementId, reduceMotion) {
    switch (token.type) {
        case 'text':
            return {
                element: (_jsx("span", { className: classNames({
                        'fade-in': !reduceMotion,
                        'text-xl': token.metadata?.titleLevel === 3,
                        'text-2xl': token.metadata?.titleLevel === 2,
                        'text-3xl': token.metadata?.titleLevel === 1,
                        'font-bold': token.metadata?.isBold,
                        'font-mono': token.metadata?.isBackticked,
                        'text-amber-100': token.metadata?.isBackticked,
                    }), children: token.content }, elementId)),
                type: 'text',
            };
        case 'horizontal_rule':
            return {
                element: (_jsx("hr", { className: "opacity-60 h-0.5 bg-gray-100 rounded-2xl mr-5 mt-2 mb-2" }, elementId)),
                type: 'other',
            };
        case 'list_item':
            return {
                element: (_jsx("span", { className: "pi pi-angle-right !text-xs", style: { lineHeight: '24px' } }, elementId)),
                type: 'other',
            };
        case 'newline':
            return {
                element: _jsx("span", { children: '\n' }, elementId),
                type: 'other',
            };
        case 'math_block':
        case 'math_inline': {
            const isDisplay = token.type === 'math_block';
            return {
                element: (_jsx(MathRenderer, { math: token.content, displayMode: isDisplay }, elementId)),
                type: 'other',
            };
        }
        default:
            return null;
    }
}
//# sourceMappingURL=tokenRenderers.js.map