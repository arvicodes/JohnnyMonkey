"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJourney = getJourney;
exports.postCare = postCare;
const client_1 = require("@prisma/client");
const journeyService_1 = require("../services/journeyService");
const prisma = new client_1.PrismaClient();
async function getStudentFromRequest(req) {
    const loginCode = req.headers['x-login-code'];
    if (!(loginCode === null || loginCode === void 0 ? void 0 : loginCode.trim())) {
        return { error: 401, message: 'Nicht angemeldet' };
    }
    const user = await prisma.user.findUnique({
        where: { loginCode: loginCode.trim() },
        select: { id: true, role: true },
    });
    if (!user || user.role !== 'STUDENT') {
        return { error: 403, message: 'Nur für Schülerkonten' };
    }
    return { user };
}
async function getJourney(req, res) {
    try {
        const auth = await getStudentFromRequest(req);
        if ('error' in auth) {
            return res.status(auth.error).json({ error: auth.message });
        }
        const row = await (0, journeyService_1.ensureDailyVisitBonus)(auth.user.id);
        res.json((0, journeyService_1.serializeProgress)(row));
    }
    catch (e) {
        console.error('getJourney', e);
        res.status(500).json({ error: 'Reise konnte nicht geladen werden' });
    }
}
async function postCare(req, res) {
    try {
        const auth = await getStudentFromRequest(req);
        if ('error' in auth) {
            return res.status(auth.error).json({ error: auth.message });
        }
        const result = await (0, journeyService_1.applyEggCare)(auth.user.id);
        if (!result.ok) {
            if (result.reason === 'no_egg') {
                return res.status(400).json({ error: 'Du hast kein Ei zum Pflegen.' });
            }
            return res.status(400).json({ error: 'Heute warst du schon beim Pflegen. Komm morgen wieder!' });
        }
        res.json((0, journeyService_1.serializeProgress)(result.progress));
    }
    catch (e) {
        console.error('postCare', e);
        res.status(500).json({ error: 'Pflege konnte nicht gespeichert werden' });
    }
}
//# sourceMappingURL=JourneyController.js.map