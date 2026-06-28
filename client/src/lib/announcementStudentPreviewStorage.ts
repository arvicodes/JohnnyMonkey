import type { AnnouncementStudentDisplayItem } from '../components/announcements/AnnouncementStudentDetailContent';

export const ANNOUNCEMENT_STUDENT_PREVIEW_STORAGE_KEY = 'jm-announcement-student-preview';

type StoredStudentPreview = {
  item: AnnouncementStudentDisplayItem;
  savedAt: number;
};

export function saveAnnouncementStudentPreview(item: AnnouncementStudentDisplayItem): void {
  const payload: StoredStudentPreview = { item, savedAt: Date.now() };
  sessionStorage.setItem(ANNOUNCEMENT_STUDENT_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
}

export function loadAnnouncementStudentPreview(): AnnouncementStudentDisplayItem | null {
  try {
    const raw = sessionStorage.getItem(ANNOUNCEMENT_STUDENT_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredStudentPreview;
    if (!parsed?.item || typeof parsed.item.title !== 'string') return null;
    return parsed.item;
  } catch {
    return null;
  }
}

export function openAnnouncementStudentPreviewTab(item: AnnouncementStudentDisplayItem): void {
  saveAnnouncementStudentPreview(item);
  window.open('/ankuendigungen/schuelervorschau', '_blank', 'noopener,noreferrer');
}
