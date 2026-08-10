"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOURNEY_THRESHOLD = void 0;
exports.getOrCreateProgress = getOrCreateProgress;
exports.ensureDailyVisitBonus = ensureDailyVisitBonus;
exports.applyJourneyEvent = applyJourneyEvent;
exports.applyEggCare = applyEggCare;
exports.serializeProgress = serializeProgress;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/** Mindestwert in jeder der drei Reisekräfte, damit das Ei erscheint */
exports.JOURNEY_THRESHOLD = 48;
function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
async function getOrCreateProgress(userId) {
    let row = await prisma.studentJourneyProgress.findUnique({ where: { userId } });
    if (!row) {
        row = await prisma.studentJourneyProgress.create({
            data: { userId },
        });
    }
    return row;
}
function minTriple(w, f, h) {
    return Math.min(w, f, h);
}
function maybeUnlockEgg(row) {
    if (row.companionStage !== 'JOURNEY')
        return null;
    if (minTriple(row.weitePoints, row.funkenPoints, row.hingabePoints) < exports.JOURNEY_THRESHOLD) {
        return null;
    }
    return { eggFoundAt: new Date() };
}
function evolvePostHatch(stage, postHatchXp) {
    if (stage !== 'HATCHLING' && stage !== 'YOUNG')
        return stage;
    let s = stage;
    if (s === 'HATCHLING' && postHatchXp >= 36)
        s = 'YOUNG';
    if (s === 'YOUNG' && postHatchXp >= 96)
        s = 'BUDDY';
    return s;
}
function addPostHatchXp(stage, amount, current) {
    if (stage === 'HATCHLING' || stage === 'YOUNG')
        return current + amount;
    return current;
}
/**
 * Täglicher Besuch: einmal pro Kalendertag Weite + Funken
 */
async function ensureDailyVisitBonus(userId) {
    const row = await getOrCreateProgress(userId);
    const key = todayKey();
    if (row.lastDailyVisitDate === key) {
        return row;
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    const isTeacher = (user === null || user === void 0 ? void 0 : user.role) === 'TEACHER';
    const weite = row.weitePoints + (isTeacher ? 3 : 4);
    const funken = row.funkenPoints + (isTeacher ? 3 : 2);
    const hingabe = row.hingabePoints + (isTeacher ? 3 : 0);
    const unlock = maybeUnlockEgg({
        ...row,
        weitePoints: weite,
        funkenPoints: funken,
        hingabePoints: hingabe,
    });
    const updated = await prisma.studentJourneyProgress.update({
        where: { userId },
        data: {
            weitePoints: weite,
            funkenPoints: funken,
            hingabePoints: hingabe,
            lastDailyVisitDate: key,
            ...(unlock
                ? {
                    companionStage: 'EGG',
                    eggFoundAt: unlock.eggFoundAt,
                    eggCarePercent: 0,
                }
                : {}),
        },
    });
    return updated;
}
async function applyJourneyEvent(userId, type, meta) {
    var _a;
    const row = await getOrCreateProgress(userId);
    let dWeite = 0;
    let dFunken = 0;
    let dHingabe = 0;
    let postExtra = 0;
    switch (type) {
        case 'quiz_complete':
            dWeite = 5;
            dFunken = 4;
            dHingabe = 6;
            postExtra = 10;
            break;
        case 'flashcard_session': {
            const n = Math.max(0, Math.min(40, (_a = meta === null || meta === void 0 ? void 0 : meta.cardsReviewed) !== null && _a !== void 0 ? _a : 0));
            const chunk = Math.max(1, Math.ceil(n / 4));
            dWeite = 3 + Math.min(6, chunk);
            dFunken = 2 + Math.min(4, Math.floor(chunk / 2));
            dHingabe = 4 + Math.min(10, chunk * 2);
            postExtra = 5 + Math.min(15, chunk);
            break;
        }
        case 'homework_submit':
            dWeite = 4;
            dHingabe = 8;
            dFunken = 2;
            postExtra = 8;
            break;
        default:
            break;
    }
    const weite = row.weitePoints + dWeite;
    const funken = row.funkenPoints + dFunken;
    const hingabe = row.hingabePoints + dHingabe;
    let companionStage = row.companionStage;
    let eggFoundAt = row.eggFoundAt;
    let eggCarePercent = row.eggCarePercent;
    let postHatchXp = row.postHatchXp;
    const unlock = maybeUnlockEgg({
        weitePoints: weite,
        funkenPoints: funken,
        hingabePoints: hingabe,
        companionStage,
    });
    if (unlock) {
        companionStage = 'EGG';
        eggFoundAt = unlock.eggFoundAt;
        eggCarePercent = 0;
    }
    if (companionStage === 'HATCHLING' || companionStage === 'YOUNG') {
        postHatchXp = addPostHatchXp(companionStage, postExtra, postHatchXp);
        companionStage = evolvePostHatch(companionStage, postHatchXp);
    }
    return prisma.studentJourneyProgress.update({
        where: { userId },
        data: {
            weitePoints: weite,
            funkenPoints: funken,
            hingabePoints: hingabe,
            companionStage,
            eggFoundAt: eggFoundAt !== null && eggFoundAt !== void 0 ? eggFoundAt : undefined,
            eggCarePercent,
            postHatchXp,
        },
    });
}
/**
 * Ei täglich pflegen (einmal pro Tag möglich)
 */
async function applyEggCare(userId) {
    const row = await getOrCreateProgress(userId);
    if (row.companionStage !== 'EGG') {
        return { ok: false, reason: 'no_egg' };
    }
    const key = todayKey();
    if (row.lastCareDate === key) {
        return { ok: false, reason: 'already_cared' };
    }
    const next = Math.min(100, row.eggCarePercent + 25);
    let companionStage = row.companionStage;
    let hatchedAt = row.hatchedAt;
    let eggCarePercent = next;
    if (next >= 100) {
        companionStage = 'HATCHLING';
        hatchedAt = new Date();
        eggCarePercent = 100;
    }
    const updated = await prisma.studentJourneyProgress.update({
        where: { userId },
        data: {
            eggCarePercent,
            lastCareDate: key,
            companionStage,
            hatchedAt: hatchedAt !== null && hatchedAt !== void 0 ? hatchedAt : undefined,
        },
    });
    return { ok: true, progress: updated };
}
function serializeProgress(row) {
    const minP = minTriple(row.weitePoints, row.funkenPoints, row.hingabePoints);
    const journeyComplete = minP >= exports.JOURNEY_THRESHOLD;
    const key = todayKey();
    const canCareToday = row.companionStage === 'EGG' && row.lastCareDate !== key;
    return {
        weitePoints: row.weitePoints,
        funkenPoints: row.funkenPoints,
        hingabePoints: row.hingabePoints,
        companionStage: row.companionStage,
        eggCarePercent: row.eggCarePercent,
        eggFoundAt: row.eggFoundAt,
        hatchedAt: row.hatchedAt,
        postHatchXp: row.postHatchXp,
        journeyThreshold: exports.JOURNEY_THRESHOLD,
        journeyComplete,
        minOfThree: minP,
        canCareToday,
    };
}
//# sourceMappingURL=journeyService.js.map