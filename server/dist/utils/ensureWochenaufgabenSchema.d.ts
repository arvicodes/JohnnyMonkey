import { PrismaClient } from '@prisma/client';
/** Legt Wochenaufgaben-Tabellen an, falls die DB aus backup_latest.db stammt (altes Schema). */
export declare function ensureWochenaufgabenSchema(prisma: PrismaClient): Promise<void>;
//# sourceMappingURL=ensureWochenaufgabenSchema.d.ts.map