import Prism from "prismjs";

// PrismJS language components expect a global `Prism` variable.
// When bundlers (e.g. Vite) convert PrismJS from CJS to ESM, the global
// assignment may not be preserved. Explicitly set it here so that
// subsequent `import "prismjs/components/prism-xxx"` calls can find it.
if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).Prism = Prism;
}

export { Prism };
