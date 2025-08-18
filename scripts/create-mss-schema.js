#!/usr/bin/env node

/**
 * Skript zum Erstellen des MSS-Schemas in der Datenbank
 * Führt das korrigierte MSS-Notensystem ein
 */

const { PrismaClient } = require('../server/src/generated/prisma');

const prisma = new PrismaClient();

async function createMSSSchema() {
  try {
    console.log('🔄 Erstelle MSS-Schema...');

    // Finde die "Informatik GK 12" Lerngruppe
    const learningGroup = await prisma.learningGroup.findFirst({
      where: {
        name: {
          contains: 'Informatik GK 12'
        }
      }
    });

    if (!learningGroup) {
      console.log('❌ Lerngruppe "Informatik GK 12" nicht gefunden');
      return;
    }

    console.log(`✅ Lerngruppe gefunden: ${learningGroup.name} (ID: ${learningGroup.id})`);

    // Überprüfe ob bereits ein MSS-Schema existiert
    const existingSchema = await prisma.gradingSchema.findFirst({
      where: {
        groupId: learningGroup.id,
        gradingSystem: 'MSS'
      }
    });

    if (existingSchema) {
      console.log('⚠️  MSS-Schema existiert bereits, aktualisiere es...');
      
      // Aktualisiere das bestehende Schema
      const updatedSchema = await prisma.gradingSchema.update({
        where: { id: existingSchema.id },
        data: {
          name: 'Oberstufe - MSS',
          structure: `Oberstufe - MSS (100%)
  Kursarbeit (50%)
    Klausur 1 (25%)
    Klausur 2 (25%)
  Andere Leistungen (50%)
    Mündliche Leistungen (33.3%)
      EPO 1 (50%)
      RPO 2 (50%)
    Quizze / Hausaufgaben (33.3%)
      Quiz 1 (20%)
      Quiz 2 (20%)
      Quiz 3 (20%)
      Quiz 4 (20%)
      Quiz 5 (20%)
    Projekte und Sonstige (33.4%)`,
          gradingSystem: 'MSS'
        }
      });

      console.log('✅ MSS-Schema aktualisiert:', updatedSchema.name);
    } else {
      // Erstelle ein neues MSS-Schema
      const newSchema = await prisma.gradingSchema.create({
        data: {
          name: 'Oberstufe - MSS',
          structure: `Oberstufe - MSS (100%)
  Kursarbeit (50%)
    Klausur 1 (25%)
    Klausur 2 (25%)
  Andere Leistungen (50%)
    Mündliche Leistungen (33.3%)
      EPO 1 (50%)
      RPO 2 (50%)
    Quizze / Hausaufgaben (33.3%)
      Quiz 1 (20%)
      Quiz 2 (20%)
      Quiz 3 (20%)
      Quiz 4 (20%)
      Quiz 5 (20%)
    Projekte und Sonstige (33.4%)`,
          groupId: learningGroup.id,
          gradingSystem: 'MSS'
        }
      });

      console.log('✅ MSS-Schema erstellt:', newSchema.name);
      console.log('📊 Schema-ID:', newSchema.id);
    }

    // Zeige alle Schemas für diese Lerngruppe
    const allSchemas = await prisma.gradingSchema.findMany({
      where: { groupId: learningGroup.id }
    });

    console.log('\n📋 Alle Schemas für diese Lerngruppe:');
    allSchemas.forEach(schema => {
      console.log(`  - ${schema.name} (${schema.gradingSystem})`);
    });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des MSS-Schemas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe das Skript aus
if (require.main === module) {
  createMSSSchema()
    .then(() => {
      console.log('\n🎉 MSS-Schema-Setup abgeschlossen!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fehler beim Setup:', error);
      process.exit(1);
    });
}

module.exports = { createMSSSchema };
