import { PrismaClient } from '@prisma/client';
/** HMAC-SHA256, Version 1. Klartext und Hash in derselben Unique-Spalte unterscheiden. */
export declare const LOGIN_CODE_HASH_PREFIX = "hm1:";
export declare function normalizeLoginCode(raw: unknown): string;
export declare function isHashedLoginCode(value: unknown): boolean;
export declare function loginCodePepperPath(): string;
export declare function getLoginCodePepper(): Buffer;
/** Speichert HMAC mit Pepper. Bestehende Hashes unverändert lassen. */
export declare function toStoredLoginCode(plain: string): string;
export declare function findUserIdByLoginCode(prisma: PrismaClient, raw: unknown): Promise<string | null>;
export declare function findUserByLoginCode(prisma: PrismaClient, raw: unknown): Promise<{
    id: string;
    name: string;
    role: string;
} | null>;
export declare function loginCodeTaken(prisma: PrismaClient, plain: string, exceptUserId?: string): Promise<boolean>;
export declare function occupiedStoredLoginCodes(prisma: PrismaClient): Promise<Set<string>>;
export declare function migrateAllLoginCodes(prisma: PrismaClient): Promise<number>;
export declare function redactHashedLoginCodes(value: unknown): unknown;
//# sourceMappingURL=loginCodeCrypto.d.ts.map