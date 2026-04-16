import { useCallback, useRef, useState, createElement, useMemo } from "react";
import classNames from "classnames";

export interface CodeBlockData {
  id: string;
  language: string;
  lines: string; // Completed code for Prism highlighting
  text: React.ReactNode[]; // Streaming animation spans (empty in history mode)
  isComplete: boolean;
}

export interface StreamingTextItem {
  key: string;
  content: string;
  fadeIn: boolean;
}

export interface UseCodeBlockManagerOptions {
  /** "streaming" enables real-time animation with flushSync. "history" is simple/sync. */
  /** 'streaming' enables real-time animation. 'static' is for completed content (chat history). */
  mode?: 'streaming' | 'static';
  /** Whether to reduce motion/animations (used in streaming) */
  reduceMotion?: boolean;
}

export interface UseUnifiedCodeBlockManagerReturn {
  codeBlocks: Record<string, CodeBlockData>;
  createCodeBlock: (id: string) => void;
  setCodeBlockLanguage: (id: string, language: string) => void;
  appendToCodeBlock: (id: string, content: string, reduceMotion?: boolean) => void;
  completeCodeBlock: (id: string) => void;
  getCodeBlock: (id: string) => CodeBlockData | undefined;
  clearAllCodeBlocks: () => void;
  /** For history mode: gets fully built code blocks from tokens for static rendering */
  getCodeBlocksFromTokens: (tokens: any[]) => Map<string, { language: string; content: string }>;
}

/**
 * Unified code block manager for both streaming (with per-character animation)
 * and static history rendering.
 * 
 * Replaces both useCodeBlockManager and useHistoryCodeBlockManager.
 * Maintains exact same behavior and APIs for backward compatibility.
 */
export const useUnifiedCodeBlockManager = (
  options: UseCodeBlockManagerOptions = {}
): UseUnifiedCodeBlockManagerReturn => {
  const { mode = 'streaming', reduceMotion = false } = options;
  
  const [codeBlocks, setCodeBlocks] = useState<Record<string, CodeBlockData>>({}); 
  const codeBlocksRef = useRef(codeBlocks);
  const buffers = useRef<Record<string, any>>({});
  const animationIdRef = useRef(0);

  // Keep ref in sync
  codeBlocksRef.current = codeBlocks;

  const isStreaming = mode === 'streaming';

  const setCodeBlockLanguage = useCallback((id: string, language: string) => {
    const buffer = buffers.current[id];
    if (!buffer) return;

    buffer.language = language;

    setCodeBlocks(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        language
      }
    }));
  }, []);

  const createCodeBlock = useCallback((id: string) => {
    buffers.current[id] = {
      id,
      buffer: '',
      textBuffer: [],
      isActive: true,
      language: '',
    };

    setCodeBlocks(prev => ({
      ...prev,
      [id]: {
        id,
        language: '',
        lines: '',
        text: [],
        isComplete: false
      }
    }));
  }, []);

  const appendToCodeBlock = useCallback((id: string, content: string, animReduceMotion?: boolean) => {
    const buffer = buffers.current[id];
    if (!buffer || !buffer.isActive) return;

    const effectiveReduceMotion = animReduceMotion ?? reduceMotion;

    buffer.buffer += content;

    if (isStreaming) {
      // Create animated span for streaming
      const spanElement = createElement(
        'span',
        {
          key: (animationIdRef.current++).toString(),
          className: classNames({ "fade-in": !effectiveReduceMotion })
        },
        content
      );
      buffer.textBuffer.push(spanElement);

      if (content.includes('\n')) {
        const completedChunk = buffer.buffer;

        buffer.buffer = '';
        buffer.textBuffer = [];

        setCodeBlocks(prev => ({
            ...prev,
            [id]: {
              ...prev[id],
              lines: prev[id].lines + completedChunk,
              text: [] 
            }
          }));
        return;
      }

      setCodeBlocks(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          text: [...buffer.textBuffer]
        }
      }));
    } else {
      // History/static mode: just accumulate lines synchronously
      setCodeBlocks(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          lines: prev[id].lines + content
        }
      }));
    }
  }, [isStreaming, reduceMotion]);

  const completeCodeBlock = useCallback((id: string) => {
    const buffer = buffers.current[id];
    if (!buffer) return;

    if (isStreaming) {
      setCodeBlocks(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          lines: prev[id].lines + buffer.buffer,
          text: [],
          isComplete: true
        }
      }));
    } else {
      setCodeBlocks(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          isComplete: true
        }
      }));
    }

    buffer.isActive = false;
    delete buffers.current[id];
  }, [isStreaming]);

  const getCodeBlock = useCallback((id: string): CodeBlockData | undefined => {
    return codeBlocksRef.current[id];
  }, []);

  const clearAllCodeBlocks = useCallback(() => {
    setCodeBlocks({});
    buffers.current = {};
    animationIdRef.current = 0;
  }, []);

  // For history rendering compatibility - collect from tokens
  const getCodeBlocksFromTokens = useCallback((tokens: any[]) => {
    const codeBlocksData = new Map<string, { language: string; content: string }>();
    let currentCodeBlockId: string | undefined = undefined;

    tokens.forEach((token: any) => {
      switch (token.type) {
        case 'code_block_start':
          if (token.metadata?.codeBlockId) {
            currentCodeBlockId = token.metadata.codeBlockId;
            codeBlocksData.set(currentCodeBlockId as string, { language: '', content: '' });
          }
          break;
        case 'code_content':
          if (currentCodeBlockId && token.metadata?.codeBlockId === currentCodeBlockId) {
            const blockData = codeBlocksData.get(currentCodeBlockId);
            if (blockData) {
              if (token.metadata?.language) {
                blockData.language = token.metadata.language;
              } else if (token.content) {
                blockData.content += token.content;
              }
            }
          }
          break;
        case 'code_block_end':
          currentCodeBlockId = undefined;
          break;
      }
    });
    return codeBlocksData;
  }, []);

  return useMemo(() => ({
    codeBlocks,
    createCodeBlock,
    setCodeBlockLanguage,
    appendToCodeBlock,
    completeCodeBlock,
    getCodeBlock,
    clearAllCodeBlocks,
    getCodeBlocksFromTokens,
  }), [
    codeBlocks,
    createCodeBlock,
    setCodeBlockLanguage,
    appendToCodeBlock,
    completeCodeBlock,
    getCodeBlock,
    clearAllCodeBlocks,
    getCodeBlocksFromTokens,
  ]);
};
