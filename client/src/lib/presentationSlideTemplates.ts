import {
  htmlToPlain,
  normalizeSlide,
  textToHtml,
  type SlideElement,
} from './presentationDeck';
import { loadJsonFile, type PresentationSlide } from './presentationDeck';
import { JOHNNY_PRESENTATION } from './presentationTheme';

export const SLIDE_TEMPLATES_FILENAME = 'Folienvorlagen.json';

export type SlideTemplateKind = 'start' | 'auftrag' | 'sicherung' | 'ha' | 'link' | 'referenz';

export type SlideTemplatePayload = Omit<PresentationSlide, 'id' | 'order'>;

export type SlideTemplateMeta = {
  kind: SlideTemplateKind;
  label: string;
  shortLabel: string;
  hint: string;
};

export type SlideTemplatesStore = {
  version: 1 | 2;
  updatedAt: string;
  templates: Partial<Record<SlideTemplateKind, SlideTemplatePayload>>;
  /** Benutzerdefinierte Vorlagen (ab Version 2). */
  custom?: CustomSlideTemplate[];
};

export type CustomSlideTemplate = {
  id: string;
  label: string;
  shortLabel: string;
  hint?: string;
  payload: SlideTemplatePayload;
  createdAt: string;
};

export const SLIDE_TEMPLATE_META: SlideTemplateMeta[] = [
  { kind: 'start', label: 'Start', shortLabel: 'S', hint: 'Eröffnungsfolie' },
  { kind: 'auftrag', label: 'Auftrag', shortLabel: 'A', hint: 'Arbeitsauftrag' },
  { kind: 'sicherung', label: 'Sicherung', shortLabel: 'S', hint: 'Sicherung / Merksatz' },
  { kind: 'ha', label: 'Hausaufgabe', shortLabel: 'HA', hint: 'HA-Folie (immer mit HA-Bild)' },
  { kind: 'link', label: 'Link', shortLabel: '▶', hint: 'Video im Vollbild (YouTube, MP4 …)' },
  { kind: 'referenz', label: 'Referenz', shortLabel: '↗', hint: 'Webseite einbetten, zoombar (z. B. Wall of Fame)' },
];

const GRAFIKEN_TOKEN = '__GRAFIKEN__';

export function grafikenFolderPath(lessonPath: string): string {
  const p = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');
  const match = p.match(/^(.*\/J-M-Reihen)\//);
  if (match) return `${match[1]}/Grafiken`;
  const parent = p.replace(/\/[^/]+$/, '');
  return `${parent}/Grafiken`;
}

export function slideTemplatesFilePath(lessonPath: string): string {
  return `${grafikenFolderPath(lessonPath)}/${SLIDE_TEMPLATES_FILENAME}`;
}

export function grafikenAssetPath(lessonPath: string, filename: string): string {
  return `${grafikenFolderPath(lessonPath)}/${filename}`;
}

function tokenizeGrafikenPath(absPath: string, grafikenPath: string): string {
  const file = absPath.split('/').pop() || absPath;
  if (file === 'HA.png' || file === 'Kreis.png') {
    return `${GRAFIKEN_TOKEN}/${file}`;
  }
  if (absPath.includes('/Grafiken/')) {
    return `${GRAFIKEN_TOKEN}/${file}`;
  }
  return absPath;
}

function resolveGrafikenPath(src: string, grafikenPath: string): string {
  if (!src) return src;
  if (src.startsWith(`${GRAFIKEN_TOKEN}/`)) {
    const file = src.slice(GRAFIKEN_TOKEN.length + 1);
    return `${grafikenPath}/${file}`;
  }
  const file = src.split('/').pop() || '';
  if (file === 'HA.png' || file === 'Kreis.png') {
    return `${grafikenPath}/${file}`;
  }
  return src;
}

function remapElementsForTemplate(
  elements: SlideElement[] | undefined,
  grafikenPath: string,
): SlideElement[] | undefined {
  if (!elements?.length) return elements;
  return elements.map((el) =>
    el.type === 'image' && el.src
      ? { ...el, src: tokenizeGrafikenPath(el.src, grafikenPath) }
      : { ...el },
  );
}

function remapElementsForLesson(
  elements: SlideElement[] | undefined,
  grafikenPath: string,
): SlideElement[] | undefined {
  if (!elements?.length) return elements;
  return elements.map((el) =>
    el.type === 'image' && el.src
      ? { ...el, src: resolveGrafikenPath(el.src, grafikenPath) }
      : { ...el },
  );
}

export function slideToTemplatePayload(
  slide: PresentationSlide,
  lessonPath: string,
): SlideTemplatePayload {
  const normalized = normalizeSlide(slide);
  const grafikenPath = grafikenFolderPath(lessonPath);
  const { id: _id, order: _order, ...rest } = normalized;
  return {
    ...rest,
    elements: remapElementsForTemplate(rest.elements, grafikenPath),
    imagePath: rest.imagePath
      ? tokenizeGrafikenPath(rest.imagePath, grafikenPath)
      : rest.imagePath,
  };
}

function builtinTemplates(): SlideTemplatesStore['templates'] {
  const haElement: SlideElement = {
    id: 'tpl-ha-img',
    type: 'image',
    x: 83.64998242736645,
    y: 0,
    w: 16.35001757263355,
    h: 17.753045923149017,
    src: `${GRAFIKEN_TOKEN}/HA.png`,
    zIndex: 1,
    revealStep: 0,
    imageFit: 'contain',
  };

  return {
    start: {
      layout: 'title-slide',
      title: 'Thema der Stunde',
      body: 'Untertitel / Einstieg',
      speakerNotes: '',
      preparationNotes: '',
      materialNotes: '',
      subtitle: '',
      bodyLeft: '',
      bodyRight: '',
      imagePath: '',
      imageCaption: '',
      bodyStyle: 'plain',
      titleAlign: 'center',
      accentColor: JOHNNY_PRESENTATION.primary,
      titleHtml: '<p>Thema der Stunde</p>',
      bodyHtml: '<p>Untertitel / Einstieg</p>',
      subtitleHtml: '',
      bodyLeftHtml: '',
      bodyRightHtml: '',
      imageCaptionHtml: '',
      speakerNotesHtml: '',
      preparationHtml: '',
      materialHtml: '',
      elements: [],
      transition: 'fade',
      revealEnabled: true,
      zoneRevealSteps: {},
    },
    auftrag: {
      layout: 'title-content',
      title: 'Auftrag',
      body: 'Formuliere hier den Arbeitsauftrag für die Schülerinnen und Schüler.',
      speakerNotes: '',
      preparationNotes: '',
      materialNotes: '',
      subtitle: '',
      bodyLeft: '',
      bodyRight: '',
      imagePath: '',
      imageCaption: '',
      bodyStyle: 'plain',
      titleAlign: 'left',
      accentColor: JOHNNY_PRESENTATION.primary,
      titleHtml: '<p><b>Auftrag</b></p>',
      bodyHtml:
        '<ul><li>Formuliere hier den Arbeitsauftrag für die Schülerinnen und Schüler.</li></ul>',
      subtitleHtml: '',
      bodyLeftHtml: '',
      bodyRightHtml: '',
      imageCaptionHtml: '',
      speakerNotesHtml: '',
      preparationHtml: '',
      materialHtml: '',
      elements: [],
      transition: 'fade',
      revealEnabled: true,
      zoneRevealSteps: {},
    },
    sicherung: {
      layout: 'title-content',
      title: 'Sicherung',
      body: 'Sicherung: Was habt ihr heute gelernt?\nMerksatz:\n…',
      speakerNotes: '',
      preparationNotes: '',
      materialNotes: '',
      subtitle: '',
      bodyLeft: '',
      bodyRight: '',
      imagePath: '',
      imageCaption: '',
      bodyStyle: 'plain',
      titleAlign: 'left',
      accentColor: '#C62828',
      titleHtml: '<p>Sicherung</p>',
      bodyHtml:
        '<p><b>Sicherung: Was habt ihr heute gelernt?</b></p><ol><li>…</li></ol><p><b>Merksatz:</b> …</p>',
      subtitleHtml: '',
      bodyLeftHtml: '',
      bodyRightHtml: '',
      imageCaptionHtml: '',
      speakerNotesHtml: '',
      preparationHtml: '',
      materialHtml: '',
      elements: [],
      transition: 'slide-right',
      revealEnabled: true,
      zoneRevealSteps: {},
    },
    ha: {
      layout: 'title-content',
      title: 'Hausaufgabe: Wer bist du als Person?',
      body: 'Schreibe einen kurzen Steckbrief zu dir.\nBringe ein leeres, kariertes A4-Heft mit.',
      speakerNotes: '',
      preparationNotes: '',
      materialNotes: '',
      subtitle: '',
      bodyLeft: '',
      bodyRight: '',
      imagePath: '',
      imageCaption: '',
      bodyStyle: 'plain',
      titleAlign: 'left',
      accentColor: '#C62828',
      titleHtml:
        '<p><span data-pres-color="#1a1a2e" style="color: rgb(26, 26, 46) !important;">Hausaufgabe: Wer bist du als Person?</span></p>',
      bodyHtml:
        '<ul><li><span style="font-weight: bold;">Schreibe</span> einen kurzen Steckbrief zu dir.</li><li><span style="font-weight: bold;">Bringe</span> ein <span data-pres-highlight="#C5E1A5" style="background-color: rgb(197, 225, 165) !important;">leeres, kariertes A4-Heft</span> mit.</li></ul>',
      subtitleHtml: '',
      bodyLeftHtml: '',
      bodyRightHtml: '',
      imageCaptionHtml: '',
      speakerNotesHtml: '',
      preparationHtml: '<p><br></p>',
      materialHtml: '',
      elements: [haElement],
      transition: 'zoom',
      revealEnabled: true,
      zoneRevealSteps: {},
    },
    link: {
      layout: 'blank',
      title: 'Video / Link',
      body: '',
      speakerNotes: 'Video-URL im Element bearbeiten: Element wählen → ⚙ → Link/URL',
      preparationNotes: '',
      materialNotes: '',
      subtitle: '',
      bodyLeft: '',
      bodyRight: '',
      imagePath: '',
      imageCaption: '',
      bodyStyle: 'plain',
      titleAlign: 'left',
      accentColor: JOHNNY_PRESENTATION.primary,
      titleHtml: '<p>Video / Link</p>',
      bodyHtml: '',
      subtitleHtml: '',
      bodyLeftHtml: '',
      bodyRightHtml: '',
      imageCaptionHtml: '',
      speakerNotesHtml: '',
      preparationHtml: '',
      materialHtml: '',
      elements: [
        {
          id: 'tpl-link-media',
          type: 'video',
          x: 0,
          y: 0,
          w: 100,
          h: 93,
          src: '',
          zIndex: 1,
          revealStep: 0,
        },
      ],
      transition: 'fade',
      revealEnabled: true,
      zoneRevealSteps: {},
    },
    referenz: {
      layout: 'blank',
      title: 'Referenz',
      body: '',
      speakerNotes: 'Referenz-URL im Element bearbeiten (z. B. /wall-of-fame). In der Präsentation zoombar.',
      preparationNotes: '',
      materialNotes: '',
      subtitle: '',
      bodyLeft: '',
      bodyRight: '',
      imagePath: '',
      imageCaption: '',
      bodyStyle: 'plain',
      titleAlign: 'left',
      accentColor: JOHNNY_PRESENTATION.primary,
      titleHtml: '<p>Referenz</p>',
      bodyHtml: '',
      subtitleHtml: '',
      bodyLeftHtml: '',
      bodyRightHtml: '',
      imageCaptionHtml: '',
      speakerNotesHtml: '',
      preparationHtml: '',
      materialHtml: '',
      elements: [
        {
          id: 'tpl-referenz-embed',
          type: 'embed',
          x: 0,
          y: 0,
          w: 100,
          h: 93,
          src: '/wall-of-fame',
          zIndex: 1,
          revealStep: 0,
          mediaZoom: 1,
        },
      ],
      transition: 'fade',
      revealEnabled: true,
      zoneRevealSteps: {},
    },
  };
}

export function createDefaultTemplatesStore(): SlideTemplatesStore {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    templates: builtinTemplates(),
    custom: [],
  };
}

export function normalizeTemplatesStore(raw?: SlideTemplatesStore | null): SlideTemplatesStore {
  const builtins = builtinTemplates();
  if (!raw?.templates || typeof raw.templates !== 'object') {
    return createDefaultTemplatesStore();
  }
  return {
    version: 2,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    templates: { ...builtins, ...raw.templates },
    custom: Array.isArray(raw.custom) ? raw.custom.filter((t) => t?.id && t?.label && t?.payload) : [],
  };
}

export function shortLabelFromTemplateName(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  if (t.length <= 3) return t.slice(0, 3);
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase().slice(0, 3);
  }
  return t.slice(0, 3);
}

export function updateCustomTemplate(
  store: SlideTemplatesStore,
  customId: string,
  payload: SlideTemplatePayload,
): SlideTemplatesStore {
  const custom = (store.custom ?? []).map((entry) =>
    entry.id === customId
      ? { ...entry, payload, createdAt: new Date().toISOString() }
      : entry,
  );
  return normalizeTemplatesStore({ ...store, custom });
}

export function addCustomTemplate(
  store: SlideTemplatesStore,
  label: string,
  payload: SlideTemplatePayload,
): SlideTemplatesStore {
  const trimmed = label.trim();
  if (!trimmed) return store;
  const entry: CustomSlideTemplate = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: trimmed,
    shortLabel: shortLabelFromTemplateName(trimmed),
    hint: 'Eigene Vorlage',
    payload,
    createdAt: new Date().toISOString(),
  };
  return normalizeTemplatesStore({
    ...store,
    custom: [...(store.custom ?? []), entry],
  });
}

export async function loadSlideTemplates(lessonPath: string): Promise<SlideTemplatesStore> {
  const path = slideTemplatesFilePath(lessonPath);
  const loaded = await loadJsonFile<SlideTemplatesStore>(path);
  if (loaded?.templates && typeof loaded.templates === 'object') {
    return normalizeTemplatesStore(loaded);
  }
  const defaults = createDefaultTemplatesStore();
  try {
    await saveSlideTemplates(lessonPath, defaults);
  } catch {
    /* Grafiken-Ordner evtl. noch nicht beschreibbar */
  }
  return defaults;
}

export async function saveSlideTemplates(
  lessonPath: string,
  store: SlideTemplatesStore,
): Promise<void> {
  const folder = grafikenFolderPath(lessonPath);
  const payload: SlideTemplatesStore = {
    ...store,
    updatedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, SLIDE_TEMPLATES_FILENAME);
  formData.append('targetPath', folder);
  const res = await fetch('/api/file-system-paths/save-file', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Vorlagen speichern fehlgeschlagen');
  }
}

export function getTemplatePayload(
  store: SlideTemplatesStore,
  kind: SlideTemplateKind,
): SlideTemplatePayload | null {
  return store.templates[kind] ?? builtinTemplates()[kind] ?? null;
}

export function instantiateTemplateSlide(
  payload: SlideTemplatePayload,
  order: number,
  lessonPath: string,
): PresentationSlide {
  const grafikenPath = grafikenFolderPath(lessonPath);
  const id = `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const resolved: SlideTemplatePayload = {
    ...payload,
    imagePath: payload.imagePath
      ? resolveGrafikenPath(payload.imagePath, grafikenPath)
      : payload.imagePath,
    elements: remapElementsForLesson(payload.elements, grafikenPath)?.map((el, index) => ({
      ...el,
      id: `el-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
    })),
  };
  return normalizeSlide({
    ...resolved,
    id,
    order,
    title: resolved.title || SLIDE_TEMPLATE_META.find((m) => m.label)?.label || 'Folie',
    titleHtml: resolved.titleHtml || textToHtml(resolved.title || ''),
    bodyHtml: resolved.bodyHtml || textToHtml(resolved.body || ''),
  });
}

export function createSlideFromTemplateKind(
  kind: SlideTemplateKind,
  order: number,
  lessonPath: string,
  store: SlideTemplatesStore,
): PresentationSlide | null {
  const payload = getTemplatePayload(store, kind);
  if (!payload) return null;
  return instantiateTemplateSlide(payload, order, lessonPath);
}

export function createSlideFromCustomTemplate(
  customId: string,
  order: number,
  lessonPath: string,
  store: SlideTemplatesStore,
): PresentationSlide | null {
  const entry = (store.custom ?? []).find((t) => t.id === customId);
  if (!entry?.payload) return null;
  return instantiateTemplateSlide(entry.payload, order, lessonPath);
}

export function deckHasHaTemplateSlide(slides: PresentationSlide[], store: SlideTemplatesStore): boolean {
  const ha = getTemplatePayload(store, 'ha');
  if (!ha) return false;
  const haTitle = htmlToPlain(ha.titleHtml || ha.title || '').toLowerCase();
  return slides.some((s) => {
    const t = htmlToPlain(s.titleHtml || s.title || '').toLowerCase();
    return t.includes('hausaufgabe') || (haTitle && t === haTitle);
  });
}
