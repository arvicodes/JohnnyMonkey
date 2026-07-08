export type SlideTransition = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'zoom';

export const SLIDE_TRANSITIONS: { id: SlideTransition; label: string }[] = [
  { id: 'none', label: 'Keiner' },
  { id: 'fade', label: 'Einblenden' },
  { id: 'slide-left', label: 'Von rechts' },
  { id: 'slide-right', label: 'Von links' },
  { id: 'slide-up', label: 'Von unten' },
  { id: 'zoom', label: 'Zoom' },
];

export const TRANSITION_CSS: Record<SlideTransition, { in: string }> = {
  none: { in: 'none' },
  fade: { in: 'presFadeIn 0.45s ease-out' },
  'slide-left': { in: 'presSlideLeftIn 0.45s ease-out' },
  'slide-right': { in: 'presSlideRightIn 0.45s ease-out' },
  'slide-up': { in: 'presSlideUpIn 0.45s ease-out' },
  zoom: { in: 'presZoomIn 0.4s ease-out' },
};

export const PRESENTATION_KEYFRAMES = `
@keyframes presFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes presSlideLeftIn { from { opacity: 0; transform: translateX(6%); } to { opacity: 1; transform: translateX(0); } }
@keyframes presSlideRightIn { from { opacity: 0; transform: translateX(-6%); } to { opacity: 1; transform: translateX(0); } }
@keyframes presSlideUpIn { from { opacity: 0; transform: translateY(5%); } to { opacity: 1; transform: translateY(0); } }
@keyframes presZoomIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
@keyframes presRevealIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;
