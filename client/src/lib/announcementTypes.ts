export type AnnouncementLink = {
  label: string;
  url: string;
};

export type AnnouncementImage = {
  url: string;
  caption?: string;
};

export type AnnouncementLayoutId =
  | 'hero'
  | 'magazine'
  | 'gallery'
  | 'accent'
  | 'mosaic'
  | 'grid2'
  | 'grid3'
  | 'strip'
  | 'stack';

export type AnnouncementListItem = {
  id: string;
  title: string;
  body: string;
  links: AnnouncementLink[];
  images?: AnnouncementImage[];
  layoutId?: AnnouncementLayoutId | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  readCount: number;
  isPublished: boolean;
  fromFolder?: boolean;
  folderSlug?: string;
  folderPath?: string;
};

export type AnnouncementFeedItem = {
  id: string;
  title: string;
  body: string;
  links: AnnouncementLink[];
  images?: AnnouncementImage[];
  layoutId?: AnnouncementLayoutId | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  isRead: boolean;
  fromFolder?: boolean;
  folderSlug?: string;
  folderPath?: string;
};

export type AnnouncementDashboardSession = {
  id: string;
  title: string;
  authorName: string;
  isRead: boolean;
};

export function formatAnnouncementDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
