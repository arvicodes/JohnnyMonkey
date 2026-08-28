"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KACorrectionController = void 0;
const client_1 = require("@prisma/client");
const loginCodeCrypto_1 = require("../utils/loginCodeCrypto");
const prisma = new client_1.PrismaClient();
/**
 * Helper-Funktion: Prüft ob eine Datei eine korrigierbare Datei ist (KA_, HÜ_, HU_)
 */
function isCorrectionFile(fileName) {
    return fileName.startsWith('KA_') || fileName.startsWith('HÜ_') || fileName.startsWith('HU_');
}
/**
 * Helper-Funktion: Generiert mögliche Pfad-Varianten für eine Datei
 */
function getPossiblePaths(filePath) {
    const possiblePaths = [
        filePath,
        filePath.replace('.html', ''),
        filePath.replace('.htm', ''),
    ];
    // Entferne Präfixe und füge sie wieder hinzu
    if (filePath.startsWith('KA_')) {
        const withoutPrefix = filePath.replace('KA_', '');
        possiblePaths.push(withoutPrefix, `KA_${withoutPrefix}`);
    }
    else if (filePath.startsWith('HÜ_')) {
        const withoutPrefix = filePath.replace('HÜ_', '');
        possiblePaths.push(withoutPrefix, `HÜ_${withoutPrefix}`, `HU_${withoutPrefix}`);
    }
    else if (filePath.startsWith('HU_')) {
        const withoutPrefix = filePath.replace('HU_', '');
        possiblePaths.push(withoutPrefix, `HU_${withoutPrefix}`, `HÜ_${withoutPrefix}`);
    }
    else {
        // Wenn kein Präfix vorhanden, füge alle möglichen hinzu
        possiblePaths.push(`KA_${filePath}`, `HÜ_${filePath}`, `HU_${filePath}`);
    }
    // Entferne Duplikate
    return [...new Set(possiblePaths)];
}
class KACorrectionController {
    /**
     * Abgabe einer Klassenarbeit speichern
     */
    static async submitKA(req, res) {
        try {
            const { kaFilePath, answers, autoPoints } = req.body;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'STUDENT') {
                return res.status(403).json({ error: 'Nur Schüler können Klassenarbeiten abgeben' });
            }
            const studentId = user.id;
            if (!kaFilePath || !answers) {
                return res.status(400).json({ error: 'kaFilePath und answers sind erforderlich' });
            }
            // Prüfe ob bereits abgegeben
            const existing = await prisma.kASubmission.findUnique({
                where: {
                    kaFilePath_studentId: {
                        kaFilePath,
                        studentId
                    }
                }
            });
            // Debug: Log die eingehenden Daten
            console.log('📥 Neue Abgabe:', {
                kaFilePath,
                studentId,
                autoPoints,
                answersCount: Object.keys(answers || {}).length
            });
            if (existing) {
                console.log('⚠️ Abgabe existiert bereits:', existing.id);
                return res.status(400).json({ error: 'Klassenarbeit wurde bereits abgegeben' });
            }
            const submission = await prisma.kASubmission.create({
                data: {
                    kaFilePath,
                    studentId,
                    answers: JSON.stringify(answers),
                    autoPoints: autoPoints || 0,
                    totalPoints: autoPoints || 0,
                    status: 'submitted'
                }
            });
            console.log('✅ Abgabe gespeichert:', {
                id: submission.id,
                kaFilePath: submission.kaFilePath,
                studentId: submission.studentId,
                status: submission.status
            });
            res.json({ success: true, submission });
        }
        catch (error) {
            console.error('Error submitting KA:', error);
            res.status(500).json({ error: 'Fehler beim Speichern der Abgabe' });
        }
    }
    /**
     * Alle Abgaben für eine Klassenarbeit abrufen (für Lehrer)
     */
    static async getSubmissions(req, res) {
        let kaFilePath = '';
        let fileName = '';
        try {
            const kaFilePathParam = req.query.kaFilePath;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrer können Abgaben einsehen' });
            }
            const teacherId = user.id;
            console.log('👤 Lehrer ID:', teacherId);
            if (!teacherId) {
                return res.status(500).json({ error: 'Lehrer-ID nicht gefunden' });
            }
            if (!kaFilePathParam || typeof kaFilePathParam !== 'string') {
                return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
            }
            kaFilePath = kaFilePathParam;
            // SOFORTIGE LÖSUNG: Einfachste Methode - hole ALLE und filtere
            console.log('🔍 Suche Abgaben für kaFilePath:', kaFilePath);
            // Extrahiere den Dateinamen
            fileName = kaFilePath.split('/').pop() || kaFilePath;
            const fileNameWithoutExt = fileName.replace(/\.(html|htm)$/i, '');
            const fileNameLower = fileName.toLowerCase();
            console.log('🔍 Dateiname:', fileName);
            let submissions = [];
            try {
                // Schritt 1: Hole ALLE Submissions (ohne include, um Fehler zu vermeiden)
                const allSubmissionsRaw = await prisma.kASubmission.findMany({
                    where: {
                        status: {
                            in: ['submitted', 'expired', 'corrected']
                        }
                    },
                    select: {
                        id: true,
                        kaFilePath: true,
                        status: true,
                        studentId: true,
                        submittedAt: true
                    },
                    orderBy: {
                        submittedAt: 'desc'
                    }
                });
                console.log(`📊 Gesamt Submissions: ${allSubmissionsRaw.length}`);
                // Schritt 2: Filtere nach Dateiname
                const matchingIds = allSubmissionsRaw
                    .filter(sub => {
                    const subFileName = sub.kaFilePath.split('/').pop() || sub.kaFilePath;
                    return subFileName.toLowerCase() === fileNameLower;
                })
                    .map(sub => sub.id);
                console.log(`✅ Gefundene IDs: ${matchingIds.length}`);
                // Schritt 3: Lade mit include nur die gefundenen
                if (matchingIds.length > 0) {
                    submissions = await prisma.kASubmission.findMany({
                        where: {
                            id: { in: matchingIds }
                        },
                        include: {
                            student: {
                                select: {
                                    id: true,
                                    name: true,
                                    loginCode: true
                                }
                            },
                            corrections: {
                                where: {
                                    teacherId: teacherId
                                }
                            }
                        },
                        orderBy: {
                            submittedAt: 'desc'
                        }
                    });
                }
                console.log(`✅ Final: ${submissions.length} Submissions`);
            }
            catch (queryError) {
                console.error('❌ Fehler:', queryError);
                throw queryError;
            }
            // Falls immer noch keine gefunden, versuche alternative Suche
            if (submissions.length === 0) {
                console.log('⚠️ Keine Submissions mit exaktem Match gefunden, versuche Varianten...');
                // Hole alle Submissions und filtere manuell (da Prisma SQLite keine case-insensitive Suche unterstützt)
                const allSubmissionsForVariantSearch = await prisma.kASubmission.findMany({
                    where: {
                        status: {
                            in: ['submitted', 'expired', 'corrected']
                        }
                    },
                    include: {
                        student: {
                            select: {
                                id: true,
                                name: true,
                                loginCode: true
                            }
                        },
                        corrections: {
                            where: {
                                teacherId
                            }
                        }
                    },
                    orderBy: {
                        submittedAt: 'desc'
                    }
                });
                // Filtere manuell mit case-insensitive Vergleich
                // WICHTIG: Studenten speichern oft nur den Dateinamen (z.B. "HU_geometrische-abbildungen.html")
                // Lehrer verwenden vollständigen Pfad (z.B. "J-M-Reihen/Mathe/.../HU_geometrische-abbildungen.html")
                console.log(`🔍 Filtere ${allSubmissionsForVariantSearch.length} Submissions mit Dateiname: ${fileName}`);
                submissions = allSubmissionsForVariantSearch.filter(sub => {
                    var _a;
                    const subPathLower = sub.kaFilePath.toLowerCase();
                    const subFileName = sub.kaFilePath.split('/').pop() || sub.kaFilePath;
                    const subFileNameLower = subFileName.toLowerCase();
                    const subFileNameWithoutExt = subFileName.replace(/\.(html|htm)$/i, '').toLowerCase();
                    // Prüfe alle möglichen Matches - PRIORITÄT: Dateiname-Match
                    const matches = sub.kaFilePath === fileName ||
                        subPathLower === fileName.toLowerCase() ||
                        subFileName === fileName ||
                        subFileNameLower === fileName.toLowerCase() ||
                        subFileName === fileNameWithoutExt ||
                        subFileNameLower === fileNameWithoutExt.toLowerCase() ||
                        subFileNameWithoutExt === fileNameWithoutExt.toLowerCase() ||
                        // Auch umgekehrt: Prüfe ob der gesuchte Dateiname im gespeicherten Pfad vorkommt
                        subFileName.includes(fileNameWithoutExt) ||
                        subFileNameLower.includes(fileNameWithoutExt.toLowerCase());
                    if (matches) {
                        console.log(`✅ Match gefunden: ${sub.kaFilePath} (Student: ${(_a = sub.student) === null || _a === void 0 ? void 0 : _a.name})`);
                    }
                    return matches;
                });
                console.log(`✅ Nach Varianten-Suche: ${submissions.length} Submissions gefunden`);
            }
            // Falls immer noch keine gefunden, hole alle Submissions und filtere manuell mit erweiterten Kriterien
            if (submissions.length === 0) {
                console.log('⚠️ Keine Submissions mit Varianten gefunden, suche in allen Submissions...');
                const allSubmissionsForFilter = await prisma.kASubmission.findMany({
                    where: {
                        status: {
                            in: ['submitted', 'expired', 'corrected']
                        }
                    },
                    include: {
                        student: {
                            select: {
                                id: true,
                                name: true,
                                loginCode: true
                            }
                        },
                        corrections: {
                            where: {
                                teacherId
                            }
                        }
                    },
                    orderBy: {
                        submittedAt: 'desc'
                    }
                });
                // Filtere manuell: Prüfe ob der Dateiname im kaFilePath enthalten ist
                // WICHTIG: Studenten speichern oft nur den Dateinamen, Lehrer verwenden den vollständigen Pfad
                submissions = allSubmissionsForFilter.filter(sub => {
                    const subFileName = sub.kaFilePath.split('/').pop() || sub.kaFilePath;
                    const subFileNameWithoutExt = subFileName.replace(/\.(html|htm)$/i, '');
                    const subFileNameLower = subFileName.toLowerCase();
                    const fileNameLower = fileName.toLowerCase();
                    const fileNameWithoutExtLower = fileNameWithoutExt.toLowerCase();
                    // Prüfe verschiedene Match-Varianten
                    return subFileName === fileName ||
                        subFileNameLower === fileNameLower ||
                        subFileNameWithoutExt === fileNameWithoutExt ||
                        subFileNameWithoutExt.toLowerCase() === fileNameWithoutExtLower ||
                        sub.kaFilePath === kaFilePath ||
                        sub.kaFilePath.toLowerCase() === kaFilePath.toLowerCase() ||
                        sub.kaFilePath.includes(fileName) ||
                        sub.kaFilePath.toLowerCase().includes(fileNameLower) ||
                        sub.kaFilePath.includes(fileNameWithoutExt) ||
                        sub.kaFilePath.toLowerCase().includes(fileNameWithoutExtLower) ||
                        // Auch umgekehrt: Prüfe ob der gesuchte Dateiname im gespeicherten Pfad vorkommt
                        subFileName.includes(fileNameWithoutExt) ||
                        subFileNameLower.includes(fileNameWithoutExtLower);
                });
                console.log(`✅ Nach manuellem Filtern: ${submissions.length} Submissions gefunden`);
            }
            console.log(`✅ Gefunden: ${submissions.length} Submissions`);
            console.log('📋 Submissions Details:', submissions.map(s => {
                var _a;
                return ({
                    id: s.id,
                    kaFilePath: s.kaFilePath,
                    studentName: ((_a = s.student) === null || _a === void 0 ? void 0 : _a.name) || 'Unbekannt',
                    status: s.status
                });
            }));
            res.json({ submissions });
        }
        catch (error) {
            console.error('❌ Error getting submissions:', error);
            console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : 'Unbekannter Fehler',
                kaFilePath: kaFilePath || 'unknown',
                fileName: fileName || 'unknown',
                errorName: error instanceof Error ? error.name : 'Unknown',
                errorString: String(error)
            });
            res.status(500).json({
                error: 'Fehler beim Abrufen der Abgaben',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
    /**
     * Einzelne Abgabe mit Details abrufen
     */
    static async getSubmission(req, res) {
        try {
            const { id } = req.params;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrer können Abgaben einsehen' });
            }
            const teacherId = user.id;
            const submission = await prisma.kASubmission.findUnique({
                where: { id },
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            loginCode: true
                        }
                    },
                    corrections: {
                        where: {
                            teacherId
                        },
                        orderBy: {
                            taskNumber: 'asc'
                        }
                    }
                }
            });
            if (!submission) {
                return res.status(404).json({ error: 'Abgabe nicht gefunden' });
            }
            res.json({ submission });
        }
        catch (error) {
            console.error('Error getting submission:', error);
            res.status(500).json({ error: 'Fehler beim Abrufen der Abgabe' });
        }
    }
    /**
     * Korrektur speichern/aktualisieren
     */
    static async saveCorrection(req, res) {
        try {
            const { submissionId, taskNumber, manualPoints, comment } = req.body;
            const loginCode = req.headers['x-login-code'];
            console.log('💾 Speichere Korrektur:', {
                submissionId,
                taskNumber,
                manualPoints,
                comment: comment ? comment.substring(0, 50) + '...' : null,
                loginCode: loginCode ? 'vorhanden' : 'fehlt'
            });
            if (!loginCode) {
                console.error('❌ Kein Login-Code vorhanden');
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user) {
                console.error('❌ Benutzer nicht gefunden für Login-Code');
                return res.status(401).json({ error: 'Benutzer nicht gefunden' });
            }
            if (user.role !== 'TEACHER') {
                console.error('❌ Benutzer ist kein Lehrer:', user.role);
                return res.status(403).json({ error: 'Nur Lehrer können korrigieren' });
            }
            const teacherId = user.id;
            if (!submissionId || !taskNumber) {
                console.error('❌ Fehlende Parameter:', { submissionId, taskNumber });
                return res.status(400).json({ error: 'submissionId und taskNumber sind erforderlich' });
            }
            // Prüfe ob Submission existiert
            const submission = await prisma.kASubmission.findUnique({
                where: { id: submissionId }
            });
            if (!submission) {
                console.error('❌ Submission nicht gefunden:', submissionId);
                return res.status(404).json({ error: 'Abgabe nicht gefunden' });
            }
            console.log('✅ Submission gefunden:', {
                id: submission.id,
                kaFilePath: submission.kaFilePath,
                autoPoints: submission.autoPoints
            });
            // Upsert Korrektur
            const correction = await prisma.kACorrection.upsert({
                where: {
                    submissionId_taskNumber: {
                        submissionId,
                        taskNumber
                    }
                },
                create: {
                    submissionId,
                    teacherId,
                    taskNumber,
                    manualPoints: manualPoints !== undefined && manualPoints !== null ? manualPoints : null,
                    comment: comment || null
                },
                update: {
                    manualPoints: manualPoints !== undefined && manualPoints !== null ? manualPoints : null,
                    comment: comment || null,
                    updatedAt: new Date()
                }
            });
            console.log('✅ Korrektur gespeichert:', {
                id: correction.id,
                taskNumber: correction.taskNumber,
                manualPoints: correction.manualPoints
            });
            // Berechne Gesamtpunkte neu
            const allCorrections = await prisma.kACorrection.findMany({
                where: { submissionId }
            });
            const totalManualPoints = allCorrections.reduce((sum, c) => sum + (c.manualPoints || 0), 0);
            const totalPoints = submission.autoPoints + totalManualPoints;
            console.log('📊 Punkteberechnung:', {
                autoPoints: submission.autoPoints,
                totalManualPoints,
                totalPoints
            });
            // Update Submission
            await prisma.kASubmission.update({
                where: { id: submissionId },
                data: {
                    totalPoints,
                    status: 'corrected'
                }
            });
            console.log('✅ Submission aktualisiert mit Gesamtpunkten:', totalPoints);
            res.json({ success: true, correction, totalPoints });
        }
        catch (error) {
            console.error('❌ Fehler beim Speichern der Korrektur:', error);
            console.error('Fehler-Details:', {
                message: error instanceof Error ? error.message : 'Unbekannter Fehler',
                stack: error instanceof Error ? error.stack : undefined
            });
            res.status(500).json({
                error: 'Fehler beim Speichern der Korrektur',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
    /**
     * Alle Abgaben für eine Klassenarbeit zurücksetzen (nur für Lehrer, nur zu Testzwecken)
     */
    static async resetAllSubmissions(req, res) {
        try {
            const { kaFilePath } = req.body;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrer können Abgaben zurücksetzen' });
            }
            if (!kaFilePath || typeof kaFilePath !== 'string') {
                return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
            }
            // Versuche auch mit verschiedenen Varianten zu suchen (falls es Unterschiede gibt)
            const uniquePaths = getPossiblePaths(kaFilePath);
            console.log('🔍 Lösche Abgaben für Pfade:', uniquePaths);
            // Finde alle Submissions für diese KA (mit allen Varianten)
            const submissions = await prisma.kASubmission.findMany({
                where: {
                    OR: uniquePaths.map(path => ({
                        kaFilePath: path
                    }))
                }
            });
            console.log(`🗑️ Gefunden: ${submissions.length} Abgabe(n) für ${kaFilePath}`);
            // Lösche alle Submissions (Cascade löscht auch die Korrekturen)
            const deleted = await prisma.kASubmission.deleteMany({
                where: {
                    OR: uniquePaths.map(path => ({
                        kaFilePath: path
                    }))
                }
            });
            console.log(`✅ ${deleted.count} Abgabe(n) gelöscht`);
            res.json({
                success: true,
                deletedCount: deleted.count,
                message: `${deleted.count} Abgabe(n) wurden zurückgesetzt`
            });
        }
        catch (error) {
            console.error('Error resetting submissions:', error);
            res.status(500).json({ error: 'Fehler beim Zurücksetzen der Abgaben' });
        }
    }
    /**
     * Status der Abgabe aktualisieren (z.B. wenn Zeit abgelaufen)
     */
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, expiredAt } = req.body;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user) {
                return res.status(401).json({ error: 'Benutzer nicht gefunden' });
            }
            const studentId = user.id;
            const submission = await prisma.kASubmission.update({
                where: { id },
                data: {
                    status: status || 'expired',
                    expiredAt: expiredAt ? new Date(expiredAt) : new Date()
                }
            });
            res.json({ success: true, submission });
        }
        catch (error) {
            console.error('Error updating status:', error);
            res.status(500).json({ error: 'Fehler beim Aktualisieren des Status' });
        }
    }
    /**
     * Prüfe ob eine Submission für einen Schüler existiert (für Schüler)
     */
    static async checkMySubmission(req, res) {
        try {
            const { kaFilePath } = req.query;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'STUDENT') {
                return res.status(403).json({ error: 'Nur Schüler können diese Funktion nutzen' });
            }
            if (!kaFilePath || typeof kaFilePath !== 'string') {
                return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
            }
            const studentId = user.id;
            console.log('🔍 checkMySubmission:', {
                kaFilePath,
                studentId,
                loginCode: loginCode ? 'vorhanden' : 'fehlt'
            });
            // Prüfe ob eine Submission für diesen Schüler existiert
            // Versuche auch mit verschiedenen Varianten (HU_ vs HÜ_)
            const uniquePaths = getPossiblePaths(kaFilePath);
            console.log('🔍 Prüfe Pfade:', uniquePaths);
            // Zuerst: Suche mit exaktem Match
            let submission = await prisma.kASubmission.findUnique({
                where: {
                    kaFilePath_studentId: {
                        kaFilePath,
                        studentId
                    }
                },
                select: {
                    id: true,
                    status: true
                }
            });
            console.log('🔍 Exakte Suche Ergebnis:', submission ? 'gefunden' : 'nicht gefunden');
            // Falls keine gefunden, versuche mit Varianten
            if (!submission) {
                const submissions = await prisma.kASubmission.findMany({
                    where: {
                        OR: uniquePaths.map(path => ({
                            kaFilePath: path
                        })),
                        studentId
                    },
                    select: {
                        id: true,
                        status: true
                    },
                    take: 1
                });
                console.log('🔍 Varianten-Suche Ergebnis:', submissions.length > 0 ? 'gefunden' : 'nicht gefunden');
                if (submissions.length > 0) {
                    submission = submissions[0];
                }
            }
            const exists = !!submission;
            console.log('🔍 Finales Ergebnis:', exists ? 'Submission existiert' : 'Keine Submission');
            res.json({
                exists,
                submission: submission || null
            });
        }
        catch (error) {
            console.error('Error checking submission:', error);
            res.status(500).json({ error: 'Fehler beim Prüfen der Abgabe' });
        }
    }
    /**
     * Alle Noten für eine Klassenarbeit freigeben/zurücknehmen (nur für Lehrer)
     */
    static async releaseAllGrades(req, res) {
        try {
            const { kaFilePath } = req.body;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrer können Noten freigeben' });
            }
            if (!kaFilePath || typeof kaFilePath !== 'string') {
                return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
            }
            // Versuche auch mit verschiedenen Varianten zu suchen
            const uniquePaths = getPossiblePaths(kaFilePath);
            // Finde alle Submissions für diese KA
            const submissions = await prisma.kASubmission.findMany({
                where: {
                    OR: uniquePaths.map(path => ({
                        kaFilePath: path
                    }))
                }
            });
            if (submissions.length === 0) {
                return res.status(404).json({ error: 'Keine Abgaben für diese Klassenarbeit gefunden' });
            }
            // Prüfe ob alle bereits freigegeben sind
            const allReleased = submissions.every(sub => sub.isReleased);
            const newReleaseStatus = !allReleased;
            // Aktualisiere alle Submissions
            const result = await prisma.kASubmission.updateMany({
                where: {
                    OR: uniquePaths.map(path => ({
                        kaFilePath: path
                    }))
                },
                data: {
                    isReleased: newReleaseStatus
                }
            });
            console.log(`✅ ${result.count} Abgabe(n) ${newReleaseStatus ? 'freigegeben' : 'zurückgenommen'}`);
            res.json({
                success: true,
                isReleased: newReleaseStatus,
                count: result.count,
                message: `${result.count} Abgabe(n) wurden ${newReleaseStatus ? 'freigegeben' : 'zurückgenommen'}`
            });
        }
        catch (error) {
            console.error('Error releasing grades:', error);
            res.status(500).json({ error: 'Fehler beim Freigeben der Noten' });
        }
    }
    /**
     * Prüfe Freigabestatus für eine Klassenarbeit (nur für Lehrer)
     */
    static async getReleaseStatus(req, res) {
        var _a, _b;
        try {
            const { kaFilePath } = req.query;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrer können den Freigabestatus prüfen' });
            }
            if (!kaFilePath || typeof kaFilePath !== 'string') {
                return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
            }
            // Versuche auch mit verschiedenen Varianten zu suchen
            const uniquePaths = getPossiblePaths(kaFilePath);
            // Finde alle Submissions für diese KA
            // Prüfe zuerst, ob isReleased Feld existiert (Prisma Client könnte veraltet sein)
            let submissions;
            try {
                submissions = await prisma.kASubmission.findMany({
                    where: {
                        OR: uniquePaths.map(path => ({
                            kaFilePath: path
                        }))
                    },
                    select: {
                        isReleased: true
                    }
                });
            }
            catch (e) {
                // Wenn isReleased nicht existiert (Prisma Client veraltet), lade alle Felder
                if (((_a = e === null || e === void 0 ? void 0 : e.message) === null || _a === void 0 ? void 0 : _a.includes('Unknown field')) || ((_b = e === null || e === void 0 ? void 0 : e.message) === null || _b === void 0 ? void 0 : _b.includes('isReleased'))) {
                    console.warn('⚠️ isReleased Feld nicht verfügbar (Prisma Client veraltet), lade alle Submissions');
                    const allSubmissions = await prisma.kASubmission.findMany({
                        where: {
                            OR: uniquePaths.map(path => ({
                                kaFilePath: path
                            }))
                        }
                    });
                    submissions = allSubmissions.map(sub => ({ isReleased: sub.isReleased || false }));
                }
                else {
                    throw e;
                }
            }
            if (submissions.length === 0) {
                return res.json({ isReleased: false, count: 0 });
            }
            // Prüfe ob alle freigegeben sind
            const allReleased = submissions.length > 0 && submissions.every(sub => sub.isReleased);
            res.json({
                isReleased: allReleased,
                count: submissions.length
            });
        }
        catch (error) {
            console.error('Error checking release status:', error);
            res.status(500).json({ error: 'Fehler beim Prüfen des Freigabestatus' });
        }
    }
}
exports.KACorrectionController = KACorrectionController;
//# sourceMappingURL=KACorrectionController.js.map