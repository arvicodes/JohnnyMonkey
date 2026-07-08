import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Mindestwert in jeder der drei Reisekräfte, damit das Ei erscheint */
export const JOURNEY_THRESHOLD = 48;

export type JourneyEventType = 'quiz_complete' | 'flashcard_session' | 'homework_submit';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getOrCreateProgress(userId: string) {
  let row = await prisma.studentJourneyProgress.findUnique({ where: { userId } });
  if (!row) {
    row = await prisma.studentJourneyProgress.create({
      data: { userId },
    });
  }
  return row;
}

function minTriple(w: number, f: number, h: number) {
  return Math.min(w, f, h);
}

function maybeUnlockEgg(row: {
  weitePoints: number;
  funkenPoints: number;
  hingabePoints: number;
  companionStage: string;
}) {
  if (row.companionStage !== 'JOURNEY') return null as { eggFoundAt: Date } | null;
  if (minTriple(row.weitePoints, row.funkenPoints, row.hingabePoints) < JOURNEY_THRESHOLD) {
    return null;
  }
  return { eggFoundAt: new Date() };
}

function evolvePostHatch(stage: string, postHatchXp: number): string {
  if (stage !== 'HATCHLING' && stage !== 'YOUNG') return stage;
  let s = stage;
  if (s === 'HATCHLING' && postHatchXp >= 36) s = 'YOUNG';
  if (s === 'YOUNG' && postHatchXp >= 96) s = 'BUDDY';
  return s;
}

function addPostHatchXp(stage: string, amount: number, current: number) {
  if (stage === 'HATCHLING' || stage === 'YOUNG') return current + amount;
  return current;
}

/**
 * Täglicher Besuch: einmal pro Kalendertag Weite + Funken
 */
export async function ensureDailyVisitBonus(userId: string) {
  const row = await getOrCreateProgress(userId);
  const key = todayKey();
  if (row.lastDailyVisitDate === key) {
    return row;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const isTeacher = user?.role === 'TEACHER';
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

export async function applyJourneyEvent(
  userId: string,
  type: JourneyEventType,
  meta?: { cardsReviewed?: number }
) {
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
      const n = Math.max(0, Math.min(40, meta?.cardsReviewed ?? 0));
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
      eggFoundAt: eggFoundAt ?? undefined,
      eggCarePercent,
      postHatchXp,
    },
  });
}

/**
 * Ei täglich pflegen (einmal pro Tag möglich)
 */
export async function applyEggCare(userId: string) {
  const row = await getOrCreateProgress(userId);
  if (row.companionStage !== 'EGG') {
    return { ok: false as const, reason: 'no_egg' };
  }
  const key = todayKey();
  if (row.lastCareDate === key) {
    return { ok: false as const, reason: 'already_cared' };
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
      hatchedAt: hatchedAt ?? undefined,
    },
  });
  return { ok: true as const, progress: updated };
}

export function serializeProgress(row: Awaited<ReturnType<typeof getOrCreateProgress>>) {
  const minP = minTriple(row.weitePoints, row.funkenPoints, row.hingabePoints);
  const journeyComplete = minP >= JOURNEY_THRESHOLD;
  const key = todayKey();
  const canCareToday =
    row.companionStage === 'EGG' && row.lastCareDate !== key;
  return {
    weitePoints: row.weitePoints,
    funkenPoints: row.funkenPoints,
    hingabePoints: row.hingabePoints,
    companionStage: row.companionStage,
    eggCarePercent: row.eggCarePercent,
    eggFoundAt: row.eggFoundAt,
    hatchedAt: row.hatchedAt,
    postHatchXp: row.postHatchXp,
    journeyThreshold: JOURNEY_THRESHOLD,
    journeyComplete,
    minOfThree: minP,
    canCareToday,
  };
}
