import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import {
  generateLoginCode,
  groupNumberFromName,
  loginGroupNumberFromKlasse,
  parseWebUntisStudentListText,
  stripMiddleNames,
  type ParsedWebUntisStudent,
} from '../utils/webUntisStudentList';

const router = Router();
const prisma = new PrismaClient();

const webUntisUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const ok =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'text/csv' ||
      name.endsWith('.pdf') ||
      name.endsWith('.txt') ||
      name.endsWith('.csv');
    cb(null, ok);
  },
});

function normalizeStudentAvatarUrl<T extends { avatarUrl?: string | null }>(student: T): T {
  if (!student.avatarUrl?.startsWith('/uploads/avatars/')) return student;
  return {
    ...student,
    avatarUrl: student.avatarUrl.replace('/uploads/avatars/', '/api/avatars/'),
  };
}

function normalizeGroupStudents<T extends { students?: Array<{ avatarUrl?: string | null }> }>(group: T): T {
  if (!group.students) return group;
  return {
    ...group,
    students: group.students.map(normalizeStudentAvatarUrl),
  };
}

// Get all learning groups (for testing purposes)
router.get('/', async (req: Request, res: Response) => {
  try {
    const groups = await prisma.learningGroup.findMany({
      include: { 
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          }
        }
      }
    });
    res.json(groups.map(normalizeGroupStudents));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// WICHTIG: Spezifische Routen müssen VOR den allgemeinen Routen kommen!
// Get all learning groups for a teacher
router.get('/teacher/:id', async (req: Request, res: Response) => {
  try {
    const teacherId = req.params.id;
    console.log('📚 Fetching groups for teacher:', teacherId);
    
    if (!teacherId || teacherId.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid teacher ID',
        message: 'Teacher ID ist erforderlich'
      });
    }
    
    // Lade Gruppen OHNE seatingOrder und statisticsOrder im select
    // (falls Prisma Client veraltet ist und diese Felder nicht kennt)
    const groups = await prisma.learningGroup.findMany({
      where: { teacherId: teacherId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        teacherId: true,
        period1Hours: true,
        period2Hours: true,
        iconEmoji: true,
        color: true,
        displayOrder: true,
        isArchived: true,
        moderatorStudentId: true,
        // seatingOrder und statisticsOrder werden separat geladen (falls Prisma Client veraltet ist)
        // seatingOrder: true,
        // statisticsOrder: true,
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          }
        }
      }
    });
    
    console.log('📊 Found', groups.length, 'groups for teacher', teacherId);
    
    // Lade seatingOrder und statisticsOrder separat für jede Gruppe (mit Fehlerbehandlung)
    // Verwende Promise.allSettled, damit ein Fehler bei einer Gruppe nicht alle anderen blockiert
    const groupsWithStatsResults = await Promise.allSettled(groups.map(async (group) => {
      // Prüfe zuerst, ob Prisma Client die Felder kennt
      // Wenn nicht, setze direkt auf null ohne Fehler zu werfen
      try {
        // Versuche beide Felder auf einmal zu laden
        const fullGroup = await prisma.learningGroup.findUnique({
          where: { id: group.id },
          select: { 
            seatingOrder: true,
            statisticsOrder: true,
            passiveStudentIds: true,
          }
        });
        return {
          ...group,
          seatingOrder: fullGroup?.seatingOrder || null,
          statisticsOrder: fullGroup?.statisticsOrder || null,
          passiveStudentIds: fullGroup?.passiveStudentIds || null,
        };
      } catch (e: any) {
        // Prüfe ob es ein "Unknown field" Fehler ist (Prisma Client veraltet)
        const isUnknownFieldError = e?.message?.includes('Unknown field') || 
                                   e?.message?.includes('seatingOrder') ||
                                   e?.message?.includes('statisticsOrder');
        
        if (isUnknownFieldError) {
          // Prisma Client ist veraltet - setze einfach auf null ohne Warnung
          // (wird automatisch behoben, wenn Container neu gebaut wird)
          return {
            ...group,
            seatingOrder: null,
            statisticsOrder: null,
            passiveStudentIds: null,
          };
        }
        
        // Für andere Fehler: Versuche einzeln zu laden (Fallback)
        try {
          const seatingOrderGroup = await prisma.learningGroup.findUnique({
            where: { id: group.id },
            select: { seatingOrder: true }
          });
          const statisticsOrderGroup = await prisma.learningGroup.findUnique({
            where: { id: group.id },
            select: { statisticsOrder: true }
          });
          let passiveStudentIds: string | null = null;
          try {
            const passiveGroup = await prisma.learningGroup.findUnique({
              where: { id: group.id },
              select: { passiveStudentIds: true },
            });
            passiveStudentIds = passiveGroup?.passiveStudentIds || null;
          } catch {
            passiveStudentIds = null;
          }
          return {
            ...group,
            seatingOrder: seatingOrderGroup?.seatingOrder || null,
            statisticsOrder: statisticsOrderGroup?.statisticsOrder || null,
            passiveStudentIds,
          };
        } catch (e2: any) {
          // Wenn auch das fehlschlägt, setze beide auf null
          return {
            ...group,
            seatingOrder: null,
            statisticsOrder: null,
            passiveStudentIds: null,
          };
        }
      }
    }));
    
    // Extrahiere erfolgreiche Ergebnisse, bei Fehlern verwende Fallback
    const groupsWithStats = groupsWithStatsResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Fallback: Gruppe ohne seatingOrder und statisticsOrder zurückgeben
        console.warn(`⚠️ Fehler beim Laden von seatingOrder/statisticsOrder für Gruppe ${groups[index].id}:`, result.reason);
        return {
          ...groups[index],
          seatingOrder: null,
          statisticsOrder: null
        };
      }
    });
    
    console.log('✅ Found', groupsWithStats.length, 'groups for teacher');
    res.json(groupsWithStats.map(normalizeGroupStudents));
  } catch (error: any) {
    console.error('❌ Error fetching teacher groups:', error);
    console.error('❌ Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.substring(0, 500)
    });
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler beim Laden der Gruppen'
    });
  }
});

// Get all learning groups for a student
// WICHTIG: Diese Route muss VOR der /:id Route kommen!
router.get('/student/:id', async (req: Request, res: Response) => {
  try {
    console.log('👤 Fetching groups for student:', req.params.id);
    const groups = await prisma.learningGroup.findMany({
      where: {
        students: {
          some: {
            id: req.params.id
          }
        },
        isArchived: false,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        teacher: {
          select: {
            id: true,
            name: true
          }
        },
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          }
        }
      }
    });
    console.log('✅ Found', groups.length, 'groups for student');
    res.json(groups);
  } catch (error: any) {
    console.error('❌ Error fetching student groups:', error);
    console.error('❌ Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.substring(0, 500)
    });
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler beim Laden der Gruppen'
    });
  }
});

// Alle SuS aus der DB (aktueller Stand), inkl. Mitglieder der Zielgruppe
router.get('/:groupId/available-students', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      include: { students: { select: { id: true } } }
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    }
    
    const studentIdsInGroup = new Set(group.students.map(s => s.id));
    const allStudents = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        loginCode: true,
        avatarEmoji: true,
        avatarUrl: true,
        learningGroups: {
          select: { id: true, name: true, isArchived: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ name: 'asc' }, { loginCode: 'asc' }],
    });
    
    const directory = allStudents.map((s) => ({
      ...normalizeStudentAvatarUrl(s),
      inCurrentGroup: studentIdsInGroup.has(s.id),
    }));
    res.json({
      groupId: group.id,
      groupName: group.name,
      total: directory.length,
      inGroup: studentIdsInGroup.size,
      students: directory,
    });
  } catch (error: any) {
    console.error('Error fetching available students:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Get assignments for a group (before /:id)
router.get('/:groupId/assignments', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const assignments = await prisma.groupAssignment.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assignments);
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Gemeinsames Eingabefeld pro Gruppe + Stunde (für SuS sichtbar, Lehrkraft kann anzeigen)
router.get('/:groupId/lesson-shared-input', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const lessonPath = typeof req.query.lessonPath === 'string' ? req.query.lessonPath : '';
    if (!groupId || !lessonPath) {
      return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
    }
    const row = await prisma.lessonSharedInput.findUnique({
      where: { groupId_lessonPath: { groupId, lessonPath } }
    });
    return res.json({ content: row?.content ?? '', updatedAt: row?.updatedAt ?? null });
  } catch (error: any) {
    console.error('Error fetching lesson shared input:', error);
    res.status(500).json({ error: error?.message || 'Serverfehler' });
  }
});

router.put('/:groupId/lesson-shared-input', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { lessonPath, content } = req.body;
    if (!groupId || lessonPath == null || lessonPath === '') {
      return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
    }
    const updated = await prisma.lessonSharedInput.upsert({
      where: { groupId_lessonPath: { groupId, lessonPath: String(lessonPath) } },
      create: { groupId, lessonPath: String(lessonPath), content: String(content ?? '') },
      update: { content: String(content ?? ''), updatedAt: new Date() }
    });
    return res.json({ content: updated.content, updatedAt: updated.updatedAt });
  } catch (error: any) {
    console.error('Error updating lesson shared input:', error);
    res.status(500).json({ error: error?.message || 'Serverfehler' });
  }
});

// Freigabe für gemeinsames Eingabefeld (Toggle)
router.post('/:groupId/lesson-shared-input-share/toggle', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { lessonPath } = req.body;
    if (!groupId || !lessonPath) {
      return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
    }
    const existing = await prisma.lessonSharedInputShare.findUnique({
      where: { groupId_lessonPath: { groupId, lessonPath: String(lessonPath) } }
    });
    if (existing) {
      await prisma.lessonSharedInputShare.delete({ where: { id: existing.id } });
      return res.json({ shared: false });
    } else {
      await prisma.lessonSharedInputShare.create({
        data: { groupId, lessonPath: String(lessonPath) }
      });
      return res.json({ shared: true });
    }
  } catch (error: any) {
    console.error('Error toggling lesson shared input share:', error);
    res.status(500).json({ error: error?.message || 'Serverfehler' });
  }
});

// Get all shared lesson paths for a group
router.get('/:groupId/lesson-shared-input-shares', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const shares = await prisma.lessonSharedInputShare.findMany({
      where: { groupId },
      select: { lessonPath: true }
    });
    return res.json(shares.map(s => s.lessonPath));
  } catch (error: any) {
    console.error('Error fetching lesson shared input shares:', error);
    res.status(500).json({ error: error?.message || 'Serverfehler' });
  }
});

/** Lehrer: Prüfung für eine Lerngruppe starten (Vollbild bei SuS) */
router.post('/exam-beacon/start', async (req: Request, res: Response) => {
  try {
    const { teacherId, groupId, filePath, lessonPath } = req.body as {
      teacherId?: string;
      groupId?: string;
      filePath?: string;
      lessonPath?: string;
    };
    if (!teacherId?.trim() || !groupId?.trim() || !filePath?.trim()) {
      return res.status(400).json({ error: 'teacherId, groupId und filePath sind erforderlich' });
    }
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      select: { teacherId: true },
    });
    if (!group || group.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    const normalizedPath = String(filePath).replace(/\\/g, '/').trim();
    const beaconId = `exam-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await prisma.lessonExamBeacon.upsert({
      where: { groupId },
      create: {
        groupId,
        filePath: normalizedPath,
        lessonPath: String(lessonPath || '').trim(),
        beaconId,
        active: true,
      },
      update: {
        filePath: normalizedPath,
        lessonPath: String(lessonPath || '').trim(),
        beaconId,
        active: true,
      },
    });
    // Datei für SuS freigeben
    await prisma.fileShare.upsert({
      where: {
        filePath_groupId: { filePath: normalizedPath, groupId },
      },
      create: { filePath: normalizedPath, groupId },
      update: {},
    });
    return res.json({ ok: true, beaconId, filePath: normalizedPath, active: true });
  } catch (e: any) {
    console.error('exam-beacon/start:', e);
    return res.status(500).json({ error: e?.message || 'Serverfehler' });
  }
});

/** Lehrer: Prüfung beenden → Overlay bei SuS schließen */
router.post('/exam-beacon/stop', async (req: Request, res: Response) => {
  try {
    const { teacherId, groupId } = req.body as { teacherId?: string; groupId?: string };
    if (!teacherId?.trim() || !groupId?.trim()) {
      return res.status(400).json({ error: 'teacherId und groupId sind erforderlich' });
    }
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      select: { teacherId: true },
    });
    if (!group || group.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    const existing = await prisma.lessonExamBeacon.findUnique({ where: { groupId } });
    if (existing) {
      await prisma.lessonExamBeacon.update({
        where: { groupId },
        data: { active: false },
      });
    }
    return res.json({ ok: true, active: false, filePath: existing?.filePath || null });
  } catch (e: any) {
    console.error('exam-beacon/stop:', e);
    return res.status(500).json({ error: e?.message || 'Serverfehler' });
  }
});

/** Lehrer: Status der laufenden Prüfung für eine Gruppe */
router.get('/exam-beacon/status/:groupId', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.groupId;
    const row = await prisma.lessonExamBeacon.findUnique({
      where: { groupId },
      select: { groupId: true, filePath: true, lessonPath: true, beaconId: true, active: true, updatedAt: true },
    });
    if (!row || !row.active) {
      return res.json({ active: false, beacon: null });
    }
    return res.json({ active: true, beacon: row });
  } catch (e: any) {
    console.error('exam-beacon/status:', e);
    return res.status(500).json({ error: e?.message || 'Serverfehler' });
  }
});

/** SuS: Polling — aktive Prüfung → Vollbild-Overlay */
router.get('/exam-beacon/student-poll', async (req: Request, res: Response) => {
  try {
    const raw = req.headers['x-login-code'] as string | undefined;
    const loginCode = typeof raw === 'string' ? raw.trim() : '';
    if (!loginCode) {
      return res.status(401).json({ error: 'Anmeldung erforderlich' });
    }
    const user = await prisma.user.findFirst({
      where: { loginCode },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Nur für Schülerkonten' });
    }
    const rows = await prisma.lessonExamBeacon.findMany({
      where: {
        active: true,
        group: { students: { some: { id: user.id } } },
      },
      select: {
        groupId: true,
        filePath: true,
        lessonPath: true,
        beaconId: true,
        updatedAt: true,
        group: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({
      beacons: rows.map((r) => ({
        groupId: r.groupId,
        groupName: r.group.name,
        filePath: r.filePath,
        lessonPath: r.lessonPath,
        beaconId: r.beaconId,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (e: any) {
    console.error('exam-beacon/student-poll:', e);
    return res.status(500).json({ error: e?.message || 'Serverfehler' });
  }
});

/** Lehrer (z. B. Tablet-Modus): Signal an alle SuS dieser Gruppe — gemeinsames Karteikarten-Modal öffnen */
router.post('/collab-flashcard-beacon', async (req: Request, res: Response) => {
  try {
    const { teacherId, groupId, lessonPath } = req.body as { teacherId?: string; groupId?: string; lessonPath?: string };
    if (!teacherId?.trim() || !groupId?.trim() || lessonPath == null || String(lessonPath).trim() === '') {
      return res.status(400).json({ error: 'teacherId, groupId und lessonPath sind erforderlich' });
    }
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      select: { teacherId: true },
    });
    if (!group || group.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    const beaconId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await prisma.lessonCollabFlashcardBeacon.upsert({
      where: {
        groupId_lessonPath: {
          groupId,
          lessonPath: String(lessonPath),
        },
      },
      create: {
        groupId,
        lessonPath: String(lessonPath),
        beaconId,
      },
      update: { beaconId },
    });
    return res.json({ ok: true, beaconId });
  } catch (e: any) {
    console.error('collab-flashcard-beacon POST:', e);
    return res.status(500).json({ error: e?.message || 'Serverfehler' });
  }
});

/** SuS: Polling — gleiche Beacon-Liste wie zuletzt vom Lehrer ausgelöst */
router.get('/collab-flashcard-beacon/student-poll', async (req: Request, res: Response) => {
  try {
    const raw = req.headers['x-login-code'] as string | undefined;
    const loginCode = typeof raw === 'string' ? raw.trim() : '';
    if (!loginCode) {
      return res.status(401).json({ error: 'Anmeldung erforderlich' });
    }
    const user = await prisma.user.findFirst({
      where: { loginCode },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Nur für Schülerkonten' });
    }
    const rows = await prisma.lessonCollabFlashcardBeacon.findMany({
      where: { group: { students: { some: { id: user.id } } } },
      select: { groupId: true, lessonPath: true, beaconId: true },
    });
    return res.json({ beacons: rows });
  } catch (e: any) {
    console.error('collab-flashcard-beacon student-poll:', e);
    return res.status(500).json({ error: e?.message || 'Serverfehler' });
  }
});

// Get a single learning group by ID (MUST BE LAST among GET routes with :id)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const group = await prisma.learningGroup.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true
          }
        },
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    }

    res.json(group);
  } catch (error: any) {
    console.error('Error fetching learning group:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Reihenfolge der Lerngruppen für einen Lehrer speichern
router.put('/reorder', async (req: Request, res: Response) => {
  try {
    const { teacherId, groupIds, archived } = req.body;

    if (!teacherId || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ error: 'teacherId und groupIds sind erforderlich' });
    }

    const archivedFlag = archived === true;

    const ownedGroups = await prisma.learningGroup.findMany({
      where: { teacherId: String(teacherId), id: { in: groupIds.map(String) } },
      select: { id: true },
    });

    if (ownedGroups.length !== groupIds.length) {
      return res.status(403).json({ error: 'Ungültige Gruppen-IDs für diesen Lehrer' });
    }

    await prisma.$transaction(
      groupIds.map((id: string, index: number) =>
        prisma.learningGroup.update({
          where: { id: String(id) },
          data: { displayOrder: index, isArchived: archivedFlag },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering learning groups:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a learning group
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, iconEmoji, color, displayOrder, isArchived } = req.body;

    const data: {
      name?: string;
      iconEmoji?: string | null;
      color?: string | null;
      displayOrder?: number | null;
      isArchived?: boolean;
    } = {};

    if (name !== undefined) {
      if (!name || String(name).trim() === '') {
        return res.status(400).json({ error: 'Name ist erforderlich' });
      }
      data.name = String(name).trim();
    }

    if (iconEmoji !== undefined) {
      data.iconEmoji = iconEmoji ? String(iconEmoji).trim() : null;
    }

    if (color !== undefined) {
      data.color = color ? String(color).trim() : null;
    }

    if (displayOrder !== undefined) {
      data.displayOrder =
        displayOrder === null || displayOrder === ''
          ? null
          : Number(displayOrder);
    }

    if (isArchived !== undefined) {
      data.isArchived = Boolean(isArchived);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Keine Felder zum Aktualisieren' });
    }

    const group = await prisma.learningGroup.update({
      where: { id: req.params.id },
      data,
      include: {
        teacher: true,
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          }
        }
      }
    });

    res.json(group);
  } catch (error) {
    console.error('Error updating learning group:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new learning group
router.post('/', async (req: Request, res: Response) => {
  const { name, teacherId, iconEmoji, color, displayOrder } = req.body;
  try {
    const group = await prisma.learningGroup.create({
      data: {
        name,
        iconEmoji: iconEmoji ? String(iconEmoji).trim() : null,
        color: color ? String(color).trim() : null,
        displayOrder:
          displayOrder === undefined || displayOrder === null || displayOrder === ''
            ? null
            : Number(displayOrder),
        teacher: {
          connect: { id: teacherId }
        }
      },
      include: { 
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          }
        }
      }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add students to a learning group
router.post('/:id/students', async (req: Request, res: Response) => {
  const { studentIds } = req.body;
  try {
    const group = await prisma.learningGroup.update({
      where: { id: req.params.id },
      data: {
        students: {
          connect: studentIds.map((id: string) => ({ id }))
        }
      },
      include: { 
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          }
        }
      }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

type WebUntisPreviewRow = ParsedWebUntisStudent & {
  loginCode: string;
  status: 'new' | 'exists' | 'in_group';
  existingUserId?: string;
};

async function buildWebUntisPreview(
  groupId: string,
  parsedStudents: ParsedWebUntisStudent[],
  groupName: string,
  klasse?: string,
): Promise<{ rows: WebUntisPreviewRow[]; groupNumber: string }> {
  const groupNumber =
    loginGroupNumberFromKlasse(klasse, '') || groupNumberFromName(groupName, '00');
  const group = await prisma.learningGroup.findUnique({
    where: { id: groupId },
    include: { students: { select: { id: true, name: true, loginCode: true } } },
  });
  if (!group) throw Object.assign(new Error('Lerngruppe nicht gefunden'), { status: 404 });

  const allStudents = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, name: true, loginCode: true },
  });
  const inGroupIds = new Set(group.students.map((s) => s.id));
  const byNormName = new Map<string, { id: string; name: string; loginCode: string }>();
  for (const s of allStudents) {
    byNormName.set(stripMiddleNames(s.name).toLowerCase(), s);
  }

  const usedCodes = new Set(allStudents.map((s) => s.loginCode));
  const codeCounts = new Map<string, number>();
  const rows: WebUntisPreviewRow[] = [];

  for (const st of parsedStudents) {
    const existing = byNormName.get(st.fullName.toLowerCase());
    let loginCode = generateLoginCode(st.firstName, st.lastName, groupNumber);
    if (!existing) {
      if (codeCounts.has(loginCode) || usedCodes.has(loginCode)) {
        const n = (codeCounts.get(loginCode) || 0) + 1;
        codeCounts.set(loginCode, n);
        let candidate = `${loginCode}${n}`;
        while (usedCodes.has(candidate)) {
          const n2 = (codeCounts.get(loginCode) || n) + 1;
          codeCounts.set(loginCode, n2);
          candidate = `${loginCode}${n2}`;
        }
        loginCode = candidate;
      } else {
        codeCounts.set(loginCode, 0);
      }
      usedCodes.add(loginCode);
    } else {
      loginCode = existing.loginCode;
    }

    rows.push({
      ...st,
      loginCode,
      status: existing ? (inGroupIds.has(existing.id) ? 'in_group' : 'exists') : 'new',
      existingUserId: existing?.id,
    });
  }

  return { rows, groupNumber };
}

async function extractTextFromWebUntisUpload(file: Express.Multer.File): Promise<string> {
  const name = (file.originalname || '').toLowerCase();
  if (file.mimetype === 'application/pdf' || name.endsWith('.pdf')) {
    const data = await pdfParse(file.buffer);
    return data.text || '';
  }
  return file.buffer.toString('utf8');
}

/** Vorschau: WebUntis-PDF/TXT parsen, ohne DB-Schreibzugriff. */
router.post(
  '/:groupId/import-webuntis/preview',
  webUntisUpload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      if (!req.file) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen (PDF oder TXT)' });
      }
      const group = await prisma.learningGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true },
      });
      if (!group) return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });

      const text = await extractTextFromWebUntisUpload(req.file);
      const parsed = parseWebUntisStudentListText(text);
      if (parsed.students.length === 0) {
        return res.status(400).json({
          error: 'Keine Schülernamen erkannt. Bitte WebUntis-Schülerliste (PDF) verwenden.',
        });
      }
      const { rows, groupNumber } = await buildWebUntisPreview(
        groupId,
        parsed.students,
        group.name,
        parsed.klasse,
      );
      res.json({
        groupId,
        groupName: group.name,
        groupNumber,
        klasse: parsed.klasse,
        fach: parsed.fach,
        schuelergruppe: parsed.schuelergruppe,
        students: rows,
        summary: {
          total: rows.length,
          neu: rows.filter((r) => r.status === 'new').length,
          vorhanden: rows.filter((r) => r.status === 'exists').length,
          schonInGruppe: rows.filter((r) => r.status === 'in_group').length,
        },
      });
    } catch (error: any) {
      console.error('WebUntis preview error:', error);
      res.status(error?.status || 500).json({
        error: error?.message || 'Fehler beim Lesen der WebUntis-Liste',
      });
    }
  },
);

/** Bestätigen: Profile anlegen/aktualisieren (editierte Namen + Login-Codes) und zuordnen. */
router.post('/:groupId/import-webuntis/confirm', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const studentsRaw = Array.isArray(req.body?.students) ? req.body.students : [];
    if (studentsRaw.length === 0) {
      return res.status(400).json({ error: 'Keine Schüler in der Anfrage' });
    }

    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      include: { students: { select: { id: true } } },
    });
    if (!group) return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    const inGroupIds = new Set(group.students.map((s) => s.id));

    const created: Array<{ id: string; name: string; loginCode: string }> = [];
    const reused: Array<{ id: string; name: string; loginCode: string }> = [];
    const connectIds: string[] = [];

    for (const raw of studentsRaw) {
      const rawFirst = typeof raw.firstName === 'string' ? raw.firstName.trim() : '';
      const rawLast = typeof raw.lastName === 'string' ? raw.lastName.trim() : '';
      const fullNameRaw =
        typeof raw.fullName === 'string' && raw.fullName.trim()
          ? raw.fullName.trim()
          : `${rawFirst} ${rawLast}`.trim();
      if (!fullNameRaw) continue;

      // Mehrteilige Nachnamen (z. B. „De Donatis“) erhalten; nur erster Vorname
      const nameParts = fullNameRaw.split(/\s+/).filter(Boolean);
      const firstName =
        (rawFirst.split(/\s+/).filter(Boolean)[0] || nameParts[0] || '').trim();
      const lastName =
        (rawLast || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '')).trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      if (!fullName) continue;

      let loginCode = String(raw.loginCode || '').trim();
      if (!loginCode) {
        const groupNumber =
          typeof req.body?.groupNumber === 'string' && req.body.groupNumber.trim()
            ? loginGroupNumberFromKlasse(req.body.groupNumber.trim(), '') ||
              groupNumberFromName(group.name, '00')
            : groupNumberFromName(group.name, '00');
        loginCode = generateLoginCode(firstName, lastName, groupNumber);
      }

      let userId: string | undefined =
        typeof raw.existingUserId === 'string' && raw.existingUserId ? raw.existingUserId : undefined;

      if (!userId) {
        const all = await prisma.user.findMany({
          where: { role: 'STUDENT' },
          select: { id: true, name: true },
        });
        const match = all.find(
          (u) => stripMiddleNames(u.name).toLowerCase() === stripMiddleNames(fullName).toLowerCase(),
        );
        if (match) userId = match.id;
      }

      if (userId) {
        const conflict = await prisma.user.findFirst({
          where: { loginCode, NOT: { id: userId } },
          select: { id: true },
        });
        if (conflict) {
          return res.status(409).json({
            error: `Login-Code „${loginCode}“ ist bereits vergeben (${fullName})`,
          });
        }
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { name: fullName, loginCode },
          select: { id: true, name: true, loginCode: true },
        });
        reused.push(updated);
        if (!inGroupIds.has(userId)) connectIds.push(userId);
        continue;
      }

      let attempt = 0;
      let candidate = loginCode;
      while (await prisma.user.findUnique({ where: { loginCode: candidate } })) {
        attempt += 1;
        candidate = `${loginCode}${attempt}`;
      }
      const user = await prisma.user.create({
        data: {
          name: fullName,
          loginCode: candidate,
          role: 'STUDENT',
        },
        select: { id: true, name: true, loginCode: true },
      });
      created.push(user);
      connectIds.push(user.id);
    }

    if (connectIds.length > 0) {
      await prisma.learningGroup.update({
        where: { id: groupId },
        data: { students: { connect: connectIds.map((id) => ({ id })) } },
      });
    }

    const updated = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      include: {
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      created: created.length,
      connected: connectIds.length,
      alreadyInGroup: reused.filter((r) => !connectIds.includes(r.id)).length,
      students: created.concat(reused),
      group: updated ? normalizeGroupStudents(updated) : null,
    });
  } catch (error: any) {
    console.error('WebUntis confirm error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Fehler beim Importieren der Schüler',
    });
  }
});

// Remove a student from a learning group
router.delete('/:groupId/students/:studentId', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.learningGroup.findUnique({
      where: { id: req.params.groupId },
      select: { moderatorStudentId: true },
    });
    const group = await prisma.learningGroup.update({
      where: { id: req.params.groupId },
      data: {
        students: {
          disconnect: { id: req.params.studentId }
        },
        ...(existing?.moderatorStudentId === req.params.studentId
          ? { moderatorStudentId: null }
          : {}),
      },
      include: { 
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          }
        }
      }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/** Klassen-Moderator setzen oder entfernen (pro Lerngruppe einer) */
router.put('/:id/moderator', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id;
    const studentIdRaw = req.body?.studentId;
    const studentId =
      studentIdRaw === null || studentIdRaw === undefined || studentIdRaw === ''
        ? null
        : String(studentIdRaw).trim();

    const loginCode = typeof req.headers['x-login-code'] === 'string' ? req.headers['x-login-code'].trim() : '';
    if (!loginCode) return res.status(401).json({ error: 'Nicht autorisiert' });
    const teacher = await prisma.user.findUnique({
      where: { loginCode },
      select: { id: true, role: true },
    });
    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Nur Lehrkräfte' });
    }

    const group = await prisma.learningGroup.findFirst({
      where: { id: groupId, teacherId: teacher.id },
      select: {
        id: true,
        moderatorStudentId: true,
        students: { select: { id: true } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' });

    if (studentId) {
      const isMember = group.students.some((s) => s.id === studentId);
      if (!isMember) {
        return res.status(400).json({ error: 'Schüler ist nicht in dieser Lerngruppe' });
      }
    }

    // Gleicher Schüler erneut → Moderator entfernen (Toggle)
    const nextId =
      studentId && group.moderatorStudentId === studentId ? null : studentId;

    const updated = await prisma.learningGroup.update({
      where: { id: groupId },
      data: { moderatorStudentId: nextId },
      select: {
        id: true,
        name: true,
        moderatorStudentId: true,
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('PUT /learning-groups/:id/moderator:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/** Passive-Schüler setzen (z. B. Auslandsaufenthalt) — JSON-Array studentIds */
router.put('/:id/passive-students', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id;
    const raw = req.body?.studentIds;
    if (!Array.isArray(raw)) {
      return res.status(400).json({ error: 'studentIds (Array) ist erforderlich' });
    }
    const studentIds = [...new Set(raw.map((id: unknown) => String(id || '').trim()).filter(Boolean))];

    const loginCode = typeof req.headers['x-login-code'] === 'string' ? req.headers['x-login-code'].trim() : '';
    if (!loginCode) return res.status(401).json({ error: 'Nicht autorisiert' });
    const teacher = await prisma.user.findUnique({
      where: { loginCode },
      select: { id: true, role: true },
    });
    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Nur Lehrkräfte' });
    }

    const group = await prisma.learningGroup.findFirst({
      where: { id: groupId, teacherId: teacher.id },
      select: {
        id: true,
        students: { select: { id: true } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' });

    const memberIds = new Set(group.students.map((s) => s.id));
    const validIds = studentIds.filter((id) => memberIds.has(id));

    const updated = await prisma.learningGroup.update({
      where: { id: groupId },
      data: { passiveStudentIds: JSON.stringify(validIds) },
      select: {
        id: true,
        name: true,
        passiveStudentIds: true,
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('PUT /learning-groups/:id/passive-students:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Zuordnung von Inhalten zu Lerngruppen
router.post('/:groupId/assign', async (req: Request, res: Response) => {
  const { type, refId } = req.body;
  try {
    const assignment = await prisma.groupAssignment.create({
      data: {
        groupId: req.params.groupId,
        type,
        refId,
      },
    });
    res.json(assignment);
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

router.delete('/:groupId/assign', async (req: Request, res: Response) => {
  const { type, refId } = req.body;
  try {
    const deleted = await prisma.groupAssignment.deleteMany({
      where: {
        groupId: req.params.groupId,
        type,
        refId,
      },
    });
    res.json({ deleted: deleted.count });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Delete a learning group by ID
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Zuerst alle zugehörigen GroupAssignments löschen
    await prisma.groupAssignment.deleteMany({ where: { groupId: req.params.id } });
    // Dann alle zugehörigen GradingSchemas löschen
    await prisma.gradingSchema.deleteMany({ where: { groupId: req.params.id } });
    // Jetzt die Lerngruppe selbst löschen
    await prisma.learningGroup.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get assigned folders for a learning group
router.get('/:id/folders', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id;
    
    const assignments = await prisma.groupAssignment.findMany({
      where: { 
        groupId: groupId,
        type: 'FOLDER'
      },
      select: {
        id: true,
        refId: true,
        displayOrder: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const folders = assignments.map(assignment => ({
      id: assignment.id,
      path: assignment.refId,
      displayOrder: assignment.displayOrder,
    }));

    res.json(folders);
  } catch (error) {
    console.error('Error fetching assigned folders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reorder assigned folders for a learning group
router.put('/:id/folders/reorder', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id;
    const { paths } = req.body;

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: 'paths ist erforderlich' });
    }

    const assignments = await prisma.groupAssignment.findMany({
      where: {
        groupId,
        type: 'FOLDER',
        refId: { in: paths.map(String) },
      },
      select: { id: true, refId: true },
    });

    if (assignments.length !== paths.length) {
      return res.status(403).json({ error: 'Ungültige Ordner-Pfade für diese Gruppe' });
    }

    await prisma.$transaction(
      paths.map((path: string, index: number) =>
        prisma.groupAssignment.updateMany({
          where: { groupId, type: 'FOLDER', refId: String(path) },
          data: { displayOrder: index },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering assigned folders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign a folder to a learning group
router.post('/:id/folders', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id;
    let { path } = req.body;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Pfad ist erforderlich' });
    }

    // Portable speichern (Mac-Absolut → git-intern/…)
    const markers = ['/J-M-Reihen/', 'J-M-Reihen/', '/git-intern/', 'git-intern/'];
    let portable = String(path).replace(/\\/g, '/').replace(/\/+$/, '');
    for (const m of markers) {
      const i = portable.indexOf(m);
      if (i >= 0) {
        const rest = portable.slice(i + m.length).replace(/^\/+/, '');
        portable = rest ? `git-intern/${rest}` : 'git-intern';
        break;
      }
    }
    path = portable;

    // Check if folder is already assigned (auch Alt-Schreibweisen)
    const existingAssignment = await prisma.groupAssignment.findFirst({
      where: {
        groupId: groupId,
        type: 'FOLDER',
        OR: [
          { refId: path },
          { refId: { endsWith: path.replace(/^git-intern\//, '') } },
        ],
      },
    });

    if (existingAssignment) {
      return res.status(400).json({ error: 'Ordner ist bereits zugeordnet' });
    }

    const maxOrder = await prisma.groupAssignment.aggregate({
      where: { groupId, type: 'FOLDER' },
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    // Create new assignment
    const assignment = await prisma.groupAssignment.create({
      data: {
        groupId: groupId,
        type: 'FOLDER',
        refId: path,
        displayOrder: nextOrder,
      }
    });

    res.json(assignment);
  } catch (error) {
    console.error('Error assigning folder:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a folder assignment from a learning group
router.delete('/:id/folders/:path(*)', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id;
    const folderPath = req.params.path;
    
    // Find and delete the assignment
    const assignment = await prisma.groupAssignment.findFirst({
      where: {
        groupId: groupId,
        type: 'FOLDER',
        refId: folderPath
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Ordner-Zuordnung nicht gefunden' });
    }

    await prisma.groupAssignment.delete({
      where: { id: assignment.id }
    });

    res.json({ message: 'Ordner-Zuordnung erfolgreich entfernt' });
  } catch (error) {
    console.error('Error removing folder assignment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 