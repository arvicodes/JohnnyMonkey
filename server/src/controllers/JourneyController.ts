import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  applyEggCare,
  ensureDailyVisitBonus,
  serializeProgress,
} from '../services/journeyService';

const prisma = new PrismaClient();

async function getJourneyUserFromRequest(req: Request) {
  const loginCode = req.headers['x-login-code'] as string | undefined;
  if (!loginCode?.trim()) {
    return { error: 401 as const, message: 'Nicht angemeldet' };
  }
  const user = await prisma.user.findUnique({
    where: { loginCode: loginCode.trim() },
    select: { id: true, role: true },
  });
  if (!user || (user.role !== 'STUDENT' && user.role !== 'TEACHER')) {
    return { error: 403 as const, message: 'Nur für Schüler- und Lehrkraftkonten' };
  }
  return { user };
}

export async function getJourney(req: Request, res: Response) {
  try {
    const auth = await getJourneyUserFromRequest(req);
    if ('error' in auth) {
      return res.status(auth.error).json({ error: auth.message });
    }
    const row = await ensureDailyVisitBonus(auth.user.id);
    res.json(serializeProgress(row));
  } catch (e) {
    console.error('getJourney', e);
    res.status(500).json({ error: 'Reise konnte nicht geladen werden' });
  }
}

export async function postCare(req: Request, res: Response) {
  try {
    const auth = await getJourneyUserFromRequest(req);
    if ('error' in auth) {
      return res.status(auth.error).json({ error: auth.message });
    }
    const result = await applyEggCare(auth.user.id);
    if (!result.ok) {
      if (result.reason === 'no_egg') {
        return res.status(400).json({ error: 'Du hast kein Ei zum Pflegen.' });
      }
      return res.status(400).json({ error: 'Heute warst du schon beim Pflegen. Komm morgen wieder!' });
    }
    res.json(serializeProgress(result.progress));
  } catch (e) {
    console.error('postCare', e);
    res.status(500).json({ error: 'Pflege konnte nicht gespeichert werden' });
  }
}
