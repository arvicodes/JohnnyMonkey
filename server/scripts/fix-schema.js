#!/usr/bin/env node

/**
 * Script zum Beheben von Schema-Problemen in der Datenbank
 * Fügt fehlende Spalten und Tabellen hinzu
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSchema() {
  try {
    console.log('🔧 Fixing database schema...\n');

    // 1. Füge period1Hours und period2Hours zu LearningGroup hinzu
    console.log('1. Adding period1Hours and period2Hours to LearningGroup...');
    try {
      await prisma.$executeRaw`ALTER TABLE LearningGroup ADD COLUMN period1Hours INTEGER`;
      console.log('   ✅ Added period1Hours');
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log('   ℹ️  period1Hours already exists');
      } else {
        console.log('   ⚠️  Error adding period1Hours:', e.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE LearningGroup ADD COLUMN period2Hours INTEGER`;
      console.log('   ✅ Added period2Hours');
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log('   ℹ️  period2Hours already exists');
      } else {
        console.log('   ⚠️  Error adding period2Hours:', e.message);
      }
    }

    // 2. Prüfe ob FlashcardDeck Tabelle existiert
    console.log('\n2. Checking FlashcardDeck table...');
    try {
      const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='FlashcardDeck'`;
      if (result.length === 0) {
        console.log('   ⚠️  FlashcardDeck table does not exist - run prisma db push to create it');
      } else {
        console.log('   ✅ FlashcardDeck table exists');
      }
    } catch (e) {
      console.log('   ⚠️  Error checking FlashcardDeck:', e.message);
    }

    // 3. Prüfe ob DocumentProcessingHistory Tabelle existiert
    console.log('\n3. Checking DocumentProcessingHistory table...');
    try {
      const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='DocumentProcessingHistory'`;
      if (result.length === 0) {
        console.log('   ⚠️  DocumentProcessingHistory table does not exist - run prisma db push to create it');
      } else {
        console.log('   ✅ DocumentProcessingHistory table exists');
      }
    } catch (e) {
      console.log('   ⚠️  Error checking DocumentProcessingHistory:', e.message);
    }

    console.log('\n✅ Schema fix completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npx prisma db push');
    console.log('   2. Run: npx prisma generate');
    console.log('   3. Restart container');

  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchema();

