import './styles.css';

export { MathBlock } from './components/MathBlock';
export type { MathBlockProps } from './components/MathBlock';

export {
  renderSimpleToken,
  renderCellContent,
  buildTableElement,
} from './components/tokenRenderers';
export type {
  TableRowData,
  RenderedElement,
  SimpleRenderResult,
} from './components/tokenRenderers';

export {
  useUnifiedCodeBlockManager,
  type CodeBlockData,
  type UseUnifiedCodeBlockManagerReturn,
  type UseCodeBlockManagerOptions,
} from './hooks/useUnifiedCodeBlockManager';

export {
  useStreamingMarkdown,
  type UseStreamingMarkdownOptions,
  type UseStreamingMarkdownReturn,
} from './hooks/useStreamingMarkdown';

export {
  useStaticMarkdown,
  type UseStaticMarkdownOptions,
  type UseStaticMarkdownReturn,
} from './hooks/useStaticMarkdown';

export { default as CodeBlock } from './components/CodeBlock';
export type { CodeBlockProps } from './components/CodeBlock';
