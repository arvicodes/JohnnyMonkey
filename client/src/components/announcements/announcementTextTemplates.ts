import type { AnnouncementLayoutId } from '../../lib/announcementTypes';
import type { AnnouncementKind, AnnouncementRealm } from './announcementKinds';
import {
  SCHULE_ELTERNBRIEF_KLASSENFAHRT_BODY,
  SCHULE_FLYER_CALISTHENICS_BODY,
  SCHULE_KURZANKUENDIGUNG_WANDERTAG_BODY,
  VEREIN_ELTERNBRIEF_WANDERTAG_BODY,
  VEREIN_FLYER_KURS_BODY,
} from './announcementTemplateBodies';
import { VEREIN_PROTOKOLL_VORSTAND_BODY } from './vereinProtokollTemplateHtml';

export type AnnouncementTextTemplate = {
  id: string;
  realm: AnnouncementRealm;
  kind: AnnouncementKind;
  name: string;
  suggestedTitle: string;
  bodyHtml: string;
  suggestedLayoutId?: AnnouncementLayoutId;
  sourceDocxUrl?: string;
  /** VfL-Briefkopf (Logo + Vereinsname) im Editor */
  vflLetterhead?: boolean;
};

export const ANNOUNCEMENT_TEXT_TEMPLATES: AnnouncementTextTemplate[] = [
  {
    id: 'verein-protokoll-vorstand',
    realm: 'verein',
    kind: 'protokoll',
    name: 'Protokoll – Vorstandssitzung',
    suggestedTitle: 'Protokoll Vorstandssitzung vom 29.02.2024',
    sourceDocxUrl: '/announcement-vorlagen/verein/vorstandssitzung.docx',
    bodyHtml: VEREIN_PROTOKOLL_VORSTAND_BODY,
    vflLetterhead: true,
  },
  {
    id: 'verein-elternbrief-wandertag',
    realm: 'verein',
    kind: 'elternbrief',
    name: 'Elternbrief – Vereinswandertag',
    suggestedTitle: 'Vereinswandertag 2024 – Einladung',
    bodyHtml: VEREIN_ELTERNBRIEF_WANDERTAG_BODY,
    vflLetterhead: true,
  },
  {
    id: 'verein-flyer-kurs',
    realm: 'verein',
    kind: 'flyer',
    name: 'Flyer – Kurs / Termin',
    suggestedTitle: 'Neues Kursangebot – VfL Lahnstein',
    suggestedLayoutId: 'hero',
    bodyHtml: VEREIN_FLYER_KURS_BODY,
  },
  {
    id: 'schule-elternbrief-klassenfahrt',
    realm: 'schule',
    kind: 'elternbrief',
    name: 'Elternbrief – Klassenfahrt',
    suggestedTitle: 'Klassenfahrt 9c nach Oberammergau im Mai',
    suggestedLayoutId: 'magazine',
    sourceDocxUrl: '/announcement-vorlagen/schule/klassenfahrt-elternbrief.docx',
    bodyHtml: SCHULE_ELTERNBRIEF_KLASSENFAHRT_BODY,
  },
  {
    id: 'schule-kurzankuendigung-wandertag',
    realm: 'schule',
    kind: 'kurzankuendigung',
    name: 'Ankündigung – Wandertag',
    suggestedTitle: 'Wandertag am 19. Juli 2023',
    suggestedLayoutId: 'accent',
    sourceDocxUrl: '/announcement-vorlagen/schule/wandertag.docx',
    bodyHtml: SCHULE_KURZANKUENDIGUNG_WANDERTAG_BODY,
  },
  {
    id: 'schule-flyer-calisthenics',
    realm: 'schule',
    kind: 'flyer',
    name: 'Flyer – Calisthenics-AG',
    suggestedTitle: 'Die neue Calisthenics-AG am Johnny!',
    suggestedLayoutId: 'hero',
    bodyHtml: SCHULE_FLYER_CALISTHENICS_BODY,
  },
];

export function findAnnouncementTemplate(
  realm: AnnouncementRealm,
  kind: AnnouncementKind,
): AnnouncementTextTemplate | undefined {
  return ANNOUNCEMENT_TEXT_TEMPLATES.find((t) => t.realm === realm && t.kind === kind);
}

export function getAnnouncementTextTemplateById(id: string): AnnouncementTextTemplate | undefined {
  return ANNOUNCEMENT_TEXT_TEMPLATES.find((t) => t.id === id);
}

export function isProtokollTemplate(template: AnnouncementTextTemplate | undefined): boolean {
  return template?.kind === 'protokoll' && template.realm === 'verein';
}

export function usesVflLetterhead(template: AnnouncementTextTemplate | undefined): boolean {
  return Boolean(template?.vflLetterhead);
}
