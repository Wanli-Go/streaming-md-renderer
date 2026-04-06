import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ContentProcessor } from '../parser/ContentProcessor';
import { ContentToken } from '../parser/types';
import {
  renderSimpleToken,
  RenderedElement,
  TableRowData,
  buildTableElement,
} from './tokenRenderers';
import { useUnifiedCodeBlockManager } from './useUnifiedCodeBlockManager';
import CodeBlock from './CodeBlock';

export interface UseStreamingMarkdownOptions {
  reduceMotion?: boolean;
  language?: 'en' | 'zh';
  /** 'streaming' enables real-time animation. 'static' is for completed content (chat history). */
  mode?: 'streaming' | 'static';
}

export interface UseStreamingMarkdownReturn {
  rendered: React.ReactNode[];
  appendChunk: (chunk: string, isThinking?: boolean) => void;
  reset: () => void;
  getRawContent: () => string;
  isEmpty: boolean;
}

/**
 * High-level hook for easy real-time markdown streaming.
 * Handles token processing, code blocks, tables, and rendering automatically.
 */
export const useStreamingMarkdown = (
  options: UseStreamingMarkdownOptions = {}
): UseStreamingMarkdownReturn => {
  const { language = 'en', reduceMotion = false, mode = 'streaming' } = options;
  const managerMode = mode === 'static' ? 'static' : 'streaming';

  const processor = useRef(new ContentProcessor());
  const codeBlockManager = useUnifiedCodeBlockManager({ mode: managerMode as any, reduceMotion });

  const [renderedContent, setRenderedContent] = useState<RenderedElement[]>([]);
  const contentBuffer = useRef<string>('');

  const reset = useCallback(() => {
    processor.current.reset();
    codeBlockManager.clearAllCodeBlocks();
    setRenderedContent([]);
    contentBuffer.current = '';
  }, [codeBlockManager]);

  const appendChunk = useCallback((chunk: string, isThinking = false) => {
    if (!chunk) return;

    contentBuffer.current += chunk;

    const tokens = processor.current.processContent(chunk);

    setRenderedContent(prev => {
      let newContent = [...prev];
      let keyCounter = Date.now();

      tokens.forEach((token: ContentToken) => {
        const elementId = `md-${keyCounter++}`;

        const simple = renderSimpleToken(token, elementId, reduceMotion);
        if (simple) {
          newContent.push({
            id: elementId,
            element: simple.element,
            type: simple.type,
          });
          return;
        }

        // Handle code blocks
        if (token.type === 'code_block_start' && token.metadata?.codeBlockId) {
          codeBlockManager.createCodeBlock(token.metadata.codeBlockId);

          const placeholder = <div key={elementId} />;

          newContent.push({
            id: elementId,
            element: placeholder,
            type: 'code_block',
            codeBlockId: token.metadata.codeBlockId,
          });
        } 
        else if (token.type === 'code_content' && token.metadata?.codeBlockId) {
          if (token.metadata.language) {
            codeBlockManager.setCodeBlockLanguage(token.metadata.codeBlockId, token.metadata.language);
          } else if (token.content) {
            codeBlockManager.appendToCodeBlock(
              token.metadata.codeBlockId, 
              token.content, 
              reduceMotion
            );
          }
        } 
        else if (token.type === 'code_block_end' && token.metadata?.codeBlockId) {
          codeBlockManager.completeCodeBlock(token.metadata.codeBlockId);
        } 
        else if (token.type === 'table_row' && !token.metadata?.isTableSeparator) {
          const newRow: TableRowData = {
            cells: token.metadata?.tableCells ?? [],
            isHeader: token.metadata?.isTableHeader ?? false,
          };

          const last = newContent[newContent.length - 1];
          if (last && last.type === 'table') {
            const updatedRows = [...(last.tableRows ?? []), newRow];
            last.tableRows = updatedRows;
            last.element = buildTableElement(last.id, updatedRows);
          } else {
            const rows = [newRow];
            newContent.push({
              id: elementId,
              element: buildTableElement(elementId, rows),
              type: 'table',
              tableRows: rows,
            });
          }
        }
      });

      return newContent;
    });
  }, [codeBlockManager, reduceMotion]);

  // Update code blocks live
  useEffect(() => {
    setRenderedContent(prev => 
      prev.map(item => {
        if (item.type === 'code_block' && item.codeBlockId) {
          const block = codeBlockManager.getCodeBlock(item.codeBlockId);
          if (block) {
            return {
              ...item,
              element: (
                <CodeBlock
                  key={item.id}
                  code={block.lines}
                  text={block.text || []}
                  language={block.language || ''}
                  syslang={language}
                />
              )
            };
          }
        }
        return item;
      })
    );
  }, [codeBlockManager.codeBlocks]);

  const getRawContent = useCallback(() => contentBuffer.current, []);
  const isEmpty = renderedContent.length === 0 && contentBuffer.current.length === 0;

  return {
    rendered: renderedContent.map(item => item.element),
    appendChunk,
    reset,
    getRawContent,
    isEmpty,
  };
};
