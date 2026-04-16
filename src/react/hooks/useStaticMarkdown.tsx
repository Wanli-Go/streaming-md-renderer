import { useMemo, useRef, useEffect } from 'react';
import { ContentProcessor } from '../../parser/ContentProcessor';
import { ContentToken } from '../../parser/types';
import {
  renderSimpleToken,
  RenderedElement,
  TableRowData,
  buildTableElement,
} from '../components/tokenRenderers';
import { useUnifiedCodeBlockManager } from './useUnifiedCodeBlockManager';
import CodeBlock from '../components/CodeBlock';

export interface UseStaticMarkdownOptions {
  reduceMotion?: boolean;
  language?: 'en' | 'zh';
}

export interface UseStaticMarkdownReturn {
  rendered: React.ReactNode[];
  isEmpty: boolean;
}

/**
 * Hook for rendering complete/static markdown content (non-streaming).
 * Use this for chat history or pre-rendered content.
 */
export const useStaticMarkdown = (
  content: string,
  options: UseStaticMarkdownOptions = {}
): UseStaticMarkdownReturn => {
  const { language = 'en', reduceMotion = false } = options;
  const codeBlockManager = useUnifiedCodeBlockManager({ mode: 'static', reduceMotion });

  const processor = useRef(new ContentProcessor());
  const lastContent = useRef<string>('');

  const {
    createCodeBlock,
    setCodeBlockLanguage,
    appendToCodeBlock,
    completeCodeBlock,
    getCodeBlock,
    clearAllCodeBlocks,
  } = codeBlockManager;

  useEffect(() => {
    if (lastContent.current !== content) {
      processor.current.reset();
      clearAllCodeBlocks();
      lastContent.current = content;
    }
  }, [content, clearAllCodeBlocks]);

  const renderedContent = useMemo(() => {
    if (!content) return [];

    const tokens = processor.current.processCompleteContent(content);
    const elements: RenderedElement[] = [];
    let keyCounter = 0;

    tokens.forEach((token: ContentToken) => {
      const elementId = `md-${keyCounter++}`;

      const simple = renderSimpleToken(token, elementId, reduceMotion);
      if (simple) {
        elements.push({
          id: elementId,
          element: simple.element,
          type: simple.type,
        });
        return;
      }

      // Handle code blocks
      if (token.type === 'code_block_start' && token.metadata?.codeBlockId) {
        createCodeBlock(token.metadata.codeBlockId);
        elements.push({
          id: elementId,
          element: null,
          type: 'code_block',
          codeBlockId: token.metadata.codeBlockId,
        });
      } else if (token.type === 'code_content' && token.metadata?.codeBlockId) {
        if (token.metadata.language) {
          setCodeBlockLanguage(token.metadata.codeBlockId, token.metadata.language);
        } else if (token.content) {
          appendToCodeBlock(token.metadata.codeBlockId, token.content, reduceMotion);
        }
      } else if (token.type === 'code_block_end' && token.metadata?.codeBlockId) {
        completeCodeBlock(token.metadata.codeBlockId);
      } else if (token.type === 'table_row' && !token.metadata?.isTableSeparator) {
        const newRow: TableRowData = {
          cells: token.metadata?.tableCells ?? [],
          isHeader: token.metadata?.isTableHeader ?? false,
        };

        const last = elements[elements.length - 1];
        if (last && last.type === 'table') {
          const updatedRows = [...(last.tableRows ?? []), newRow];
          last.tableRows = updatedRows;
          last.element = buildTableElement(last.id, updatedRows, reduceMotion);
        } else {
          const rows = [newRow];
          elements.push({
            id: elementId,
            element: buildTableElement(elementId, rows, reduceMotion),
            type: 'table',
            tableRows: rows,
          });
        }
      }
    });

    // Resolve code block placeholders
    return elements.map(item => {
      if (item.type === 'code_block' && item.codeBlockId) {
        const block = getCodeBlock(item.codeBlockId);
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
                reduceMotion={reduceMotion}
              />
            ),
          };
        }
      }
      return item;
    });
  }, [content, createCodeBlock, setCodeBlockLanguage, appendToCodeBlock, completeCodeBlock, getCodeBlock, reduceMotion, language]);

  const isEmpty = renderedContent.length === 0;

  return {
    rendered: renderedContent.map(item => item.element),
    isEmpty,
  };
};
