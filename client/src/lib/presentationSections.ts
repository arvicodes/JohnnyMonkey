import type { PresentationSlide } from './presentationDeck';
import { sortSlides } from './presentationDeck';

export function slideSectionName(slide: PresentationSlide | null | undefined): string {
  return (slide?.sourceLessonName || '').trim();
}

export function nextUntitledSectionName(slides: PresentationSlide[]): string {
  const used = new Set(slides.map(slideSectionName).filter(Boolean));
  if (!used.has('Unterkapitel')) return 'Unterkapitel';
  let n = 2;
  while (used.has(`Unterkapitel ${n}`)) n += 1;
  return `Unterkapitel ${n}`;
}

function sectionRunEnd(slides: PresentationSlide[], startIndex: number): number {
  const name = slideSectionName(slides[startIndex]);
  let end = startIndex + 1;
  while (end < slides.length && slideSectionName(slides[end]) === name) end += 1;
  return end;
}

/** Benennt den Lauf ab startIndex (gleiche bisherige Bezeichnung). */
export function renameSlideSection(
  slides: PresentationSlide[],
  startIndex: number,
  newName: string,
): PresentationSlide[] {
  const sorted = sortSlides(slides);
  if (startIndex < 0 || startIndex >= sorted.length) return sorted;
  const label = newName.trim();
  const end = sectionRunEnd(sorted, startIndex);
  return sorted.map((slide, index) =>
    index >= startIndex && index < end ? { ...slide, sourceLessonName: label } : slide,
  );
}

/** Neues Unterkapitel ab dieser Folie bis zum Ende des bisherigen Laufs. */
export function splitSlideSectionAt(
  slides: PresentationSlide[],
  atIndex: number,
  newName: string,
): PresentationSlide[] {
  const sorted = sortSlides(slides);
  if (atIndex < 0 || atIndex >= sorted.length) return sorted;
  const label = newName.trim() || nextUntitledSectionName(sorted);
  const end = sectionRunEnd(sorted, atIndex);
  return sorted.map((slide, index) =>
    index >= atIndex && index < end ? { ...slide, sourceLessonName: label } : slide,
  );
}
