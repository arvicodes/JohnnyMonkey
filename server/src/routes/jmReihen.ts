import express from 'express';
import { JMReihenController } from '../controllers/JMReihenController';

const router = express.Router();
const jmReihenController = new JMReihenController();

// Alle Ordner-Strukturen für alle Lerngruppen laden
router.get('/all', async (req, res) => {
  try {
    const result = await jmReihenController.getAllFolderStructures();
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Ordner-Struktur für eine spezifische Lerngruppe laden
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const result = await jmReihenController.getFolderStructure(groupId);
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Ordner-Struktur für eine Lerngruppe speichern
router.post('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const folderData = req.body;
    
    const result = await jmReihenController.saveFolderStructure(groupId, folderData);
    if (result.success) {
      res.json({ message: 'Ordner-Struktur erfolgreich gespeichert' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Ordner-Struktur für eine Lerngruppe löschen
router.delete('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const result = await jmReihenController.deleteFolderStructure(groupId);
    if (result.success) {
      res.json({ message: 'Ordner-Struktur erfolgreich gelöscht' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

export default router;
