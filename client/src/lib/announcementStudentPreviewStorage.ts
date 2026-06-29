import type { AnnouncementStudentDisplayItem } from '../components/announcements/AnnouncementStudentDetailContent';

export const ANNOUNCEMENT_STUDENT_PREVIEW_STORAGE_KEY = 'jm-announcement-student-preview';

type StoredStudentPreview = {
  item: AnnouncementStudentDisplayItem;
  savedAt: number;
};

export function saveAnnouncementStudentPreview(item: AnnouncementStudentDisplayItem): void {
  const payload: StoredStudentPreview = { item, savedAt: Date.now() };
  const json = JSON.stringify(payload);
  // localStorage: im neuen Tab lesbar (sessionStorage ist tab-isoliert)
  localStorage.setItem(ANNOUNCEMENT_STUDENT_PREVIEW_STORAGE_KEY, json);
  sessionStorage.setItem(ANNOUNCEMENT_STUDENT_PREVIEW_STORAGE_KEY, json);
}

export function loadAnnouncementStudentPreview(): AnnouncementStudentDisplayItem | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(ANNOUNCEMENT_STUDENT_PREVIEW_STORAGE_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredStudentPreview;
      if (!parsed?.item || typeof parsed.item.title !== 'string') continue;
      return parsed.item;
    } catch {
      /* try next store */
    }
  }
  return null;
}

export function openAnnouncementStudentPreviewTab(item: AnnouncementStudentDisplayItem): void {
  saveAnnouncementStudentPreview(item);
  window.open('/ankuendigungen/schuelervorschau', '_blank', 'noopener,noreferrer');
}
