# streaming-md-renderer

**Version 0.2.0**

A real-time streaming markdown tokenizer and React renderer designed specifically for LLM chat interfaces.

Processes text **chunk-by-chunk** as it arrives from streaming APIs (OpenAI, Anthropic, DeepSeek, SSE, etc.), with excellent support for code blocks with live animations, tables, and LaTeX math.

## Features

- **Streaming-first** design with robust chunk boundary handling
- Real-time **code blocks** with character-by-character animation + Prism syntax highlighting
- **LaTeX math** support (inline and display) via KaTeX
- **GitHub-style tables** with streaming row accumulation
- Headings, bold, inline code, horizontal rules, lists
- Two modes: `streaming` (animated) and `static` (for chat history)
- High-level `useStreamingMarkdown()` hook for instant integration
- Framework-agnostic parser + convenient React layer

## Quick Start

### Recommended: High-level hook

```tsx
import { useStreamingMarkdown } from 'streaming-md-renderer/react';

function StreamingMessage() {
  const { rendered, appendChunk, reset, isEmpty } = useStreamingMarkdown({
    mode: 'streaming',        // or 'static'
    reduceMotion: false,
    language: 'en'            // for copy button text
  });

  // Call this when you receive a chunk from your LLM
  const onReceiveChunk = (chunk: string) => {
    appendChunk(chunk);
  };

  return (
    <div className="prose prose-invert max-w-none">
      {isEmpty ? <div className="italic text-zinc-500">Thinking...</div> : rendered}
    </div>
  );
}
```

### Low-level API (for advanced control)

```tsx
import { ContentProcessor } from 'streaming-md-renderer';
import { useUnifiedCodeBlockManager, renderSimpleToken } from 'streaming-md-renderer/react';

const processor = new ContentProcessor();
const codeBlockManager = useUnifiedCodeBlockManager({ mode: 'streaming' });
```

## Installation

```bash
npm install streaming-md-renderer
```

**Peer dependencies:**
- `react >= 18`
- `prismjs` (for code block syntax highlighting)

## Live Demo

Open `demo/index.html` to see both streaming and static rendering in action.

## API Overview

- `useStreamingMarkdown(options)` — High-level hook (recommended)
- `ContentProcessor` — Core streaming tokenizer
- `useUnifiedCodeBlockManager({ mode: 'streaming' | 'static' })` — Code block state manager
- `renderSimpleToken()` — Renders simple markdown elements
- `CodeBlock` — Beautiful code block component with copy button

## Mode Options

- **`streaming`**: Real-time typewriter animation, uses `flushSync` for smooth updates
- **`static`**: Faster, synchronous updates suitable for chat history

## License

MIT

---

Built for smooth LLM chat experiences.
