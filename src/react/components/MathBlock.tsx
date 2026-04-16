import React, { useMemo } from 'react';
import classNames from 'classnames';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface MathBlockProps {
  math: string;
  displayMode: boolean;
  /** If true, skip fade-in animation on the math element */
  reduceMotion?: boolean;
}

/**
 * Renders a LaTeX math expression using KaTeX.
 * - displayMode=true  → centered block equation
 * - displayMode=false → inline equation
 */
export const MathBlock: React.FC<MathBlockProps> = ({ math, displayMode, reduceMotion = false }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: true,
        trust: true,
        output: 'mathml'
      });
    } catch {
      return null;
    }
  }, [math, displayMode]);

  if (!html) {
    return (
      <span className={classNames('smd-math-fallback', { 'fade-in': !reduceMotion })}>
        {displayMode ? `\\[${math}\\]` : `\\(${math}\\)`}
      </span>
    );
  }

  if (displayMode) {
    return (
      <div
        className={classNames('smd-math-block', { 'smd-math-block-enter': !reduceMotion })}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <span className={classNames('smd-math-inline', { 'fade-in': !reduceMotion })} dangerouslySetInnerHTML={{ __html: html }} />;
};
