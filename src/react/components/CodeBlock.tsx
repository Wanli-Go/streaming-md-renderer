import React, { useRef, useEffect } from "react";
import classNames from "classnames";
// Import Prism via setup module that ensures globalThis.Prism is set
// BEFORE the language component side-effect imports run.
import { Prism } from "../util/prismSetup";
import "prismjs/themes/prism-okaidia.css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-css";

export interface CodeBlockProps {
  code: string;
  text: React.ReactNode[];
  language: string;
  syslang?: string;
  onCopy?: () => void;
  /** If true, skip fade-in animation on the code block */
  reduceMotion?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  text,
  language,
  syslang = 'en',
  onCopy,
  reduceMotion = false,
}) => {
  const codeRef = useRef<HTMLElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      onCopy?.();
    }).catch(err => console.error('Failed to copy:', err));
  };

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.textContent = code;
      Prism.highlightElement(codeRef.current);
    }
  }, [code]);

  return (
    <div className={classNames('smd-code-wrapper', { 'fade-in': !reduceMotion })}>
      <div className="smd-code-header">
        <span className="smd-code-lang">
          {language || 'text'}
        </span>
      </div>
      <div className="smd-code-copy-sticky">
        <div className="smd-code-copy-area">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="smd-code-copy-btn"
          >
            {syslang === 'zh' ? '复制' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className={`language-${language || 'text'} smd-code-pre`}>
        <div className="smd-code-spacer"></div>
        <code
          ref={codeRef}
          className={`${text.length ? '' : 'smd-code-element--empty'} language-${language || 'text'} smd-code-element`}
        ></code>
        <div className="smd-code-text-wrapper">
          <div className={`smd-code-text ${text.length ? 'smd-code-text--has-content' : ''}`}>{text}</div>
        </div>
      </pre>
    </div>
  );
};

export default CodeBlock;
