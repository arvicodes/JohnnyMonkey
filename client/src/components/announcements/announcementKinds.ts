export type AnnouncementRealm = 'verein' | 'schule';

export type AnnouncementKind = 'protokoll' | 'elternbrief' | 'kurzankuendigung' | 'flyer';

export type AnnouncementKindOption = {
  id: AnnouncementKind;
  label: string;
};

export const ANNOUNCEMENT_REALM_OPTIONS: { id: AnnouncementRealm; label: string }[] = [
  { id: 'verein', label: 'Verein' },
  { id: 'schule', label: 'Schule' },
];

export const ANNOUNCEMENT_KINDS_BY_REALM: Record<AnnouncementRealm, AnnouncementKindOption[]> = {
  verein: [
    { id: 'protokoll', label: 'Protokolle' },
    { id: 'elternbrief', label: 'Elternbriefe' },
    { id: 'flyer', label: 'Flyer' },
  ],
  schule: [
    { id: 'elternbrief', label: 'Elternbriefe' },
    { id: 'kurzankuendigung', label: 'Ankündigungen' },
    { id: 'flyer', label: 'Flyer' },
  ],
};

export function defaultKindForRealm(realm: AnnouncementRealm): AnnouncementKind {
  return ANNOUNCEMENT_KINDS_BY_REALM[realm][0]?.id ?? 'elternbrief';
}
