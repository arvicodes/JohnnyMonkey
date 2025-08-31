declare module 'file-saver' {
  export function saveAs(data: Blob | string, filename?: string): void;
  export function saveAs(data: Blob | string, filename?: string, options?: any): void;
}
