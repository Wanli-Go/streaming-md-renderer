import React from 'react';
import 'katex/dist/katex.min.css';
export interface MathRendererProps {
    math: string;
    displayMode: boolean;
}
/**
 * Renders a LaTeX math expression using KaTeX.
 * - displayMode=true  → centered block equation
 * - displayMode=false → inline equation
 */
export declare const MathRenderer: React.FC<MathRendererProps>;
//# sourceMappingURL=MathRenderer.d.ts.map