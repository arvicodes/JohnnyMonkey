import express from 'express';
import { PrismaClient } from '../generated/prisma';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to log all requests to this router
router.use((req, res, next) => {
  console.log(`=== NOTES ROUTER REQUEST ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Path: ${req.path}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`Body:`, req.body);
  console.log(`Body type:`, typeof req.body);
  console.log(`=== END NOTES ROUTER REQUEST ===`);
  next();
});

// GET /api/notes - Alle Notizen des Benutzers abrufen
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich' });
    }

    const notes = await prisma.note.findMany({
      where: {
        authorId: userId as string,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { order: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    res.json(notes);
  } catch (error) {
    console.error('Fehler beim Abrufen der Notizen:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// PUT /api/notes/reorder - Notizen-Reihenfolge aktualisieren
router.put('/reorder', async (req, res) => {
  try {
    console.log('=== REORDER REQUEST DEBUG ===');
    console.log('Reorder request received at:', new Date().toISOString());
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request originalUrl:', req.originalUrl);
    console.log('Request path:', req.path);
    console.log('Request query:', req.query);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body raw:', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', req.body ? Object.keys(req.body) : 'no body');
    console.log('Request body stringified:', JSON.stringify(req.body));
    
    // Check if body is empty or undefined
    if (!req.body) {
      console.error('Request body is empty or undefined');
      return res.status(400).json({ error: 'Request body is empty' });
    }
    
    const userId = req.query.userId as string;
    const { noteIds } = req.body;

    console.log('Extracted from query:', { userId });
    console.log('Extracted from body:', { noteIds });
    console.log('userId type:', typeof userId);
    console.log('noteIds type:', typeof noteIds);
    console.log('userId value:', userId);
    console.log('noteIds value:', noteIds);
    console.log('=== END REORDER REQUEST DEBUG ===');

    if (!userId) {
      console.error('userId is missing from query');
      return res.status(400).json({ error: 'userId ist erforderlich' });
    }

    if (!noteIds) {
      console.error('noteIds is missing');
      return res.status(400).json({ error: 'noteIds ist erforderlich' });
    }

    if (!Array.isArray(noteIds)) {
      console.error('noteIds is not an array:', typeof noteIds);
      return res.status(400).json({ error: 'noteIds muss ein Array sein' });
    }

    console.log('Updating notes order for user:', userId, 'with noteIds:', noteIds);

    // Überprüfe zuerst, ob alle Notizen existieren
    const existingNotes = await prisma.note.findMany({
      where: {
        id: { in: noteIds },
        authorId: userId
      },
      select: { id: true, title: true }
    });

    console.log('Found existing notes:', existingNotes);
    console.log('Expected noteIds:', noteIds);
    console.log('Found noteIds:', existingNotes.map(n => n.id));

    if (existingNotes.length !== noteIds.length) {
      const foundIds = existingNotes.map(n => n.id);
      const missingIds = noteIds.filter(id => !foundIds.includes(id));
      console.error('Missing notes:', missingIds);
      return res.status(404).json({ 
        error: 'Notiz nicht gefunden',
        missingIds,
        foundIds,
        requestedIds: noteIds
      });
    }

    // Aktualisiere die Reihenfolge der Notizen
    for (let i = 0; i < noteIds.length; i++) {
      const noteId = noteIds[i];
      console.log(`Updating note ${i + 1}/${noteIds.length}:`, noteId);
      
      const result = await prisma.note.updateMany({
        where: { 
          id: noteId, 
          authorId: userId 
        },
        data: { 
          order: i,
          updatedAt: new Date()
        }
      });
      
      console.log(`Updated ${result.count} notes for noteId:`, noteId);
    }

    console.log('Reorder operation completed successfully');
    res.json({ message: 'Notizen-Reihenfolge erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Notizen-Reihenfolge:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// GET /api/notes/:id - Eine spezifische Notiz abrufen
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich' });
    }

    const note = await prisma.note.findFirst({
      where: {
        id,
        authorId: userId as string,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    res.json(note);
  } catch (error) {
    console.error('Fehler beim Abrufen der Notiz:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// POST /api/notes - Neue Notiz erstellen
router.post('/', async (req, res) => {
  try {
    const { title, content, authorId, isPrivate = true, tags } = req.body;

    console.log('Creating note with data:', { title, content, authorId, isPrivate, tags });

    if (!title || !content || !authorId) {
      return res.status(400).json({ 
        error: 'title, content und authorId sind erforderlich' 
      });
    }

    // Get the highest order value for this user's notes
    const maxOrderNote = await prisma.note.findFirst({
      where: { authorId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = (maxOrderNote?.order ?? -1) + 1;

    const note = await prisma.note.create({
      data: {
        title,
        content,
        authorId,
        isPrivate,
        tags,
        order: newOrder,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Fehler beim Erstellen der Notiz:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// PUT /api/notes/:id - Notiz aktualisieren
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isPrivate, tags, order } = req.body;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich' });
    }

    // Prüfen, ob die Notiz dem Benutzer gehört
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        authorId: userId as string,
      },
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (tags !== undefined) updateData.tags = tags;
    if (order !== undefined) updateData.order = order;

    const updatedNote = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(updatedNote);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Notiz:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// DELETE /api/notes/:id - Notiz löschen
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich' });
    }

    // Prüfen, ob die Notiz dem Benutzer gehört
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        authorId: userId as string,
      },
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    await prisma.note.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Fehler beim Löschen der Notiz:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// GET /api/notes/search - Notizen durchsuchen
router.get('/search', async (req, res) => {
  try {
    const { userId, query, tags } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich' });
    }

    const whereClause: any = {
      authorId: userId as string,
    };

    if (query) {
      whereClause.OR = [
        { title: { contains: query as string, mode: 'insensitive' } },
        { content: { contains: query as string, mode: 'insensitive' } },
      ];
    }

    if (tags) {
      whereClause.tags = { contains: tags as string };
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { order: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    res.json(notes);
  } catch (error) {
    console.error('Fehler beim Durchsuchen der Notizen:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});



export default router; 