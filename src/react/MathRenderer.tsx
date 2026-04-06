import React, { useMemo } from 'react';
import katex from 'katex';

export interface MathRendererProps {
  math: string;
  displayMode: boolean;
}

/**
 * Renders a LaTeX math expression using KaTeX.
 * - displayMode=true  → centered block equation
 * - displayMode=false → inline equation
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ math, displayMode }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return null;
    }
  }, [math, displayMode]);

  if (!html) {
    return (
      <span className="font-mono text-amber-200">
        {displayMode ? `\\[${math}\\]` : `\\(${math}\\)`}
      </span>
    );
  }

  if (displayMode) {
    return (
      <div
        className="my-3 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};
