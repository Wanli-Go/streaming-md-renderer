// Parser (framework-agnostic)
export { ContentProcessor } from './parser/ContentProcessor';
export type { ContentToken, ProcessingState, ContentProcessorOptions } from './parser/types';

// React rendering layer
export { MathRenderer } from './react/MathRenderer';
export type { MathRendererProps } from './react/MathRenderer';
export {
  renderSimpleToken,
  renderCellContent,
  buildTableElement,
} from './react/tokenRenderers';
export type {
  TableRowData,
  RenderedElement,
  SimpleRenderResult,
} from './react/tokenRenderers';
