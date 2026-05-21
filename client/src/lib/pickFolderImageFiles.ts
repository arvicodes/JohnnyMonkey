import { isLikelyImageFile } from './storyImageUtils';

const MAX_FOLDER_DEPTH = 6;

type PickerDirHandle = {
  kind: 'directory';
  entries: () => AsyncIterableIterator<[string, PickerDirHandle | PickerFileHandle]>;
};

type PickerFileHandle = {
  kind: 'file';
  getFile: () => Promise<File>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<PickerDirHandle>;
};

export function supportsDirectoryPicker(): boolean {
  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function';
}

async function collectImageFilesFromDirectoryHandle(
  handle: PickerDirHandle,
  depth: number,
): Promise<File[]> {
  if (depth > MAX_FOLDER_DEPTH) return [];
  const out: File[] = [];
  for await (const [, entry] of handle.entries()) {
    if (entry.kind === 'file') {
      const file = await entry.getFile();
      if (isLikelyImageFile(file)) out.push(file);
    } else if (entry.kind === 'directory') {
      out.push(...(await collectImageFilesFromDirectoryHandle(entry, depth + 1)));
    }
  }
  return out;
}

/** Finder-Ordnerauswahl (funktioniert in Safari besser als webkitdirectory). */
export async function pickFolderImageFilesViaDirectoryPicker(): Promise<File[]> {
  const pick = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!pick) return [];
  const dir = await pick({ mode: 'read' });
  return collectImageFilesFromDirectoryHandle(dir, 0);
}

type FsEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file: (success: (f: File) => void, error?: () => void) => void;
  createReader: () => { readEntries: (success: (e: FsEntry[]) => void, error?: () => void) => void };
};

function readAllEntries(reader: ReturnType<FsEntry['createReader']>): Promise<FsEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FsEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            resolve(all);
            return;
          }
          all.push(...batch);
          readBatch();
        },
        () => reject(new Error('Ordner konnte nicht gelesen werden')),
      );
    };
    readBatch();
  });
}

async function traverseEntry(entry: FsEntry, out: File[], depth: number): Promise<void> {
  if (depth > 6) return;
  if (entry.isFile) {
    await new Promise<void>((resolve) => {
      entry.file(
        (file) => {
          if (isLikelyImageFile(file)) out.push(file);
          resolve();
        },
        () => resolve(),
      );
    });
    return;
  }
  if (entry.isDirectory) {
    const entries = await readAllEntries(entry.createReader());
    for (const child of entries) {
      await traverseEntry(child, out, depth + 1);
    }
  }
}

export function dataTransferHasDirectory(dt: DataTransfer | null): boolean {
  if (!dt?.items?.length) return false;
  return Array.from(dt.items).some(
    (item) => item.kind === 'file' && !!(item.webkitGetAsEntry?.() as FsEntry | null)?.isDirectory,
  );
}

/** Ordner per Drag & Drop aus dem Finder (ohne „X Dateien hochladen?“ / „Zugriff erlauben?“). */
export async function collectImageFilesFromDataTransfer(dt: DataTransfer | null): Promise<File[]> {
  if (!dt) return [];
  const out: File[] = [];

  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== 'file') continue;
    const entry = item.webkitGetAsEntry?.() as FsEntry | null;
    if (entry) await traverseEntry(entry, out, 0);
  }

  if (!out.length && dt.files?.length) {
    for (let i = 0; i < dt.files.length; i++) {
      const f = dt.files[i];
      if (isLikelyImageFile(f)) out.push(f);
    }
  }
  return out;
}
