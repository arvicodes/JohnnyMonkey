import { PrismaClient } from '@prisma/client';
import path from 'path';
import { StorageManager } from '../utils/storageManager';
import {
  isLessonPresentationMaterialPdf,
  isStudentVisibleLessonMaterialFile,
} from '../lib/lessonMaterialVisibility';

const prisma = new PrismaClient();

const normalizeFilePath = (p: string) => (p || '').replace(/\\/g, '/').trim();

export async function collectFilesInDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const content = await StorageManager.readDirectory(dirPath, true);
    const walk = (node: any) => {
      if (!node) return;
      if (node.type === 'file' && node.path) {
        files.push(normalizeFilePath(node.path));
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };
    if (content?.root) {
      walk(content.root);
    } else if (Array.isArray(content)) {
      content.forEach(walk);
    } else {
      walk(content);
    }
  } catch (err) {
    console.warn('[LessonShareSync] Could not read folder:', dirPath, err);
  }
  return files;
}

/**
 * Stundenordner-Freigaben bereinigen:
 * - Bilder / interne Präsentationsdateien entfernen
 * - Folien-PDFs (Original + bearbeitet) automatisch freigeben
 */
export async function syncLessonFolderShares(groupId: string, lessonPath: string): Promise<void> {
  const files = await collectFilesInDirectory(lessonPath);
  for (const filePath of files) {
    const name = path.basename(filePath);
    const existing = await prisma.fileShare.findUnique({
      where: { filePath_groupId: { filePath, groupId } },
    });
    if (!isStudentVisibleLessonMaterialFile(name)) {
      if (existing) {
        await prisma.fileShare.delete({ where: { id: existing.id } });
      }
      continue;
    }
    if (isLessonPresentationMaterialPdf(name) && !existing) {
      await prisma.fileShare.create({ data: { filePath, groupId } });
    }
  }
}

/** Entfernt fälschlich freigegebene Bilder/Systemdateien in zugewiesenen Ordnerbäumen. */
export async function revokeNonMaterialSharesInTree(groupId: string, rootPath: string): Promise<void> {
  const files = await collectFilesInDirectory(rootPath);
  for (const filePath of files) {
    const name = path.basename(filePath);
    if (isStudentVisibleLessonMaterialFile(name)) continue;
    const existing = await prisma.fileShare.findUnique({
      where: { filePath_groupId: { filePath, groupId } },
    });
    if (existing) {
      await prisma.fileShare.delete({ where: { id: existing.id } });
    }
  }
}
