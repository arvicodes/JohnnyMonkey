"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkSubmissions() {
    try {
        const submissions = await prisma.kASubmission.findMany({
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        loginCode: true
                    }
                }
            },
            orderBy: {
                submittedAt: 'desc'
            }
        });
        console.log('\n📊 Alle Abgaben:');
        console.log('==================\n');
        if (submissions.length === 0) {
            console.log('❌ Keine Abgaben gefunden');
        }
        else {
            submissions.forEach((sub, index) => {
                console.log(`${index + 1}. ${sub.student.name}`);
                console.log(`   Datei: ${sub.kaFilePath}`);
                console.log(`   Status: ${sub.status}`);
                console.log(`   Auto-Punkte: ${sub.autoPoints}`);
                console.log(`   Gesamt-Punkte: ${sub.totalPoints}`);
                console.log(`   Abgegeben am: ${new Date(sub.submittedAt).toLocaleString('de-DE')}`);
                console.log('');
            });
        }
        // Gruppiere nach kaFilePath
        const grouped = submissions.reduce((acc, sub) => {
            if (!acc[sub.kaFilePath]) {
                acc[sub.kaFilePath] = [];
            }
            acc[sub.kaFilePath].push(sub);
            return acc;
        }, {});
        console.log('\n📋 Gruppiert nach Klassenarbeit:');
        console.log('================================\n');
        Object.entries(grouped).forEach(([kaFilePath, subs]) => {
            console.log(`\n${kaFilePath}: ${subs.length} Abgabe(n)`);
            subs.forEach(sub => {
                console.log(`  - ${sub.student.name} (${sub.status})`);
            });
        });
    }
    catch (error) {
        console.error('Fehler:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkSubmissions();
//# sourceMappingURL=checkSubmissions.js.map