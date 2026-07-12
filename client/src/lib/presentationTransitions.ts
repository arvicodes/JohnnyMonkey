export type SlideTransition =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'push-left'
  | 'zoom'
  | 'zoom-out'
  | 'rotate'
  | 'flip'
  | 'curtain'
  | 'bounce'
  | 'blur';

export interface SlideTransitionMeta {
  id: SlideTransition;
  label: string;
  hint: string;
  group: 'basis' | 'slide' | 'zoom' | 'special';
}

export const SLIDE_TRANSITIONS: SlideTransitionMeta[] = [
  { id: 'none', label: 'Keiner', hint: 'Sofortiger Wechsel', group: 'basis' },
  { id: 'fade', label: 'Einblenden', hint: 'Sanft von transparent', group: 'basis' },
  { id: 'slide-left', label: 'Von rechts', hint: 'Gleitet von rechts herein', group: 'slide' },
  { id: 'slide-right', label: 'Von links', hint: 'Gleitet von links herein', group: 'slide' },
  { id: 'slide-up', label: 'Von unten', hint: 'Steigt von unten auf', group: 'slide' },
  { id: 'slide-down', label: 'Von oben', hint: 'Fällt von oben ein', group: 'slide' },
  { id: 'push-left', label: 'Hereinschieben', hint: 'Volle Breite von rechts', group: 'slide' },
  { id: 'zoom', label: 'Heranzoomen', hint: 'Klein → groß', group: 'zoom' },
  { id: 'zoom-out', label: 'Herauszoomen', hint: 'Groß → normal', group: 'zoom' },
  { id: 'rotate', label: 'Drehen', hint: 'Leicht gedreht einblenden', group: 'special' },
  { id: 'flip', label: 'Umklappen', hint: '3D-Kartenflip', group: 'special' },
  { id: 'curtain', label: 'Vorhang', hint: 'Von links aufziehen', group: 'special' },
  { id: 'bounce', label: 'Federnd', hint: 'Mit leichtem Überschwingen', group: 'special' },
  { id: 'blur', label: 'Unschärfe', hint: 'Aus Weichzeichner scharf', group: 'special' },
];

export const SLIDE_TRANSITION_GROUPS: { id: SlideTransitionMeta['group']; label: string }[] = [
  { id: 'basis', label: 'Basis' },
  { id: 'slide', label: 'Gleiten' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'special', label: 'Spezial' },
];

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DURATION = '0.78s';
const BOUNCE_DURATION = '0.95s';

export const TRANSITION_CSS: Record<SlideTransition, { in: string }> = {
  none: { in: 'none' },
  fade: { in: `presFadeIn ${DURATION} ${EASE_OUT} both` },
  'slide-left': { in: `presSlideLeftIn ${DURATION} ${EASE_OUT} both` },
  'slide-right': { in: `presSlideRightIn ${DURATION} ${EASE_OUT} both` },
  'slide-up': { in: `presSlideUpIn ${DURATION} ${EASE_OUT} both` },
  'slide-down': { in: `presSlideDownIn ${DURATION} ${EASE_OUT} both` },
  'push-left': { in: `presPushLeftIn ${DURATION} ${EASE_OUT} both` },
  zoom: { in: `presZoomIn ${DURATION} ${EASE_OUT} both` },
  'zoom-out': { in: `presZoomOutIn ${DURATION} ${EASE_OUT} both` },
  rotate: { in: `presRotateIn ${DURATION} ${EASE_OUT} both` },
  flip: { in: `presFlipIn ${DURATION} ${EASE_OUT} both` },
  curtain: { in: `presCurtainIn ${DURATION} ${EASE_OUT} both` },
  bounce: { in: `presBounceIn ${BOUNCE_DURATION} cubic-bezier(0.34, 1.56, 0.64, 1) both` },
  blur: { in: `presBlurIn ${DURATION} ${EASE_OUT} both` },
};

export const PRESENTATION_KEYFRAMES = `
@keyframes presFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes presSlideLeftIn {
  from { opacity: 0; transform: translateX(38%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes presSlideRightIn {
  from { opacity: 0; transform: translateX(-38%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes presSlideUpIn {
  from { opacity: 0; transform: translateY(34%); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes presSlideDownIn {
  from { opacity: 0; transform: translateY(-34%); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes presPushLeftIn {
  from { opacity: 0.85; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes presZoomIn {
  from { opacity: 0; transform: scale(0.68); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes presZoomOutIn {
  from { opacity: 0; transform: scale(1.35); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes presRotateIn {
  from { opacity: 0; transform: rotate(-10deg) scale(0.82); }
  to { opacity: 1; transform: rotate(0deg) scale(1); }
}
@keyframes presFlipIn {
  from { opacity: 0; transform: perspective(1400px) rotateY(-82deg); }
  to { opacity: 1; transform: perspective(1400px) rotateY(0deg); }
}
@keyframes presCurtainIn {
  from { opacity: 0.4; clip-path: inset(0 100% 0 0); }
  to { opacity: 1; clip-path: inset(0 0 0 0); }
}
@keyframes presBounceIn {
  0% { opacity: 0; transform: scale(0.55); }
  58% { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes presBlurIn {
  from { opacity: 0; filter: blur(18px); transform: scale(1.06); }
  to { opacity: 1; filter: blur(0); transform: scale(1); }
}
@keyframes presRevealIn {
  from { opacity: 0; transform: translateY(22px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

const TRANSITION_IDS = new Set(SLIDE_TRANSITIONS.map((entry) => entry.id));

export function normalizeSlideTransition(value?: string | null): SlideTransition {
  if (value && TRANSITION_IDS.has(value as SlideTransition)) {
    return value as SlideTransition;
  }
  return 'fade';
}

export function resolveSlideTransitionAnimation(transition?: string | null): string {
  const id = normalizeSlideTransition(transition);
  return TRANSITION_CSS[id]?.in ?? TRANSITION_CSS.fade.in;
}

export function getSlideTransitionMeta(transition?: string | null): SlideTransitionMeta {
  const id = normalizeSlideTransition(transition);
  return SLIDE_TRANSITIONS.find((entry) => entry.id === id) ?? SLIDE_TRANSITIONS[1];
}
