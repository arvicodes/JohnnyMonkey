import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const DATA_DIR = path.resolve(__dirname, '..', '..', 'be-a-hero-data');
const WORKOUTS_FILE = path.join(DATA_DIR, 'workouts.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readWorkoutsFile(): unknown[] {
  ensureDataDir();
  if (!fs.existsSync(WORKOUTS_FILE)) {
    return [];
  }
  const raw = fs.readFileSync(WORKOUTS_FILE, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed : [];
}

router.get('/', (_req: Request, res: Response) => {
  try {
    res.json(readWorkoutsFile());
  } catch (e) {
    console.error('be-a-hero workouts list error', e);
    res.status(500).json({ error: 'Workouts konnten nicht geladen werden' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!Array.isArray(body)) {
      return res.status(400).json({ error: 'Erwartet ein Array von Workouts' });
    }
    ensureDataDir();
    await fs.promises.writeFile(WORKOUTS_FILE, JSON.stringify(body), 'utf8');
    res.json({ ok: true, count: body.length });
  } catch (e) {
    console.error('be-a-hero workouts put error', e);
    const msg = e instanceof Error ? e.message : 'Speichern fehlgeschlagen';
    res.status(400).json({ error: msg });
  }
});

export default router;
