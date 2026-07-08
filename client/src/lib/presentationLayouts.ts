import type { PresentationSlide, SlideLayout } from './presentationDeck';
import { JOHNNY_ACCENT_PRESETS, JOHNNY_PRESENTATION } from './presentationTheme';

export interface LayoutMeta {
  id: SlideLayout;
  label: string;
  hint: string;
}

export const SLIDE_LAYOUTS: LayoutMeta[] = [
  { id: 'title-slide', label: 'Titelfolie', hint: 'Großer Titel + Untertitel' },
  { id: 'title-content', label: 'Titel & Inhalt', hint: 'Klassische Folie' },
  { id: 'section', label: 'Abschnitt', hint: 'Kapitelüberschrift' },
  { id: 'two-column', label: '2 Spalten', hint: 'Vergleich / Stichpunkte' },
  { id: 'image-right', label: 'Bild rechts', hint: 'Text links, Bild rechts' },
  { id: 'image-left', label: 'Bild links', hint: 'Bild links, Text rechts' },
  { id: 'quote', label: 'Zitat', hint: 'Hervorgehobenes Zitat' },
  { id: 'blank', label: 'Leer', hint: 'Minimale Folie' },
];

export const ACCENT_PRESETS = JOHNNY_ACCENT_PRESETS;

export function defaultTitleAlign(layout: SlideLayout): 'left' | 'center' {
  if (layout === 'title-slide' || layout === 'section' || layout === 'quote') return 'center';
  return 'left';
}

export function createSlideFromLayout(order: number, layout: SlideLayout = 'title-content'): PresentationSlide {
  const n = order + 1;
  const base = {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    order,
    speakerNotes: '',
    layout,
    subtitle: '',
    bodyLeft: '',
    bodyRight: '',
    imagePath: '',
    imageCaption: '',
    bodyStyle: 'plain' as const,
    titleAlign: defaultTitleAlign(layout),
    accentColor: JOHNNY_PRESENTATION.primary,
  };

  switch (layout) {
    case 'title-slide':
      return { ...base, title: `Folie ${n}`, body: 'Untertitel hier eingeben' };
    case 'section':
      return { ...base, title: `Abschnitt ${n}`, body: '' };
    case 'two-column':
      return {
        ...base,
        title: `Folie ${n}`,
        body: '',
        bodyLeft: 'Linke Spalte',
        bodyRight: 'Rechte Spalte',
      };
    case 'image-right':
    case 'image-left':
      return { ...base, title: `Folie ${n}`, body: 'Text neben dem Bild…' };
    case 'quote':
      return { ...base, title: '', body: '„Ein Zitat oder eine Kernaussage."', subtitle: '— Quelle' };
    case 'blank':
      return { ...base, title: '', body: '' };
    default:
      return { ...base, title: `Folie ${n}`, body: '' };
  }
}
