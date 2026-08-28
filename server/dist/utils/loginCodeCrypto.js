"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOGIN_CODE_HASH_PREFIX = void 0;
exports.normalizeLoginCode = normalizeLoginCode;
exports.isHashedLoginCode = isHashedLoginCode;
exports.loginCodePepperPath = loginCodePepperPath;
exports.getLoginCodePepper = getLoginCodePepper;
exports.toStoredLoginCode = toStoredLoginCode;
exports.findUserIdByLoginCode = findUserIdByLoginCode;
exports.findUserByLoginCode = findUserByLoginCode;
exports.loginCodeTaken = loginCodeTaken;
exports.occupiedStoredLoginCodes = occupiedStoredLoginCodes;
exports.migrateAllLoginCodes = migrateAllLoginCodes;
exports.redactHashedLoginCodes = redactHashedLoginCodes;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/** HMAC-SHA256, Version 1. Klartext und Hash in derselben Unique-Spalte unterscheiden. */
exports.LOGIN_CODE_HASH_PREFIX = 'hm1:';
const HASH_HEX_LEN = 64;
function normalizeLoginCode(raw) {
    return String(raw !== null && raw !== void 0 ? raw : '').trim().toLowerCase();
}
function isHashedLoginCode(value) {
    const s = String(value !== null && value !== void 0 ? value : '');
    if (!s.startsWith(exports.LOGIN_CODE_HASH_PREFIX))
        return false;
    const hex = s.slice(exports.LOGIN_CODE_HASH_PREFIX.length);
    return hex.length === HASH_HEX_LEN && /^[0-9a-f]+$/i.test(hex);
}
function sqliteFileFromDatabaseUrl() {
    const raw = String(process.env.DATABASE_URL || '').trim();
    const m = /^file:(.+)$/i.exec(raw);
    if (!m) {
        return path_1.default.resolve(process.cwd(), 'prisma', 'dev.db');
    }
    const p = m[1];
    if (path_1.default.isAbsolute(p))
        return p;
    return path_1.default.resolve(process.cwd(), p);
}
function loginCodePepperPath() {
    return path_1.default.join(path_1.default.dirname(sqliteFileFromDatabaseUrl()), '.login-code-pepper');
}
let cachedPepper = null;
function pepperFromHexOrUtf8(value) {
    const trimmed = value.trim();
    if (/^[0-9a-f]{64}$/i.test(trimmed)) {
        return Buffer.from(trimmed, 'hex');
    }
    return Buffer.from(trimmed, 'utf8');
}
function getLoginCodePepper() {
    var _a;
    if (cachedPepper)
        return cachedPepper;
    const fromEnv = (_a = process.env.LOGIN_CODE_PEPPER) === null || _a === void 0 ? void 0 : _a.trim();
    if (fromEnv) {
        cachedPepper = pepperFromHexOrUtf8(fromEnv);
        return cachedPepper;
    }
    const file = loginCodePepperPath();
    if (fs_1.default.existsSync(file)) {
        cachedPepper = pepperFromHexOrUtf8(fs_1.default.readFileSync(file, 'utf8'));
        return cachedPepper;
    }
    const bytes = crypto_1.default.randomBytes(32);
    fs_1.default.writeFileSync(file, bytes.toString('hex'), { encoding: 'utf8', mode: 0o600 });
    try {
        fs_1.default.chmodSync(file, 0o600);
    }
    catch {
        /* Windows / manche Volumes ignorieren chmod */
    }
    cachedPepper = bytes;
    console.log('🔐 Login-Code-Pepper angelegt (liegt neben der DB, nicht in git)');
    return cachedPepper;
}
/** Speichert HMAC mit Pepper. Bestehende Hashes unverändert lassen. */
function toStoredLoginCode(plain) {
    const n = normalizeLoginCode(plain);
    if (!n) {
        throw new Error('Login-Code fehlt');
    }
    if (isHashedLoginCode(n)) {
        return `${exports.LOGIN_CODE_HASH_PREFIX}${n.slice(exports.LOGIN_CODE_HASH_PREFIX.length).toLowerCase()}`;
    }
    const digest = crypto_1.default
        .createHmac('sha256', getLoginCodePepper())
        .update(n, 'utf8')
        .digest('hex');
    return `${exports.LOGIN_CODE_HASH_PREFIX}${digest}`;
}
async function migratePlainRow(prisma, id, plain) {
    if (!plain || isHashedLoginCode(plain))
        return;
    const stored = toStoredLoginCode(plain);
    const clash = await prisma.user.findUnique({
        where: { loginCode: stored },
        select: { id: true },
    });
    if (clash && clash.id !== id)
        return;
    await prisma.user.update({
        where: { id },
        data: { loginCode: stored },
    });
}
async function findUserIdByLoginCode(prisma, raw) {
    const trimmed = String(raw !== null && raw !== void 0 ? raw : '').trim();
    if (!trimmed)
        return null;
    const stored = toStoredLoginCode(trimmed);
    const byHash = await prisma.user.findUnique({
        where: { loginCode: stored },
        select: { id: true },
    });
    if (byHash)
        return byHash.id;
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
        where: { NOT: { loginCode: { startsWith: exports.LOGIN_CODE_HASH_PREFIX } } },
        select: { id: true, loginCode: true },
    });
    const match = leftovers.find((u) => u.loginCode && u.loginCode.toLowerCase() === normalized);
    if (!match)
        return null;
    await migratePlainRow(prisma, match.id, match.loginCode);
    return match.id;
}
async function findUserByLoginCode(prisma, raw) {
    const id = await findUserIdByLoginCode(prisma, raw);
    if (!id)
        return null;
    return prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, role: true },
    });
}
async function loginCodeTaken(prisma, plain, exceptUserId) {
    const id = await findUserIdByLoginCode(prisma, plain);
    if (!id)
        return false;
    return exceptUserId ? id !== exceptUserId : true;
}
async function occupiedStoredLoginCodes(prisma) {
    const rows = await prisma.user.findMany({ select: { loginCode: true } });
    const set = new Set();
    for (const row of rows) {
        if (!row.loginCode)
            continue;
        set.add(isHashedLoginCode(row.loginCode) ? row.loginCode : toStoredLoginCode(row.loginCode));
    }
    return set;
}
async function migrateAllLoginCodes(prisma) {
    getLoginCodePepper();
    const users = await prisma.user.findMany({ select: { id: true, loginCode: true } });
    let migrated = 0;
    let skipped = 0;
    for (const user of users) {
        if (!user.loginCode || isHashedLoginCode(user.loginCode))
            continue;
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
    }
    else {
        console.log('🔐 Login-Codes: bereits gehasht');
    }
    return migrated;
}
function redactHashedLoginCodes(value) {
    if (value == null || typeof value !== 'object')
        return value;
    if (value instanceof Date)
        return value;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value))
        return value;
    if (Array.isArray(value))
        return value.map(redactHashedLoginCodes);
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null)
        return value;
    const out = {};
    for (const [key, child] of Object.entries(value)) {
        if (key === 'loginCode' && typeof child === 'string' && isHashedLoginCode(child)) {
            out[key] = '';
        }
        else {
            out[key] = redactHashedLoginCodes(child);
        }
    }
    return out;
}
//# sourceMappingURL=loginCodeCrypto.js.map