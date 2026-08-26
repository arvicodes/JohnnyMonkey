declare module 'katex' {
  export interface KatexOptions {
    throwOnError?: boolean;
    displayMode?: boolean;
    output?: 'html' | 'mathml' | 'htmlAndMathml';
    strict?: boolean | string;
    trust?: boolean;
  }
  export function renderToString(tex: string, options?: KatexOptions): string;
}

declare module 'katex/dist/katex.min.css';
