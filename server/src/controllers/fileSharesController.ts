import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { syncLessonFolderShares } from '../services/lessonFolderShareSync';

const prisma = new PrismaClient();

const normalizeFilePath = (p: string) => (p || '').replace(/\\/g, '/').trim();

// Toggle file share for a learning group
export const toggleFileShare = async (req: Request, res: Response) => {
  try {
    const { filePath, groupId } = req.body;

    if (!filePath || !groupId) {
      return res.status(400).json({ error: 'Dateipfad und Gruppen-ID sind erforderlich' });
    }

    const normalizedPath = normalizeFilePath(filePath);

    // Check if the share already exists
    const existingShare = await prisma.fileShare.findUnique({
      where: {
        filePath_groupId: {
          filePath: normalizedPath,
          groupId
        }
      }
    });

    if (existingShare) {
      // Remove the share
      await prisma.fileShare.delete({
        where: {
          id: existingShare.id
        }
      });
      return res.json({ shared: false, message: 'Datei-Freigabe entfernt' });
    } else {
      // Create new share
      const newShare = await prisma.fileShare.create({
        data: {
          filePath: normalizedPath,
          groupId
        }
      });
      return res.json({ shared: true, message: 'Datei freigegeben', share: newShare });
    }
  } catch (error: any) {
    console.error('Error toggling file share:', error);
    const message = error?.message || error?.code || 'Serverfehler beim Ändern der Datei-Freigabe';
    res.status(500).json({ error: message });
  }
};

// Get all shared files for a learning group
export const getSharedFilesForGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: 'Gruppen-ID ist erforderlich' });
    }

    const shares = await prisma.fileShare.findMany({
      where: {
        groupId
      }
    });

    const filePaths = shares.map(share => normalizeFilePath(share.filePath));
    
    res.json({ groupId, filePaths, shares });
  } catch (error) {
    console.error('Error getting shared files:', error);
    res.status(500).json({ error: 'Serverfehler beim Abrufen der geteilten Dateien' });
  }
};

// Check if a file is shared with a group
export const checkFileShare = async (req: Request, res: Response) => {
  try {
    const { filePath, groupId } = req.query;

    if (!filePath || !groupId) {
      return res.status(400).json({ error: 'Dateipfad und Gruppen-ID sind erforderlich' });
    }

    const share = await prisma.fileShare.findUnique({
      where: {
        filePath_groupId: {
          filePath: filePath as string,
          groupId: groupId as string
        }
      }
    });

    res.json({ shared: !!share });
  } catch (error) {
    console.error('Error checking file share:', error);
    res.status(500).json({ error: 'Serverfehler beim Prüfen der Datei-Freigabe' });
  }
};

// Get all shares for multiple files and groups (batch check)
export const batchCheckFileShares = async (req: Request, res: Response) => {
  try {
    const { filePaths, groupIds } = req.body;

    if (!filePaths || !groupIds || !Array.isArray(filePaths) || !Array.isArray(groupIds)) {
      return res.status(400).json({ error: 'Dateipfade und Gruppen-IDs als Arrays erforderlich' });
    }

    const shares = await prisma.fileShare.findMany({
      where: {
        filePath: { in: filePaths },
        groupId: { in: groupIds }
      }
    });

    // Create a map for easy lookup: "filePath:groupId" -> true
    const shareMap: { [key: string]: boolean } = {};
    shares.forEach(share => {
      shareMap[`${share.filePath}:${share.groupId}`] = true;
    });

    res.json({ shares: shareMap });
  } catch (error) {
    console.error('Error batch checking file shares:', error);
    res.status(500).json({ error: 'Serverfehler beim Prüfen der Datei-Freigaben' });
  }
};

/** Lehrkraft: Freigaben im Stundenordner bereinigen (Bilder weg, Folien-PDFs an). */
export const syncLessonFolderFileShares = async (req: Request, res: Response) => {
  try {
    const { groupId, lessonPath } = req.body as { groupId?: string; lessonPath?: string };
    if (!groupId?.trim() || !lessonPath?.trim()) {
      return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
    }
    await syncLessonFolderShares(groupId.trim(), lessonPath.trim().replace(/\\/g, '/').replace(/\/$/, ''));
    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Error syncing lesson folder shares:', error);
    res.status(500).json({ error: error?.message || 'Serverfehler beim Synchronisieren der Freigaben' });
  }
};

