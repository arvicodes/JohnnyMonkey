export const WALL_OF_FAME_DIR = 'Wall-of-fame';
export const WALL_OF_FAME_GIT_PATH = `git-intern/${WALL_OF_FAME_DIR}`;
export const WALL_OF_FAME_SETTINGS_KEY = 'wall-of-fame-settings-v1';
/** Abstand zwischen Mosaik-Kacheln (Fuge) */
export const WALL_MOSAIC_GAP = 3;

export const WALL_CATEGORY_PALETTE = [
  '#ff9800',
  '#42a5f5',
  '#66bb6a',
  '#ab47bc',
  '#ef5350',
  '#26a69a',
  '#8d6e63',
  '#5c6bc0',
  '#ffa726',
  '#7e57c2',
] as const;

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.bmp',
  '.avif',
]);

export type WallOfFameImage = {
  id: string;
  path: string;
  filename: string;
  category: string;
  url: string;
};

export type WallOfFameCategory = {
  name: string;
  count: number;
};

export type WallOfFameSettings = {
  categoryOrder: string[];
  categoryColors: Record<string, string>;
  imageOrders: Record<string, string[]>;
};

export type WallPlacedImage = {
  image: WallOfFameImage;
  category: string;
  categoryIndex: number;
  slot: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MosaicGridMetrics = {
  count: number;
  cols: number;
  rows: number;
  gap: number;
  tileW: number;
  tileH: number;
};

type TreeNode = {
  name: string;
  path: string;
  type: 'directory' | 'file';
  extension?: string;
  children?: TreeNode[];
};

type ReadDirectoryResponse = {
  error?: string;
  root?: TreeNode;
};

function isImageFile(node: TreeNode): boolean {
  if (node.type !== 'file') return false;
  const ext = (node.extension || '').toLowerCase();
  if (ext && IMAGE_EXTENSIONS.has(ext)) return true;
  const dot = node.name.lastIndexOf('.');
  if (dot < 0) return false;
  return IMAGE_EXTENSIONS.has(node.name.slice(dot).toLowerCase());
}

export function defaultCategoryColor(index: number): string {
  return WALL_CATEGORY_PALETTE[index % WALL_CATEGORY_PALETTE.length];
}

export function getCategoryColor(
  name: string,
  index: number,
  settings: WallOfFameSettings,
): string {
  return settings.categoryColors[name] ?? defaultCategoryColor(index);
}

export function createDefaultSettings(categories: WallOfFameCategory[]): WallOfFameSettings {
  return {
    categoryOrder: categories.map((c) => c.name),
    categoryColors: Object.fromEntries(
      categories.map((c, i) => [c.name, defaultCategoryColor(i)]),
    ),
    imageOrders: {},
  };
}

export function mergeSettings(
  fetched: WallOfFameCategory[],
  saved: WallOfFameSettings | null,
): WallOfFameSettings {
  const defaults = createDefaultSettings(fetched);
  if (!saved) return defaults;

  const byName = new Map(fetched.map((c) => [c.name, c]));
  const categoryOrder: string[] = [];
  for (const name of saved.categoryOrder) {
    if (byName.has(name)) {
      categoryOrder.push(name);
      byName.delete(name);
    }
  }
  for (const c of fetched) {
    if (byName.has(c.name)) categoryOrder.push(c.name);
  }

  const categoryColors: Record<string, string> = { ...defaults.categoryColors };
  for (const name of categoryOrder) {
    if (saved.categoryColors[name]) categoryColors[name] = saved.categoryColors[name];
  }

  return {
    categoryOrder,
    categoryColors,
    imageOrders: saved.imageOrders ?? {},
  };
}

export function orderCategories(
  fetched: WallOfFameCategory[],
  settings: WallOfFameSettings,
): WallOfFameCategory[] {
  const byName = new Map(fetched.map((c) => [c.name, c]));
  return settings.categoryOrder
    .map((name) => byName.get(name))
    .filter((c): c is WallOfFameCategory => Boolean(c));
}

export function loadSavedSettings(): WallOfFameSettings | null {
  try {
    const raw = localStorage.getItem(WALL_OF_FAME_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WallOfFameSettings;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      categoryOrder: Array.isArray(parsed.categoryOrder) ? parsed.categoryOrder : [],
      categoryColors:
        parsed.categoryColors && typeof parsed.categoryColors === 'object'
          ? parsed.categoryColors
          : {},
      imageOrders:
        parsed.imageOrders && typeof parsed.imageOrders === 'object' ? parsed.imageOrders : {},
    };
  } catch {
    return null;
  }
}

export function saveSettings(settings: WallOfFameSettings): void {
  try {
    localStorage.setItem(WALL_OF_FAME_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota errors */
  }
}

export function buildViewKey(
  activeCategories: Set<string>,
  pinnedCategory: string | null,
): string {
  if (pinnedCategory) return `pin:${pinnedCategory}`;
  return `view:${[...activeCategories].sort().join('|')}`;
}

export function filterVisibleImages(
  images: WallOfFameImage[],
  activeCategories: Set<string>,
  pinnedCategory: string | null,
): WallOfFameImage[] {
  return images.filter((img) => {
    if (!activeCategories.has(img.category)) return false;
    if (pinnedCategory && img.category !== pinnedCategory) return false;
    return true;
  });
}

export function defaultSortImages(
  images: WallOfFameImage[],
  categoryOrder: string[],
): WallOfFameImage[] {
  const orderMap = new Map(categoryOrder.map((name, i) => [name, i]));
  return [...images].sort((a, b) => {
    const ca = orderMap.get(a.category) ?? 999;
    const cb = orderMap.get(b.category) ?? 999;
    if (ca !== cb) return ca - cb;
    return a.filename.localeCompare(b.filename, 'de');
  });
}

export function applyImageOrder(
  images: WallOfFameImage[],
  savedOrder: string[] | undefined,
): WallOfFameImage[] {
  if (!savedOrder?.length) return images;
  const byId = new Map(images.map((img) => [img.id, img]));
  const result: WallOfFameImage[] = [];
  const used = new Set<string>();
  for (const id of savedOrder) {
    const img = byId.get(id);
    if (img) {
      result.push(img);
      used.add(id);
    }
  }
  for (const img of images) {
    if (!used.has(img.id)) result.push(img);
  }
  return result;
}

export function getOrderedVisibleImages(
  images: WallOfFameImage[],
  activeCategories: Set<string>,
  pinnedCategory: string | null,
  settings: WallOfFameSettings,
): WallOfFameImage[] {
  const visible = filterVisibleImages(images, activeCategories, pinnedCategory);
  const defaultSorted = defaultSortImages(visible, settings.categoryOrder);
  const viewKey = buildViewKey(activeCategories, pinnedCategory);
  return applyImageOrder(defaultSorted, settings.imageOrders[viewKey]);
}

export function swapSlotsInOrder(order: string[], slotA: number, slotB: number): string[] {
  if (slotA === slotB) return order;
  const next = [...order];
  if (slotA < 0 || slotB < 0 || slotA >= next.length || slotB >= next.length) return next;
  [next[slotA], next[slotB]] = [next[slotB], next[slotA]];
  return next;
}

export function reorderCategories(
  order: string[],
  fromName: string,
  toIndex: number,
): string[] {
  const fromIndex = order.indexOf(fromName);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return order;
  const next = [...order];
  next.splice(fromIndex, 1);
  const insertAt = Math.min(Math.max(0, toIndex), next.length);
  next.splice(insertAt, 0, fromName);
  return next;
}

export function computeMosaicGrid(count: number, viewportW: number, viewportH: number): MosaicGridMetrics {
  const cols = Math.max(1, Math.round(Math.sqrt(count * (viewportW / viewportH))));
  const rows = Math.ceil(count / cols);
  const gap = WALL_MOSAIC_GAP;
  const tileW = (viewportW - (cols - 1) * gap) / cols;
  const tileH = (viewportH - (rows - 1) * gap) / rows;
  return { count, cols, rows, gap, tileW, tileH };
}

export function slotToPosition(slot: number, grid: MosaicGridMetrics): { x: number; y: number } {
  const col = slot % grid.cols;
  const row = Math.floor(slot / grid.cols);
  return {
    x: col * (grid.tileW + grid.gap),
    y: row * (grid.tileH + grid.gap),
  };
}

export function pointerToSlot(
  x: number,
  y: number,
  grid: MosaicGridMetrics,
): number {
  const col = Math.floor(x / (grid.tileW + grid.gap));
  const row = Math.floor(y / (grid.tileH + grid.gap));
  if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return -1;
  const slot = row * grid.cols + col;
  return slot < grid.count ? slot : -1;
}

export function computeViewportLayout(
  orderedImages: WallOfFameImage[],
  categories: WallOfFameCategory[],
  settings: WallOfFameSettings,
  viewportW: number,
  viewportH: number,
): WallPlacedImage[] {
  if (viewportW <= 0 || viewportH <= 0 || orderedImages.length === 0) return [];

  const categoryOrder = new Map(settings.categoryOrder.map((name, i) => [name, i]));
  const grid = computeMosaicGrid(orderedImages.length, viewportW, viewportH);

  return orderedImages.map((image, slot) => {
    const { x, y } = slotToPosition(slot, grid);
    return {
      image,
      category: image.category,
      categoryIndex: categoryOrder.get(image.category) ?? 0,
      slot,
      x,
      y,
      w: grid.tileW,
      h: grid.tileH,
    };
  });
}

/**
 * URL für Wall-of-Fame-Vorschaubilder.
 * Immer über read-image mit Größenlimit — volle Original-JPEGs (mehrere MB)
 * über den CRA-Proxy erzeugen Failed-to-fetch und Socket-Erschöpfung.
 */
export function wallOfFameImageUrl(gitInternPath: string, maxEdge = 900): string {
  return `/api/file-system-paths/read-image?filePath=${encodeURIComponent(gitInternPath)}&max=${maxEdge}`;
}

export function wallOfFameImageFallbackUrl(gitInternPath: string): string {
  return `/api/file-system-paths/read-image?filePath=${encodeURIComponent(gitInternPath)}&max=1200`;
}

export function parseWallOfFameTree(data: ReadDirectoryResponse): {
  images: WallOfFameImage[];
  categories: WallOfFameCategory[];
} {
  const images: WallOfFameImage[] = [];
  const categoryCounts = new Map<string, number>();

  const walk = (nodes: TreeNode[] | undefined, category: string | null) => {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.type === 'directory') {
        const nextCategory = category ?? node.name;
        walk(node.children, nextCategory);
        continue;
      }
      if (!isImageFile(node) || !category) continue;
      images.push({
        id: node.path,
        path: node.path,
        filename: node.name,
        category,
        url: wallOfFameImageUrl(node.path),
      });
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  };

  walk(data.root?.children, null);

  const categories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return { images, categories };
}

export async function fetchWallOfFameImages(): Promise<{
  images: WallOfFameImage[];
  categories: WallOfFameCategory[];
}> {
  const response = await fetch(
    `/api/file-system-paths/read?path=${encodeURIComponent(WALL_OF_FAME_GIT_PATH)}&recursive=true&t=${Date.now()}`,
  );
  if (!response.ok) throw new Error('Wall of Fame konnte nicht geladen werden.');
  const data = (await response.json()) as ReadDirectoryResponse;
  if (data.error) throw new Error(data.error);
  return parseWallOfFameTree(data);
}
