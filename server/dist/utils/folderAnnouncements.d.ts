export declare const FOLDER_ANNOUNCEMENT_AUTHOR_ID = "folder";
type FolderAnnouncementJson = {
    id?: string;
    title?: string;
    body?: string;
    authorName?: string;
    published?: boolean;
    publishedAt?: string | null;
    updatedAt?: string;
    readBy?: string[];
    links?: Array<{
        label?: string;
        url?: string;
        path?: string;
    }>;
    images?: Array<{
        url?: string;
        caption?: string;
    }>;
    layoutId?: string;
};
export type FolderAnnouncementListItem = {
    id: string;
    title: string;
    body: string;
    links: Array<{
        label: string;
        url: string;
    }>;
    images: Array<{
        url: string;
        caption?: string;
    }>;
    layoutId: string | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    readCount: number;
    isPublished: boolean;
    fromFolder: true;
    folderSlug: string;
    folderPath: string;
};
export type FolderAnnouncementFeedItem = {
    id: string;
    title: string;
    body: string;
    links: Array<{
        label: string;
        url: string;
    }>;
    images: Array<{
        url: string;
        caption?: string;
    }>;
    layoutId: string | null;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
    authorId: string;
    authorName: string;
    isRead: boolean;
    fromFolder: true;
    folderSlug: string;
};
export declare const folderRelativePath: (folderSlug: string) => string;
export declare const staticMaterialUrl: (relativePath: string) => string;
/** HTML-Flyer → In-App-Ansicht (Bilder & Druck zuverlässig) */
export declare const flyerAppUrl: (folderSlug: string) => string;
export declare const sanitizeFolderName: (raw: string) => string;
/** Findet Ankündigungen & Briefe (macOS NFD/NFC-tolerant) */
export declare const resolveBriefeRootPath: () => string | null;
/** Wie resolveBriefeRootPath, legt den Ordner bei Bedarf an */
export declare const ensureBriefeRootPath: () => string;
export declare const loadFolderAnnouncements: () => FolderAnnouncementFeedItem[];
/** Lehrkraft: alle Ordner mit announcement.json (Entwurf + live) */
export declare const loadFolderAnnouncementListItems: () => FolderAnnouncementListItem[];
export declare const readFolderAnnouncement: (folderSlug: string) => FolderAnnouncementJson | null;
export declare const createFolderAnnouncement: (opts: {
    title: string;
    folderName?: string;
    body?: string;
    authorName: string;
}) => FolderAnnouncementListItem;
export declare const updateFolderAnnouncement: (folderSlug: string, updates: {
    title?: string;
    body?: string;
    links?: Array<{
        label: string;
        url?: string;
        path?: string;
    }>;
    images?: Array<{
        url: string;
        caption?: string;
    }>;
    layoutId?: string | null;
}) => FolderAnnouncementListItem;
export declare const setFolderAnnouncementPublished: (folderSlug: string, published: boolean) => FolderAnnouncementListItem;
export declare const deleteFolderAnnouncement: (folderSlug: string) => void;
export declare const markFolderAnnouncementRead: (folderSlug: string, announcementId: string, userId: string) => boolean;
export declare const getFolderAnnouncementReadIds: (userId: string) => Set<string>;
export declare const findFolderSlugByAnnouncementId: (announcementId: string) => string | null;
export type FlyerPreviewMode = 'default' | 'embed' | 'fullscreen';
/** Liest HTML-Flyer aus Ankündigungs-Ordner (mit Base-Tag für Bilder) */
export declare const readFolderFlyerHtml: (folderSlug: string, previewMode?: FlyerPreviewMode) => string | null;
export declare const readFolderFlyerDesign: (folderSlug: string) => unknown | null;
export declare const saveFolderFlyerStudio: (folderSlug: string, html: string, document: unknown) => void;
export declare const saveFolderAnnouncementImage: (folderSlug: string, buffer: Buffer, originalName: string) => {
    url: string;
    filename: string;
};
export {};
//# sourceMappingURL=folderAnnouncements.d.ts.map