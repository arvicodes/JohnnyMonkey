import fs from 'fs';
import path from 'path';

const ERASMUS_ROOT = 'Erasmus';
const BILDER_SUB = 'Bilder';
const SITE_MARKER = '.story-site-id';

export function resolveJmReihenRoot(): string {
  if (process.env.JM_REIHEN_PATH && fs.existsSync(process.env.JM_REIHEN_PATH)) {
    return process.env.JM_REIHEN_PATH;
  }
  const base = process.env.LOCAL_MATERIALS_PATH;
  if (base) {
    const candidate = path.join(base, 'J-M-Reihen');
    if (fs.existsSync(candidate)) return candidate;
    const direct = path.join(base);
    if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) {
      const name = path.basename(direct);
      if (name === 'J-M-Reihen') return direct;
    }
  }
  const projectRoot = path.resolve(__dirname, '../../..');
  const fromProject = path.join(projectRoot, 'J-M-Reihen');
  if (fs.existsSync(fromProject)) return fromProject;
  const serverPath = path.join(process.cwd(), 'J-M-Reihen');
  const parentPath = path.join(process.cwd(), '..', 'J-M-Reihen');
  if (fs.existsSync(serverPath)) return serverPath;
  if (fs.existsSync(parentPath)) return parentPath;
  return fromProject;
}

export function sanitizeErasmusSegment(input: string): string {
  return input
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nur der Titel-Teil vor dem ersten „ - “ (z. B. „Teaching Assignment - Kroatien …“ → Teaching Assignment). */
export function erasmusTitelFromSiteName(name: string): string {
  const trimmed = name?.trim() || 'Neue Website';
  const beforeDash = trimmed.split(/\s*-\s*/)[0]?.trim() || trimmed;
  return sanitizeErasmusSegment(beforeDash);
}

/** Schema: „Jahr - Monat - Land - Titel“ */
export function buildErasmusFolderLabel(site: {
  name?: string;
  country?: string;
  createdAt?: string;
}): string {
  const d = new Date(site.createdAt || Date.now());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const land = sanitizeErasmusSegment(site.country?.trim() || 'Unbenannt');
  const titel = erasmusTitelFromSiteName(site.name ?? 'Neue Website');
  return `${year} - ${month} - ${land} - ${titel}`;
}

function readSiteMarker(folderPath: string): string | null {
  const markerFile = path.join(folderPath, SITE_MARKER);
  if (!fs.existsSync(markerFile)) return null;
  try {
    return fs.readFileSync(markerFile, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

function writeSiteMarker(folderPath: string, siteId: string): void {
  fs.writeFileSync(path.join(folderPath, SITE_MARKER), siteId, 'utf8');
}

function resolveUniqueRelativeFolder(jmRoot: string, relativeFolder: string, siteId: string): string {
  let candidate = relativeFolder;
  let full = path.join(jmRoot, candidate);
  if (!fs.existsSync(full)) return candidate;
  const owner = readSiteMarker(full);
  if (owner === siteId) return candidate;
  const suffix = siteId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 8);
  candidate = `${relativeFolder} (${suffix})`;
  full = path.join(jmRoot, candidate);
  if (!fs.existsSync(full)) return candidate;
  if (readSiteMarker(full) === siteId) return candidate;
  return `${relativeFolder} (${siteId.slice(0, 8)})`;
}

/**
 * Legt J-M-Reihen/Erasmus/{Jahr - Monat - Land - Titel}/Bilder an (oder benennt um).
 * Setzt erasmusFolder auf den relativen Pfad unter J-M-Reihen.
 */
export function applyErasmusFoldersToSitePayload(
  raw: Record<string, unknown>,
): { payload: Record<string, unknown>; folderCreated: boolean; folderPath?: string } {
  const siteId = typeof raw.id === 'string' ? raw.id : '';
  const name = typeof raw.name === 'string' ? raw.name : 'Neue Website';
  const country = typeof raw.country === 'string' ? raw.country : '';
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
  const existingRel =
    typeof raw.erasmusFolder === 'string' && raw.erasmusFolder.trim()
      ? raw.erasmusFolder.trim().replace(/\\/g, '/')
      : undefined;

  const jmRoot = resolveJmReihenRoot();
  if (!fs.existsSync(jmRoot)) {
    console.warn('Erasmus-Ordner: J-M-Reihen nicht gefunden:', jmRoot);
    return { payload: raw, folderCreated: false };
  }

  fs.mkdirSync(path.join(jmRoot, ERASMUS_ROOT), { recursive: true });

  const label = buildErasmusFolderLabel({ name, country, createdAt });
  let relativeFolder = `${ERASMUS_ROOT}/${label}`;
  relativeFolder = resolveUniqueRelativeFolder(jmRoot, relativeFolder, siteId);

  const newFull = path.join(jmRoot, relativeFolder);
  const bilderFull = path.join(newFull, BILDER_SUB);
  let folderCreated = false;

  if (existingRel && existingRel !== relativeFolder) {
    const oldFull = path.join(jmRoot, existingRel);
    if (fs.existsSync(oldFull) && readSiteMarker(oldFull) === siteId) {
      if (!fs.existsSync(newFull)) {
        fs.renameSync(oldFull, newFull);
        folderCreated = true;
      } else {
        fs.mkdirSync(bilderFull, { recursive: true });
      }
    }
  }

  if (!fs.existsSync(newFull)) {
    fs.mkdirSync(bilderFull, { recursive: true });
    folderCreated = true;
  } else {
    if (!fs.existsSync(bilderFull)) {
      fs.mkdirSync(bilderFull, { recursive: true });
      folderCreated = true;
    }
  }

  if (siteId) writeSiteMarker(newFull, siteId);

  const payload = {
    ...raw,
    erasmusFolder: relativeFolder,
    country,
  };

  return {
    payload,
    folderCreated,
    folderPath: `J-M-Reihen/${relativeFolder}/${BILDER_SUB}`,
  };
}
