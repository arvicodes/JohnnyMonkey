"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentSubmissionStats = exports.deleteSubmission = exports.addTeacherComment = exports.checkStudentSubmission = exports.downloadSubmission = exports.getAssignmentSubmissions = exports.getSubmission = exports.submitAssignment = exports.getOrCreateAssignment = exports.upload = void 0;
const client_1 = require("@prisma/client");
const journeyService_1 = require("../services/journeyService");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
// Erstelle Upload-Verzeichnis wenn nicht vorhanden
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/submissions');
// Initialisiere Upload-Verzeichnis
const initUploadDir = async () => {
    try {
        await promises_1.default.mkdir(UPLOAD_DIR, { recursive: true });
    }
    catch (error) {
        console.error('Fehler beim Erstellen des Upload-Verzeichnisses:', error);
    }
};
initUploadDir();
// Multer-Konfiguration für File-Uploads
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueId = (0, uuid_1.v4)();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
    }
});
// Erlaubte Dateitypen
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'video/mp4',
        'video/x-msvideo',
        'video/webm',
        'video/quicktime',
        'audio/mpeg',
        'audio/mp4',
        'audio/wav',
        'audio/x-wav',
        'audio/webm',
        'audio/ogg',
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Dateityp nicht erlaubt. Erlaubt sind: Word, Excel, PowerPoint, PDF und Bilder.'));
    }
};
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 150 * 1024 * 1024 // 150 MB (Videos)
    }
});
/**
 * Erstellt oder findet ein Assignment für eine H_ Datei
 */
const getOrCreateAssignment = async (req, res) => {
    try {
        const { filePath, fileName, teacherId } = req.body;
        if (!filePath || !fileName || !teacherId) {
            return res.status(400).json({ error: 'filePath, fileName und teacherId sind erforderlich' });
        }
        // Prüfe ob die Datei mit H_ oder WA_ beginnt (Wochenaufgaben-Abgaben)
        const isHomework = fileName.startsWith('H_');
        const isWochenaufgabe = fileName.startsWith('WA_');
        if (!isHomework && !isWochenaufgabe) {
            return res.status(400).json({ error: 'Nur H_- oder WA_-Abgabedateien sind erlaubt' });
        }
        // Prüfe ob der Teacher existiert
        const teacher = await prisma.user.findUnique({
            where: { id: teacherId }
        });
        if (!teacher) {
            return res.status(404).json({
                error: 'Lehrkraft nicht gefunden. Bitte melden Sie sich ab und wieder an.'
            });
        }
        // Finde oder erstelle Assignment - verwende findFirst statt findUnique für composite constraint
        let assignment = await prisma.assignment.findFirst({
            where: {
                filePath: filePath,
                teacherId: teacherId
            },
            include: {
                submissions: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                name: true,
                                avatarEmoji: true
                            }
                        }
                    }
                }
            }
        });
        if (!assignment) {
            // Versuche Assignment zu erstellen, oder hole es wenn es bereits existiert
            try {
                assignment = await prisma.assignment.create({
                    data: {
                        fileName: fileName,
                        filePath: filePath,
                        teacherId: teacherId
                    },
                    include: {
                        submissions: {
                            include: {
                                student: {
                                    select: {
                                        id: true,
                                        name: true,
                                        avatarEmoji: true
                                    }
                                }
                            }
                        }
                    }
                });
            }
            catch (createError) {
                // Bei Unique Constraint Error: Assignment existiert bereits, hole es erneut
                if (createError.code === 'P2002') {
                    assignment = await prisma.assignment.findFirst({
                        where: {
                            filePath: filePath,
                            teacherId: teacherId
                        },
                        include: {
                            submissions: {
                                include: {
                                    student: {
                                        select: {
                                            id: true,
                                            name: true,
                                            avatarEmoji: true
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
                else {
                    throw createError;
                }
            }
        }
        res.json(assignment);
    }
    catch (error) {
        console.error('Fehler beim Abrufen/Erstellen des Assignments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.getOrCreateAssignment = getOrCreateAssignment;
/**
 * Schüler lädt eine Abgabe hoch (weitere Dateien möglich; optional ersetzen)
 */
const submitAssignment = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Keine Datei hochgeladen' });
        }
        const { assignmentId, studentId, displayName, replaceSubmissionId, allowMultiple } = req.body;
        const multi = allowMultiple === true || allowMultiple === 'true';
        if (!assignmentId || !studentId) {
            await promises_1.default.unlink(file.path);
            return res.status(400).json({ error: 'assignmentId und studentId sind erforderlich' });
        }
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId }
        });
        if (!assignment) {
            await promises_1.default.unlink(file.path);
            return res.status(404).json({ error: 'Assignment nicht gefunden' });
        }
        const originalExt = path_1.default.extname(file.originalname);
        let originalFileName = String(displayName || file.originalname || 'Abgabe').trim() || file.originalname;
        // Endung beibehalten, falls beim Umbenennen weggelassen
        if (originalExt && !path_1.default.extname(originalFileName)) {
            originalFileName = `${originalFileName}${originalExt}`;
        }
        const studentInclude = {
            student: {
                select: {
                    id: true,
                    name: true,
                    avatarEmoji: true
                }
            }
        };
        let submission;
        let targetReplaceId = replaceSubmissionId ? String(replaceSubmissionId) : null;
        // Alte H_-Uploads: ohne allowMultiple weiter ersetzen (eine Datei)
        if (!targetReplaceId && !multi) {
            const existing = await prisma.submission.findFirst({
                where: { assignmentId, studentId },
                orderBy: { submittedAt: 'desc' }
            });
            if (existing)
                targetReplaceId = existing.id;
        }
        if (targetReplaceId) {
            const existing = await prisma.submission.findUnique({
                where: { id: targetReplaceId }
            });
            if (!existing || existing.studentId !== studentId || existing.assignmentId !== assignmentId) {
                await promises_1.default.unlink(file.path);
                return res.status(404).json({ error: 'Zu ersetzende Abgabe nicht gefunden' });
            }
            try {
                await promises_1.default.unlink(existing.filePath);
            }
            catch (error) {
                console.error('Fehler beim Löschen der alten Datei:', error);
            }
            submission = await prisma.submission.update({
                where: { id: existing.id },
                data: {
                    originalFileName,
                    storedFileName: file.filename,
                    filePath: file.path,
                    fileType: file.mimetype,
                    fileSize: file.size,
                    updatedAt: new Date()
                },
                include: studentInclude
            });
        }
        else {
            submission = await prisma.submission.create({
                data: {
                    assignmentId,
                    studentId,
                    originalFileName,
                    storedFileName: file.filename,
                    filePath: file.path,
                    fileType: file.mimetype,
                    fileSize: file.size
                },
                include: studentInclude
            });
        }
        try {
            await (0, journeyService_1.applyJourneyEvent)(studentId, 'homework_submit');
        }
        catch (journeyErr) {
            console.error('Reisebegleiter: homework_submit', journeyErr);
        }
        res.json(submission);
    }
    catch (error) {
        console.error('Fehler beim Hochladen der Abgabe:', error);
        if (req.file) {
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (unlinkError) {
                console.error('Fehler beim Löschen der Datei nach Fehler:', unlinkError);
            }
        }
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.submitAssignment = submitAssignment;
/**
 * Ruft Abgaben eines Schülers für ein Assignment ab (neueste zuerst)
 */
const getSubmission = async (req, res) => {
    try {
        const { assignmentId, studentId } = req.params;
        const submissions = await prisma.submission.findMany({
            where: {
                assignmentId,
                studentId
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        avatarEmoji: true
                    }
                },
                assignment: true
            },
            orderBy: { submittedAt: 'desc' }
        });
        if (submissions.length === 0) {
            return res.status(404).json({ error: 'Keine Abgabe gefunden' });
        }
        // Rückwärtskompatibel: eine Datei + Liste
        res.json({ ...submissions[0], submissions });
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Abgabe:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.getSubmission = getSubmission;
/**
 * Ruft alle Submissions für ein Assignment ab (für Lehrer)
 */
const getAssignmentSubmissions = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const submissions = await prisma.submission.findMany({
            where: {
                assignmentId: assignmentId
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        avatarEmoji: true
                    }
                }
            },
            orderBy: {
                submittedAt: 'desc'
            }
        });
        res.json(submissions);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Abgaben:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.getAssignmentSubmissions = getAssignmentSubmissions;
/**
 * Liefert die hochgeladene Datei aus
 */
const downloadSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId }
        });
        if (!submission) {
            return res.status(404).json({ error: 'Abgabe nicht gefunden' });
        }
        // Prüfe ob Datei existiert
        try {
            await promises_1.default.access(submission.filePath);
        }
        catch {
            return res.status(404).json({ error: 'Datei nicht gefunden' });
        }
        // Für PDFs und Bilder: inline anzeigen, für andere: download
        const isPdfOrImage = submission.fileType.includes('pdf') || submission.fileType.includes('image');
        if (isPdfOrImage) {
            // Zeige im Browser an
            res.setHeader('Content-Type', submission.fileType);
            res.setHeader('Content-Disposition', `inline; filename="${submission.originalFileName}"`);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'no-cache');
            // Für PDFs: Erlaube Einbettung in iframe
            if (submission.fileType.includes('pdf')) {
                res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            }
            const fileBuffer = await promises_1.default.readFile(submission.filePath);
            res.send(fileBuffer);
        }
        else {
            // Download für Word, Excel, etc.
            res.download(submission.filePath, submission.originalFileName);
        }
    }
    catch (error) {
        console.error('Fehler beim Download der Abgabe:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.downloadSubmission = downloadSubmission;
/**
 * Prüft ob ein Schüler bereits eine Abgabe für ein Assignment hat
 */
const checkStudentSubmission = async (req, res) => {
    try {
        const { filePath, studentId } = req.query;
        if (!filePath || !studentId) {
            return res.status(400).json({ error: 'filePath und studentId sind erforderlich' });
        }
        // Finde Assignment
        const assignment = await prisma.assignment.findFirst({
            where: {
                filePath: filePath
            }
        });
        if (!assignment) {
            return res.json({ hasSubmission: false, submission: null });
        }
        // Finde Submissions (mehrere Dateien möglich)
        const submissions = await prisma.submission.findMany({
            where: {
                assignmentId: assignment.id,
                studentId: studentId
            },
            orderBy: { submittedAt: 'desc' }
        });
        res.json({
            hasSubmission: submissions.length > 0,
            submission: submissions[0] || null,
            submissions,
            assignmentId: assignment.id
        });
    }
    catch (error) {
        console.error('Fehler beim Prüfen der Abgabe:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.checkStudentSubmission = checkStudentSubmission;
/**
 * Fügt einen Lehrer-Kommentar zu einer Submission hinzu
 */
const addTeacherComment = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { comment, teacherId } = req.body;
        if (!comment) {
            return res.status(400).json({ error: 'Kommentar ist erforderlich' });
        }
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                assignment: true
            }
        });
        if (!submission) {
            return res.status(404).json({ error: 'Abgabe nicht gefunden' });
        }
        // Prüfe ob der Lehrer berechtigt ist (ist der Ersteller des Assignments)
        if (submission.assignment.teacherId !== teacherId) {
            return res.status(403).json({ error: 'Keine Berechtigung' });
        }
        // Aktualisiere Submission mit Kommentar
        const updatedSubmission = await prisma.submission.update({
            where: { id: submissionId },
            data: {
                teacherComment: comment,
                commentedAt: new Date()
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        res.json(updatedSubmission);
    }
    catch (error) {
        console.error('Fehler beim Hinzufügen des Kommentars:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.addTeacherComment = addTeacherComment;
/**
 * Löscht eine Submission (nur für den Schüler selbst)
 */
const deleteSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { studentId } = req.body;
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId }
        });
        if (!submission) {
            return res.status(404).json({ error: 'Abgabe nicht gefunden' });
        }
        // Prüfe ob der Schüler die Berechtigung hat
        if (submission.studentId !== studentId) {
            return res.status(403).json({ error: 'Keine Berechtigung' });
        }
        // Lösche Datei
        try {
            await promises_1.default.unlink(submission.filePath);
        }
        catch (error) {
            console.error('Fehler beim Löschen der Datei:', error);
        }
        // Lösche Submission aus DB
        await prisma.submission.delete({
            where: { id: submissionId }
        });
        res.json({ message: 'Abgabe erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen der Abgabe:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.deleteSubmission = deleteSubmission;
/**
 * Holt alle Abgaben eines Schülers mit Kommentaren für die Statistik
 */
const getStudentSubmissionStats = async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({ error: 'studentId ist erforderlich' });
        }
        // Hole alle Submissions des Schülers
        const submissions = await prisma.submission.findMany({
            where: {
                studentId: studentId
            },
            include: {
                assignment: {
                    include: {
                        teacher: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                submittedAt: 'desc'
            }
        });
        // Formatiere die Daten für die Statistik
        const stats = submissions.map(submission => ({
            id: submission.id,
            fileName: submission.assignment.fileName,
            filePath: submission.assignment.filePath,
            originalFileName: submission.originalFileName,
            fileType: submission.fileType,
            submittedAt: submission.submittedAt,
            teacherComment: submission.teacherComment,
            commentedAt: submission.commentedAt,
            teacherName: submission.assignment.teacher.name,
            hasComment: !!submission.teacherComment
        }));
        res.json(stats);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Abgabestatistik:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.getStudentSubmissionStats = getStudentSubmissionStats;
//# sourceMappingURL=submissionController.js.map