// Parser (framework-agnostic)
export { ContentProcessor } from './parser/ContentProcessor';
export type { ContentToken, ProcessingState, ContentProcessorOptions } from './parser/types';

// React rendering layer
export { MathBlock as MathRenderer } from './react/components/MathBlock';
export type { MathBlockProps as MathRendererProps } from './react/components/MathBlock';
export {
  renderSimpleToken,
  renderCellContent,
  buildTableElement,
} from './react/components/tokenRenderers';
export type {
  TableRowData,
  RenderedElement,
  SimpleRenderResult,
} from './react/components/tokenRenderers';
