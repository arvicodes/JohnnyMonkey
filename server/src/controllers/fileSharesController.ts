import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Toggle file share for a learning group
export const toggleFileShare = async (req: Request, res: Response) => {
  try {
    const { filePath, groupId } = req.body;

    if (!filePath || !groupId) {
      return res.status(400).json({ error: 'Dateipfad und Gruppen-ID sind erforderlich' });
    }

    // Check if the share already exists
    const existingShare = await prisma.fileShare.findUnique({
      where: {
        filePath_groupId: {
          filePath,
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
          filePath,
          groupId
        }
      });
      return res.json({ shared: true, message: 'Datei freigegeben', share: newShare });
    }
  } catch (error) {
    console.error('Error toggling file share:', error);
    res.status(500).json({ error: 'Serverfehler beim Ändern der Datei-Freigabe' });
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

    const filePaths = shares.map(share => share.filePath);
    
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

