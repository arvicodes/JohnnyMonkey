export type FlyerElementType = 'text' | 'rect' | 'circle' | 'image' | 'line';

export type FlyerElement = {
  id: string;
  type: FlyerElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  opacity?: number;
  src?: string;
};

export type FlyerPage = {
  background: string;
  backgroundGradient?: string;
  elements: FlyerElement[];
};

export type FlyerDocument = {
  version: 1;
  title: string;
  pages: FlyerPage[];
};

export type FlyerTemplate = {
  id: string;
  name: string;
  description: string;
  preview: string;
  previewGradient?: string;
  document: FlyerDocument;
};

export function newElementId(): string {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function cloneDocument(doc: FlyerDocument): FlyerDocument {
  return JSON.parse(JSON.stringify(doc)) as FlyerDocument;
}
