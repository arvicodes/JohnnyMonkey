import { JOHNNY_PRESENTATION } from './presentationTheme';
import {
  DECK_FILENAME,
  loadJsonFile,
  normalizeDeck,
  saveJsonFile,
  sortSlides,
  type PresentationDeck,
  type PresentationSlide,
} from './presentationDeck';
import { instantiateTemplateSlide, type SlideTemplatePayload } from './presentationSlideTemplates';
import { folderPathBasename, isNumberedWochenaufgabeName } from './wochenaufgabenFolder';

function emptyTitleContentPayload(title: string): SlideTemplatePayload {
  const titleHtml = title.trim() ? `<p>${title}</p>` : '<p><br></p>';
  return {
    layout: 'title-content',
    title: title.trim() ? title : '',
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
    titleHtml,
    bodyHtml: '<p><br></p>',
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
  };
}

function makeEmptyTitleContentSlide(
  order: number,
  lessonPath: string,
  title: string,
): PresentationSlide {
  const slide = instantiateTemplateSlide(emptyTitleContentPayload(title), order, lessonPath);
  if (title.trim()) return slide;
  return {
    ...slide,
    title: '',
    titleHtml: '<p><br></p>',
    body: '',
    bodyHtml: '<p><br></p>',
  };
}

export function buildWochenaufgabeDeck(lessonPath: string): PresentationDeck {
  const number = folderPathBasename(lessonPath);
  const title = isNumberedWochenaufgabeName(number)
    ? `Wochenaufgabe ${number}`
    : 'Wochenaufgabe';
  return normalizeDeck({
    version: 1,
    title,
    lessonPath,
    updatedAt: new Date().toISOString(),
    defaultTransition: 'fade',
    showSlideNumbers: true,
    showSlideFooter: true,
    slides: [makeEmptyTitleContentSlide(0, lessonPath, '')],
  });
}

/** Eigene 1-Folien-Präsentation. */
export async function ensureWochenaufgabeDeck(lessonPath: string): Promise<PresentationDeck> {
  const path = `${lessonPath.replace(/\\/g, '/').replace(/\/+$/, '')}/${DECK_FILENAME}`;
  const loaded = await loadJsonFile<PresentationDeck>(path);
  if (loaded?.slides?.length) {
    return normalizeDeck({
      ...loaded,
      lessonPath,
      slides: sortSlides(loaded.slides),
    });
  }
  if (loaded) {
    throw new Error(
      'Präsentationsdatei ist leer oder beschädigt. Bestehende Datei wurde nicht überschrieben.',
    );
  }
  const deck = buildWochenaufgabeDeck(lessonPath);
  await saveJsonFile(lessonPath, DECK_FILENAME, deck);
  return deck;
}

export const INITIAL_WOCHENAUFGABE_NUMBERS = [1, 2];
