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

type ParsedSectionNumber = {
  major: number;
  minor: number;
  majorWidth: number;
  minorWidth: number;
};

function parseSectionNumber(name: string): ParsedSectionNumber | null {
  const match = name.trim().match(/^(\d+)\.(\d+)\b/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    majorWidth: match[1].length,
    minorWidth: match[2].length,
  };
}

/** Nächste Nummer im bestehenden Schema (1.2 → 1.3, 01.05 → 01.06). */
export function nextNumberedSectionName(slides: PresentationSlide[]): string {
  const names: string[] = [];
  let prev = '';
  for (const slide of sortSlides(slides)) {
    const name = slideSectionName(slide);
    if (name && name !== prev) {
      names.push(name);
      prev = name;
    }
  }
  const parsed = names
    .map(parseSectionNumber)
    .filter((row): row is ParsedSectionNumber => Boolean(row));
  if (!parsed.length) return '1.0';
  const last = parsed[parsed.length - 1];
  const sameMajor = parsed.filter((row) => row.major === last.major);
  const nextMinor = Math.max(...sameMajor.map((row) => row.minor)) + 1;
  const majorWidth = Math.max(...sameMajor.map((row) => row.majorWidth));
  const minorWidth = Math.max(...sameMajor.map((row) => row.minorWidth));
  return `${String(last.major).padStart(majorWidth, '0')}.${String(nextMinor).padStart(minorWidth, '0')}`;
}

export function sectionRunEnd(slides: PresentationSlide[], startIndex: number): number {
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

export function sectionRunRange(
  slides: PresentationSlide[],
  atIndex: number,
): { start: number; end: number } {
  const sorted = sortSlides(slides);
  if (atIndex < 0 || atIndex >= sorted.length) return { start: atIndex, end: atIndex };
  const name = slideSectionName(sorted[atIndex]);
  let start = atIndex;
  while (start > 0 && slideSectionName(sorted[start - 1]) === name) start -= 1;
  return { start, end: sectionRunEnd(sorted, start) };
}

export function removeSlideSection(
  slides: PresentationSlide[],
  atIndex: number,
): { slides: PresentationSlide[]; removed: PresentationSlide[] } | null {
  const sorted = sortSlides(slides);
  const { start, end } = sectionRunRange(sorted, atIndex);
  if (start < 0 || end <= start) return null;
  if (sorted.length - (end - start) < 1) return null;
  const removed = sorted.slice(start, end);
  const next = sorted
    .filter((_, index) => index < start || index >= end)
    .map((slide, index) => ({ ...slide, order: index }));
  return { slides: next, removed };
}
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
