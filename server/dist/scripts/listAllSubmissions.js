"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function listAll() {
    const all = await prisma.kASubmission.findMany({
        include: {
            student: { select: { name: true, id: true } }
        },
        orderBy: { submittedAt: 'desc' }
    });
    console.log(`\n📊 Gesamt: ${all.length} Abgabe(n)\n`);
    all.forEach((s, i) => {
        console.log(`${i + 1}. ${s.student.name}`);
        console.log(`   kaFilePath: "${s.kaFilePath}"`);
        console.log(`   Status: ${s.status}`);
        console.log(`   Auto: ${s.autoPoints}, Gesamt: ${s.totalPoints}`);
        console.log(`   Zeit: ${s.submittedAt.toLocaleString('de-DE')}`);
        console.log('');
    });
    await prisma.$disconnect();
}
listAll();
//# sourceMappingURL=listAllSubmissions.js.map