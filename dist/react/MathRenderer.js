import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
/**
 * Renders a LaTeX math expression using KaTeX.
 * - displayMode=true  → centered block equation
 * - displayMode=false → inline equation
 */
export const MathRenderer = ({ math, displayMode }) => {
    const html = useMemo(() => {
        try {
            return katex.renderToString(math, {
                displayMode,
                throwOnError: false,
                trust: true,
            });
        }
        catch {
            return null;
        }
    }, [math, displayMode]);
    if (!html) {
        return (_jsx("span", { className: "font-mono text-amber-200", children: displayMode ? `\\[${math}\\]` : `\\(${math}\\)` }));
    }
    if (displayMode) {
        return (_jsx("div", { className: "my-3 overflow-x-auto", dangerouslySetInnerHTML: { __html: html } }));
    }
    return _jsx("span", { dangerouslySetInnerHTML: { __html: html } });
};
//# sourceMappingURL=MathRenderer.js.map