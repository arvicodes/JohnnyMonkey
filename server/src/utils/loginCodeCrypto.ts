import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

/** HMAC-SHA256, Version 1. Klartext und Hash in derselben Unique-Spalte unterscheiden. */
export const LOGIN_CODE_HASH_PREFIX = 'hm1:';

const HASH_HEX_LEN = 64;

export function normalizeLoginCode(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

export function isHashedLoginCode(value: unknown): boolean {
  const s = String(value ?? '');
  if (!s.startsWith(LOGIN_CODE_HASH_PREFIX)) return false;
  const hex = s.slice(LOGIN_CODE_HASH_PREFIX.length);
  return hex.length === HASH_HEX_LEN && /^[0-9a-f]+$/i.test(hex);
}

function sqliteFileFromDatabaseUrl(): string {
  const raw = String(process.env.DATABASE_URL || '').trim();
  const m = /^file:(.+)$/i.exec(raw);
  if (!m) {
    return path.resolve(process.cwd(), 'prisma', 'dev.db');
  }
  const p = m[1];
  if (path.isAbsolute(p)) return p;
  return path.resolve(process.cwd(), p);
}

export function loginCodePepperPath(): string {
  return path.join(path.dirname(sqliteFileFromDatabaseUrl()), '.login-code-pepper');
}

let cachedPepper: Buffer | null = null;

function pepperFromHexOrUtf8(value: string): Buffer {
  const trimmed = value.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return Buffer.from(trimmed, 'utf8');
}

export function getLoginCodePepper(): Buffer {
  if (cachedPepper) return cachedPepper;

  const fromEnv = process.env.LOGIN_CODE_PEPPER?.trim();
  if (fromEnv) {
    cachedPepper = pepperFromHexOrUtf8(fromEnv);
    return cachedPepper;
  }

  const file = loginCodePepperPath();
  if (fs.existsSync(file)) {
    cachedPepper = pepperFromHexOrUtf8(fs.readFileSync(file, 'utf8'));
    return cachedPepper;
  }

  const bytes = crypto.randomBytes(32);
  fs.writeFileSync(file, bytes.toString('hex'), { encoding: 'utf8', mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* Windows / manche Volumes ignorieren chmod */
  }
  cachedPepper = bytes;
  console.log('🔐 Login-Code-Pepper angelegt (liegt neben der DB, nicht in git)');
  return cachedPepper;
}

/** Speichert HMAC mit Pepper. Bestehende Hashes unverändert lassen. */
export function toStoredLoginCode(plain: string): string {
  const n = normalizeLoginCode(plain);
  if (!n) {
    throw new Error('Login-Code fehlt');
  }
  if (isHashedLoginCode(n)) {
    return `${LOGIN_CODE_HASH_PREFIX}${n.slice(LOGIN_CODE_HASH_PREFIX.length).toLowerCase()}`;
  }
  const digest = crypto
    .createHmac('sha256', getLoginCodePepper())
    .update(n, 'utf8')
    .digest('hex');
  return `${LOGIN_CODE_HASH_PREFIX}${digest}`;
}

async function migratePlainRow(prisma: PrismaClient, id: string, plain: string): Promise<void> {
  if (!plain || isHashedLoginCode(plain)) return;
  const stored = toStoredLoginCode(plain);
  const clash = await prisma.user.findUnique({
    where: { loginCode: stored },
    select: { id: true },
  });
  if (clash && clash.id !== id) return;
  await prisma.user.update({
    where: { id },
    data: { loginCode: stored },
  });
}

export async function findUserIdByLoginCode(
  prisma: PrismaClient,
  raw: unknown,
): Promise<string | null> {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const stored = toStoredLoginCode(trimmed);

  const byHash = await prisma.user.findUnique({
    where: { loginCode: stored },
    select: { id: true },
  });
  if (byHash) return byHash.id;

  const byExact = await prisma.user.findUnique({
    where: { loginCode: trimmed },
    select: { id: true, loginCode: true },
  });
  if (byExact) {
    await migratePlainRow(prisma, byExact.id, byExact.loginCode);
    return byExact.id;
  }

  const normalized = normalizeLoginCode(trimmed);
  if (normalized !== trimmed) {
    const byLower = await prisma.user.findUnique({
      where: { loginCode: normalized },
      select: { id: true, loginCode: true },
    });
    if (byLower) {
      await migratePlainRow(prisma, byLower.id, byLower.loginCode);
      return byLower.id;
    }
  }

  const leftovers = await prisma.user.findMany({
    where: { NOT: { loginCode: { startsWith: LOGIN_CODE_HASH_PREFIX } } },
    select: { id: true, loginCode: true },
  });
  const match = leftovers.find(
    (u) => u.loginCode && u.loginCode.toLowerCase() === normalized,
  );
  if (!match) return null;
  await migratePlainRow(prisma, match.id, match.loginCode);
  return match.id;
}

export async function findUserByLoginCode(
  prisma: PrismaClient,
  raw: unknown,
): Promise<{ id: string; name: string; role: string } | null> {
  const id = await findUserIdByLoginCode(prisma, raw);
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true },
  });
}

export async function loginCodeTaken(
  prisma: PrismaClient,
  plain: string,
  exceptUserId?: string,
): Promise<boolean> {
  const id = await findUserIdByLoginCode(prisma, plain);
  if (!id) return false;
  return exceptUserId ? id !== exceptUserId : true;
}

export async function occupiedStoredLoginCodes(prisma: PrismaClient): Promise<Set<string>> {
  const rows = await prisma.user.findMany({ select: { loginCode: true } });
  const set = new Set<string>();
  for (const row of rows) {
    if (!row.loginCode) continue;
    set.add(isHashedLoginCode(row.loginCode) ? row.loginCode : toStoredLoginCode(row.loginCode));
  }
  return set;
}

export async function migrateAllLoginCodes(prisma: PrismaClient): Promise<number> {
  getLoginCodePepper();
  const users = await prisma.user.findMany({ select: { id: true, loginCode: true } });
  let migrated = 0;
  let skipped = 0;
  for (const user of users) {
    if (!user.loginCode || isHashedLoginCode(user.loginCode)) continue;
    const stored = toStoredLoginCode(user.loginCode);
    const clash = await prisma.user.findUnique({
      where: { loginCode: stored },
      select: { id: true },
    });
    if (clash && clash.id !== user.id) {
      skipped += 1;
      console.warn('🔐 Login-Code-Kollision — Eintrag unverändert:', user.id);
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { loginCode: stored },
    });
    migrated += 1;
  }
  if (migrated > 0 || skipped > 0) {
    console.log(`🔐 Login-Codes gehasht: ${migrated} umgeschrieben${skipped ? `, ${skipped} übersprungen` : ''}`);
  } else {
    console.log('🔐 Login-Codes: bereits gehasht');
  }
  return migrated;
}

export function redactHashedLoginCodes(value: unknown): unknown {
  if (value == null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(redactHashedLoginCodes);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'loginCode' && typeof child === 'string' && isHashedLoginCode(child)) {
      out[key] = '';
    } else {
      out[key] = redactHashedLoginCodes(child);
    }
  }
  return out;
}
