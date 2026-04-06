import React, { useRef, useEffect } from "react";
import Prism from "prismjs";
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
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  text,
  language,
  syslang = 'en',
  onCopy
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
    <div className="relative">
      <div className="z-10 h-10 bg-[#1a1a1a] w-full absolute top-0 left-0 rounded-t-md flex items-center">
        <span className="ps-5 text-sm text-gray-400">
          {language || 'text'}
        </span>
      </div>
      <div className="sticky top-10 z-10">
        <div className="absolute end-0 top-0 flex h-10 items-center pe-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="text-sm bg-[#1a1a1a] rounded-sm cursor-pointer font-bold p-[5px_8px] border-[1px] border-[transparent] transition-all hover:border-[#646cff]"
          >
            {syslang === 'zh' ? '复制' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className={`language-${language || 'text'} rounded-lg my-4 relative !overflow-auto !pl-0 !pr-0 !pb-0 !pt-10`}>
        <div className="pt-4"></div>
        <code
          ref={codeRef}
          className={`${text.length ? '' : 'pb-6'} language-${language || 'text'} w-full block overflow-visible pl-4 pr-4`}
        ></code>
        <div className="overflow-hidden">
          <div className={`pl-4 pr-4 ${text.length ? 'pb-6' : ''}`}>{text}</div>
        </div>
      </pre>
    </div>
  );
};

export default CodeBlock;
