# streaming-md-renderer

A real-time streaming markdown tokenizer and React renderer designed for LLM chat interfaces. Processes text chunk-by-chunk as it arrives from streaming APIs (SSE), producing typed tokens that drive word-by-word rendering with animation support.

## Features

- **Streaming-first** — processes arbitrary chunk boundaries from SSE/streaming APIs
- **Code blocks** — fenced code blocks with language detection and streaming content
- **LaTeX math** — display (`\[...\]`, `$$...$$`) and inline (`\(...\)`) with KaTeX rendering
- **Tables** — GitHub-flavored markdown tables with header/body detection
- **Inline formatting** — headings, bold, inline code, horizontal rules, list items
- **Chunk-boundary handling** — delimiters split across chunks are correctly detected
- **Two rendering paths** — streaming (chunk-by-chunk) and complete (batch for history)

## Architecture

```
Streaming API chunk
       │
       ▼
┌──────────────────────┐
│  ContentProcessor    │  ← Stateful tokenizer (framework-agnostic)
│  processContent()    │
└──────────┬───────────┘
           │ ContentToken[]
           ▼
┌──────────────────────┐
│  renderSimpleToken() │  ← React rendering layer
│  buildTableElement() │
│  MathRenderer        │
└──────────────────────┘
           │ React.ReactNode
           ▼
       Your UI
```

The parser layer (`streaming-md-renderer/parser`) has **zero framework dependencies** — it can be used with Vue, Svelte, or any other framework by consuming the `ContentToken` stream directly.

## Installation

```bash
npm install streaming-md-renderer
```

Peer dependencies: `react >= 18.0.0`

## Quick Start

### Streaming (chunk-by-chunk)

```tsx
import { ContentProcessor, renderSimpleToken } from 'streaming-md-renderer';

const processor = new ContentProcessor({
  languageAliases: { types: 'typescript', k: 'kotlin', kot: 'kotlin' },
});

// For each SSE chunk:
function onChunk(chunk: string) {
  const tokens = processor.processContent(chunk);
  tokens.forEach(token => {
    const result = renderSimpleToken(token, `key-${Date.now()}`);
    if (result) {
      // Append result.element to your UI
    }
    // Handle code_block_*, code_content, table_row separately
  });
}

// Reset between messages:
processor.reset();
```

### Complete content (chat history)

```tsx
import { ContentProcessor } from 'streaming-md-renderer';

const processor = new ContentProcessor();
const tokens = processor.processCompleteContent(markdownString);
// tokens is ContentToken[] — render all at once
```

### Parser only (no React)

```tsx
import { ContentProcessor } from 'streaming-md-renderer/parser';
import type { ContentToken } from 'streaming-md-renderer/parser';

const processor = new ContentProcessor();
const tokens: ContentToken[] = processor.processContent(chunk);
// Use tokens with your own rendering layer
```

## Token Types

| Token | Description | Key metadata |
|-------|-------------|-------------|
| `text` | Inline text | `titleLevel`, `isBold`, `isBackticked` |
| `code_block_start` | Opening ` ``` ` | `codeBlockId` |
| `code_content` | Code inside a block | `codeBlockId`, `language` |
| `code_block_end` | Closing ` ``` ` | `codeBlockId` |
| `horizontal_rule` | `---` | — |
| `list_item` | `- ` at start of line | — |
| `table_row` | `\| col \| col \|` | `tableCells`, `isTableHeader`, `isTableSeparator` |
| `newline` | Explicit line break | — |
| `math_block` | Display math `\[...\]` or `$$...$$` | `displayMode: true` |
| `math_inline` | Inline math `\(...\)` | `displayMode: false` |

## Algorithm Details

### Newline handling

Newlines are split out of every text chunk **before** any formatting detection runs. This guarantees:

1. `newlineFlag` is set deterministically (single location, no early-return bugs)
2. Header detection (`#`) always sees content at the start of a line
3. Newlines render as visible `<span>\n</span>` elements via `whitespace: pre-wrap`

### Block-level spacing

After block-level elements (`<hr>`, display math), a `skipNewlineCount` counter suppresses the next N newline tokens to prevent double-spacing with CSS margins.

### Math delimiter chunk-splitting

LLM streaming APIs may split `\[` into `\` + `[` across chunks. Two mechanisms handle this:

- **Opening delimiters**: A trailing `\` is saved as `pendingMathPrefix` and prepended to the next chunk
- **Closing delimiters**: The math buffer is combined with incoming content (`buffer + chunk`) before scanning for the closing delimiter

### Table streaming

Tables are detected when `|` appears at the start of a line. Content is accumulated in `tableRowBuffer` until a newline arrives, then the complete row is parsed and emitted. Newline tokens are **not** emitted between `table_row` tokens, allowing the renderer to group consecutive rows into a single `<table>`.

## Exports

### `streaming-md-renderer` (main)
Everything — parser + React layer.

### `streaming-md-renderer/parser`
Framework-agnostic: `ContentProcessor`, `ContentToken`, `ProcessingState`, `ContentProcessorOptions`.

### `streaming-md-renderer/react`
React components and helpers: `renderSimpleToken`, `buildTableElement`, `renderCellContent`, `MathRenderer`, `TableRowData`, `RenderedElement`.

## License

MIT
