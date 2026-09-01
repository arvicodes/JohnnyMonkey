import {
  htmlToPlain,
  normalizeSlide,
  textToHtml,
  type SlideElement,
} from './presentationDeck';
import { loadJsonFile, type PresentationSlide } from './presentationDeck';
import { JOHNNY_PRESENTATION } from './presentationTheme';
import { patchBildTemplateHeroElements, SLIDE_HERO_IMAGE_HEIGHT_PCT } from './presentationImageUtils';
import { ENTRY_TICKET_SLIDE_HREF } from './presentationEditorUi';

export const SLIDE_TEMPLATES_FILENAME = 'Folienvorlagen.json';

export type SlideTemplateKind =
  | 'start'
  | 'auftrag'
  | 'sicherung'
  | 'bild'
  | 'ha'
  | 'ende'
  | 'link'
  | 'referenz'
  | 'leinwand';

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
  { kind: 'sicherung', label: 'Sicherung', shortLabel: 'Si', hint: 'Sicherung / Merksatz' },
  { kind: 'bild', label: 'Bild', shortLabel: 'B', hint: 'Vollbild ohne Text — Bild reinziehen' },
  { kind: 'ha', label: 'Hausaufgabe', shortLabel: 'HA', hint: 'HA-Folie (immer mit HA-Bild)' },
  { kind: 'ende', label: 'Ende', shortLabel: 'E', hint: 'Abschlussfolie' },
  { kind: 'link', label: 'Link', shortLabel: '▶', hint: 'Video im Vollbild (YouTube, MP4 …)' },
  { kind: 'referenz', label: 'Referenz', shortLabel: '↗', hint: 'Webseite einbetten, zoombar (z. B. Wall of Fame)' },
  {
    kind: 'leinwand',
    label: 'Leinwand',
    shortLabel: 'L',
    hint: 'Gemeinsame Leinwand dieser Stunde einbetten (ohne URL tippen)',
  },
];

/** URL für eingebettete Stunden-Leinwand (Referenz-/Leinwand-Folie). */
export function buildLessonSharedOverviewUrl(groupId: string, lessonPath: string): string {
  const qs = new URLSearchParams();
  qs.set('groupId', (groupId || '').trim());
  qs.set('lessonPath', (lessonPath || '').trim());
  return `/shared-overview?${qs.toString()}`;
}

/** Standard-Reihenfolge neuer Stunden-Foliensätze (HA = Vorlage „Perfekt“ inkl. Abschluss). */
export const DEFAULT_LESSON_SLIDE_TEMPLATE_KINDS: SlideTemplateKind[] = [
  'start',
  'auftrag',
  'ha',
];

const GRAFIKEN_TOKEN = '__GRAFIKEN__';

/** Stabiles Merkmal für den Entry-Ticket-Button auf der Startfolie. */
export const START_ENTRY_TICKET_ELEMENT_ID = 'tpl-start-entry-ticket';

/** Blauer „E“-Button (rechts oben) — Link wird zur Laufzeit zur Stunden-URL aufgelöst. */
export function createStartEntryTicketButtonElement(): SlideElement {
  return {
    id: START_ENTRY_TICKET_ELEMENT_ID,
    type: 'text',
    x: 90.2,
    y: 2.2,
    w: 7.6,
    h: 10.5,
    zIndex: 40,
    stackLayer: 'foreground',
    html:
      `<p style="text-align:center;margin:0;line-height:1">` +
      `<a href="${ENTRY_TICKET_SLIDE_HREF}" data-pres-entry-ticket="1" ` +
      `title="Entry Ticket dieser Stunde" ` +
      `style="display:flex;align-items:center;justify-content:center;` +
      `width:100%;height:100%;min-height:52px;border-radius:12px;` +
      `background:linear-gradient(135deg,#1e88e5 0%,#3949ab 100%);` +
      `color:#fff !important;text-decoration:none;font-weight:800;` +
      `font-size:42px;border:2px solid rgba(33,150,243,0.55);` +
      `box-sizing:border-box;box-shadow:0 2px 8px rgba(25,118,210,0.28)">E</a></p>`,
  };
}

export function slideHasEntryTicketButton(slide: PresentationSlide | SlideElement[] | null | undefined): boolean {
  const elements = Array.isArray(slide) ? slide : slide?.elements;
  return (elements || []).some((el) => {
    if (el.id === START_ENTRY_TICKET_ELEMENT_ID || String(el.id || '').includes('start-entry-ticket')) {
      return true;
    }
    const html = el.html || '';
    return html.includes('data-pres-entry-ticket') || html.includes('jm=lesson-entry');
  });
}

/** Stellt sicher, dass die Start-Vorlage den E-Button enthält (auch bei gespeicherten Overrides). */
export function ensureStartEntryTicketButton(
  elements: SlideElement[] | undefined | null,
): SlideElement[] {
  const list = [...(elements || [])];
  if (slideHasEntryTicketButton(list)) return list;
  return [...list, createStartEntryTicketButtonElement()];
}

/**
 * Bestehende Titelfolien (Start-Layout) ohne E-Button nachrüsten —
 * damit ältere Decks den Entry-Ticket-Button sofort haben.
 */
export function ensureEntryTicketButtonsOnTitleSlides(
  slides: PresentationSlide[],
): PresentationSlide[] {
  let changed = false;
  const next = slides.map((slide) => {
    if (slide.layout !== 'title-slide') return slide;
    if (slideHasEntryTicketButton(slide)) return slide;
    changed = true;
    return {
      ...slide,
      elements: ensureStartEntryTicketButton(slide.elements),
    };
  });
  return changed ? next : slides;
}

/**
 * Gemeinsamer Grafiken-Ordner (HA.png, Endroboter, Folienvorlagen.json / „Perfekt“).
 * `git-intern/…`-Stundenpfade enthalten kein „J-M-Reihen“ — sonst würde fälschlich
 * `Kapitel/Grafiken` genommen und neue Stunden bekämen die Builtin-Vorlage
 * statt `J-M-Reihen/Grafiken/Folienvorlagen.json`.
 */
export function grafikenFolderPath(lessonPath: string): string {
  const p = (lessonPath || '').replace(/\\/g, '/').replace(/\/$/, '');

  const absJm = p.match(/^(.*\/J-M-Reihen)(?:\/|$)/);
  if (absJm) return `${absJm[1]}/Grafiken`;

  if (p === 'J-M-Reihen' || p.startsWith('J-M-Reihen/')) {
    return 'J-M-Reihen/Grafiken';
  }

  if (p === 'git-intern' || p.startsWith('git-intern/')) {
    return 'git-intern/Grafiken';
  }

  const parent = p.replace(/\/[^/]+$/, '') || p;
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
  if (file === 'HA.png' || file === 'Kreis.png' || file === 'Endroboter.png') {
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
  if (file === 'HA.png' || file === 'Kreis.png' || file === 'Endroboter.png') {
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
  const { id: _id, order: _order, audioTrack: _audio, screenTrack: _screen, ...rest } = normalized;
  return {
    ...rest,
    elements: remapElementsForTemplate(rest.elements, grafikenPath),
    imagePath: rest.imagePath
      ? tokenizeGrafikenPath(rest.imagePath, grafikenPath)
      : rest.imagePath,
  };
}

function builtinTemplates(): SlideTemplatesStore['templates'] {
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
      elements: [createStartEntryTicketButtonElement()],
      transition: 'fade',
      revealEnabled: true,
      zoneRevealSteps: {},
    },
    auftrag: {
      layout: 'blank',
      title: '',
      body: '',
      speakerNotes: "",
      preparationNotes: '',
      materialNotes: '',
      subtitle: '',
      bodyLeft: '',
      bodyRight: '',
      imagePath: '',
      imageCaption: '',
      bodyStyle: 'plain',
      titleAlign: 'left',
      accentColor: '#2E7D32',
      titleHtml: '',
      bodyHtml: '',
      subtitleHtml: '',
      bodyLeftHtml: '',
      bodyRightHtml: '',
      imageCaptionHtml: '',
      speakerNotesHtml: "<p><br></p>",
      preparationHtml: '',
      materialHtml: '',
      elements: [
        {
          id: 'tpl-auftrag-card',
          type: 'card',
          x: 82.15857144406507,
          y: 67.06377484309624,
          w: 16.18731186828703,
          h: 24.687892259414223,
          zIndex: 1,
          strokeColor: "#2E7D32",
          strokeWidth: 2.5,
          fillColor: "rgba(46,125,50,0.14)",
          titleHtml: "<p style=\"text-align:center\"><strong>Arbeitsauftrag</strong></p>",
          html: "<p style=\"text-align: justify;\"><b>Mathebuch:</b></p><p style=\"text-align: justify;\">Seite , Nummer</p>",
          stackLayer: 'foreground',
        },
      ],
      transition: 'fade',
      revealEnabled: true,
      zoneRevealSteps: {},
      hiddenLayoutZones: ['bodyHtml'],
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
    bild: {
      layout: 'blank',
      title: '',
      body: '',
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
      titleHtml: '',
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
          id: 'tpl-bild-img',
          type: 'image',
          x: 0,
          y: 0,
          w: 100,
          h: SLIDE_HERO_IMAGE_HEIGHT_PCT,
          src: '',
          zIndex: 1,
          revealStep: 0,
          stackLayer: 'background',
          imageFit: 'cover',
        },
      ],
      transition: 'fade',
      revealEnabled: true,
      zoneRevealSteps: {},
    },
    /** Standard-HA („Perfekt“): Infobox + HA-Icon + Endroboter + Abschied. */
    ha: {
      layout: 'blank',
      title: 'Hausaufgabe',
      body: '',
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
        '<p><span data-pres-color="#1a1a2e" style="color: rgb(26, 26, 46) !important;">Hausaufgabe</span></p><p><span data-pres-color="#1a1a2e" style="color: rgb(26, 26, 46) !important;"><br></span></p>',
      bodyHtml: '<p><br></p>',
      subtitleHtml: '',
      bodyLeftHtml: '',
      bodyRightHtml: '',
      imageCaptionHtml: '',
      speakerNotesHtml: '<p><br></p>',
      preparationHtml: '<p><br></p>',
      materialHtml: '<p><br></p>',
      elements: [
        {
          id: 'tpl-ha-img',
          type: 'image',
          x: 34.82752190813671,
          y: 9.81815147429894,
          w: 6.234590934783087,
          h: 7.532135501524438,
          src: `${GRAFIKEN_TOKEN}/HA.png`,
          zIndex: 1,
          revealStep: 0,
          imageFit: 'contain',
        },
        {
          id: 'tpl-ha-bye-text',
          type: 'text',
          x: 81.35841393849206,
          y: 88.3222828483245,
          w: 18.641586061507937,
          h: 6.796626984126986,
          html: '<p><span style="font-weight: 700; text-align: center; background-color: rgb(255, 255, 255);">Bis zur nächsten Stunde!</span></p>',
          zIndex: 2,
        },
        {
          id: 'tpl-ha-endroboter',
          type: 'image',
          x: 76.0521128429198,
          y: 60.259519334795975,
          w: 26.615334494745305,
          h: 33.21916135335253,
          src: `${GRAFIKEN_TOKEN}/Endroboter.png`,
          zIndex: 3,
          imageFit: 'contain',
        },
        {
          id: 'tpl-ha-card',
          type: 'card',
          x: 1.85512377684924,
          y: 9.129772046836543,
          w: 39.206989066070555,
          h: 45.847606628756274,
          zIndex: 5,
          strokeColor: '#EF6C00',
          strokeWidth: 2.5,
          fillColor: 'rgba(239,108,0,0.14)',
          titleHtml:
            '<p style="text-align:center"><strong>Hausaufgabe</strong></p><p style="text-align:center"><strong><br></strong></p>',
          html: '<p style="text-align: justify;"><b>Mathebuch:</b></p><p style="text-align: justify;">Seite , Nummer</p>',
          stackLayer: 'foreground',
        },
      ],
      transition: 'zoom',
      revealEnabled: true,
      zoneRevealSteps: {},
      homeworkSubmissionRequired: true,
      hiddenLayoutZones: ['bodyHtml'],
    },
    ende: {
      layout: 'title-slide',
      title: 'Bis zur nächsten Stunde!',
      body: '',
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
      titleHtml: '<p>Bis zur nächsten Stunde!</p>',
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
          id: 'tpl-ende-img',
          type: 'image',
          x: 37,
          y: 28,
          w: 26,
          h: 40,
          src: `${GRAFIKEN_TOKEN}/Endroboter.png`,
          zIndex: 1,
          imageFit: 'contain',
        },
      ],
      transition: 'fade',
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
    leinwand: {
      layout: 'blank',
      title: 'Leinwand',
      body: '',
      speakerNotes: 'Gemeinsame Leinwand dieser Stunde (URL wird beim Einfügen gesetzt).',
      preparationNotes: '',
      materialNotes: '',
      subtitle: '',
      bodyLeft: '',
      bodyRight: '',
      imagePath: '',
      imageCaption: '',
      bodyStyle: 'plain',
      titleAlign: 'left',
      accentColor: '#2e7d32',
      titleHtml: '<p>Leinwand</p>',
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
          id: 'tpl-leinwand-embed',
          type: 'embed',
          x: 0,
          y: 0,
          w: 100,
          h: 93,
          src: '',
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
  const templates = { ...builtins, ...raw.templates };
  if (templates.bild) {
    templates.bild = {
      ...templates.bild,
      elements: patchBildTemplateHeroElements(templates.bild.elements),
    };
  }
  if (templates.start) {
    templates.start = {
      ...templates.start,
      elements: ensureStartEntryTicketButton(templates.start.elements),
    };
  }

  let custom = Array.isArray(raw.custom)
    ? raw.custom.filter((t) => t?.id && t?.label && t?.payload)
    : [];

  // Alte Custom-Vorlage „Ende“ (shortLabel „End“) in builtin ende übernehmen, Doppel vermeiden
  const endeIdx = custom.findIndex((t) => /^ende$/i.test((t.label || '').trim()));
  if (endeIdx >= 0) {
    const endeCustom = custom[endeIdx];
    if (!raw.templates?.ende && endeCustom.payload) {
      templates.ende = {
        ...endeCustom.payload,
        elements: (endeCustom.payload.elements || []).map((el) => {
          if (el.type !== 'image' || !el.src) return el;
          const file = el.src.replace(/\\/g, '/').split('/').pop() || '';
          if (/^Endroboter\.png$/i.test(file) || el.src.includes('/Grafiken/')) {
            return { ...el, src: `${GRAFIKEN_TOKEN}/${file}` };
          }
          return el;
        }),
      };
    }
    custom = custom.filter((_, i) => i !== endeIdx);
  }

  custom = custom.map((t) => {
    const short = (t.shortLabel || '').trim();
    if (short === 'End' || /^end$/i.test(short)) {
      return { ...t, shortLabel: shortLabelFromTemplateName(t.label) };
    }
    return t;
  });

  return {
    version: 2,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    templates,
    custom,
  };
}

export function shortLabelFromTemplateName(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  if (/^ende$/i.test(t)) return 'E';
  if (/^end$/i.test(t)) return 'E';
  if (t.length <= 2) return t.toUpperCase();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase().slice(0, 3);
  }
  // Ein Wort: erster Buchstabe (Ende → E, nicht „End“)
  return (t[0] || '?').toUpperCase();
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
  let loaded: SlideTemplatesStore | null = null;
  try {
    loaded = await loadJsonFile<SlideTemplatesStore>(path);
  } catch {
    return createDefaultTemplatesStore();
  }
  if (loaded?.templates && typeof loaded.templates === 'object') {
    return normalizeTemplatesStore(loaded);
  }
  const defaults = createDefaultTemplatesStore();
  // Only write defaults when the templates file is truly missing (404 → null).
  if (loaded === null) {
    try {
      await saveSlideTemplates(lessonPath, defaults);
    } catch {
      /* Grafiken-Ordner evtl. noch nicht beschreibbar */
    }
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
  const slide = instantiateTemplateSlide(payload, order, lessonPath);
  if (kind === 'start') {
    return {
      ...slide,
      elements: ensureStartEntryTicketButton(slide.elements),
    };
  }
  if (kind === 'ha' && slide.homeworkSubmissionRequired === undefined) {
    return { ...slide, homeworkSubmissionRequired: true };
  }
  return slide;
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

/** Erkennt die Hausaufgaben-Folie (HA-Vorlage mit HA.png). */
export function isHomeworkSlide(slide: PresentationSlide): boolean {
  return (slide.elements ?? []).some((el) => {
    if (el.type !== 'image' || !el.src) return false;
    const src = el.src.replace(/\\/g, '/');
    return /(?:^|\/)HA\.png$/i.test(src) || src.includes(`${GRAFIKEN_TOKEN}/HA.png`);
  });
}

/** SuS dürfen hochladen, solange „Abgabe nötig“ nicht explizit aus ist. */
export function isHomeworkSubmissionRequired(slide: PresentationSlide | null | undefined): boolean {
  if (!slide) return false;
  return slide.homeworkSubmissionRequired !== false;
}

export function findHomeworkSlides(slides: PresentationSlide[]): PresentationSlide[] {
  const withBadge = slides.filter(isHomeworkSlide);
  if (withBadge.length > 0) return withBadge;
  // Fallback: Titel beginnt mit „Hausaufgabe“ (ältere Folien ohne HA.png)
  return slides.filter((s) => {
    const t = htmlToPlain(s.titleHtml || s.title || '').trim().toLowerCase();
    return t.startsWith('hausaufgabe');
  });
}

export function deckHasHaTemplateSlide(slides: PresentationSlide[], store: SlideTemplatesStore): boolean {
  if (findHomeworkSlides(slides).length > 0) return true;
  const ha = getTemplatePayload(store, 'ha');
  if (!ha) return false;
  const haTitle = htmlToPlain(ha.titleHtml || ha.title || '').toLowerCase();
  if (!haTitle) return false;
  return slides.some((s) => {
    const t = htmlToPlain(s.titleHtml || s.title || '').toLowerCase();
    return t === haTitle;
  });
}

/** Virtueller Abgabe-Schlüssel für Präsentations-Hausaufgaben (kein H_*-File nötig). */
export function presentationHomeworkAssignmentKey(lessonPath: string): {
  fileName: string;
  filePath: string;
} {
  // Format bewusst beibehalten (absolut oder J-M-Reihen/…), damit Lehrer- und SuS-Abgaben denselben Schlüssel treffen.
  const normalized = lessonPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return {
    fileName: 'H_Hausaufgabe',
    filePath: `${normalized}/H_Hausaufgabe`,
  };
}
