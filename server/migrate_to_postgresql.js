const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite connection
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'prisma', 'dev.db'));

// PostgreSQL connection (will use DATABASE_URL from environment)
const prisma = new PrismaClient();

async function migrateData() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...');
  
  try {
    // Test PostgreSQL connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Clear existing data (optional - be careful!)
    console.log('⚠️  Clearing existing PostgreSQL data...');
    await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "LearningGroup" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Subject" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Quiz" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Block" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Unit" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Topic" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Lesson" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "QuizQuestion" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "FlashcardDeck" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Flashcard" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Note" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Grade" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "GradingSchema" CASCADE`;
    
    // Migrate Users
    console.log('👥 Migrating users...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM User', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          loginCode: user.loginCode,
          role: user.role,
          createdAt: new Date(parseInt(user.createdAt)),
          updatedAt: new Date(parseInt(user.updatedAt)),
          avatarEmoji: user.avatarEmoji
        }
      });
    }
    console.log(`✅ Migrated ${users.length} users`);
    
    // Migrate Learning Groups
    console.log('👥 Migrating learning groups...');
    const groups = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM LearningGroup', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const group of groups) {
      await prisma.learningGroup.create({
        data: {
          id: group.id,
          name: group.name,
          teacherId: group.teacherId,
          createdAt: new Date(parseInt(group.createdAt)),
          updatedAt: new Date(parseInt(group.updatedAt))
        }
      });
    }
    console.log(`✅ Migrated ${groups.length} learning groups`);
    
    // Migrate Subjects
    console.log('📚 Migrating subjects...');
    const subjects = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Subject', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const subject of subjects) {
      await prisma.subject.create({
        data: {
          id: subject.id,
          name: subject.name,
          description: subject.description,
          order: subject.order,
          teacherId: subject.teacherId,
          createdAt: new Date(parseInt(subject.createdAt)),
          updatedAt: new Date(parseInt(subject.updatedAt))
        }
      });
    }
    console.log(`✅ Migrated ${subjects.length} subjects`);
    
    // Migrate Quizzes
    console.log('🧩 Migrating quizzes...');
    const quizzes = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Quiz', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const quiz of quizzes) {
      await prisma.quiz.create({
        data: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          sourceFile: quiz.sourceFile,
          shuffleQuestions: Boolean(quiz.shuffleQuestions),
          shuffleAnswers: Boolean(quiz.shuffleAnswers),
          timeLimit: quiz.timeLimit,
          teacherId: quiz.teacherId,
          gradeCategory: quiz.gradeCategory,
          createdAt: new Date(parseInt(quiz.createdAt)),
          updatedAt: new Date(parseInt(quiz.updatedAt))
        }
      });
    }
    console.log(`✅ Migrated ${quizzes.length} quizzes`);
    
    // Migrate Quiz Questions
    console.log('❓ Migrating quiz questions...');
    const questions = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM QuizQuestion', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const question of questions) {
      await prisma.quizQuestion.create({
        data: {
          id: question.id,
          question: question.question,
          correctAnswer: question.correctAnswer,
          options: question.options,
          tip: question.tip,
          explanation: question.explanation,
          order: question.order,
          quizId: question.quizId,
          createdAt: new Date(parseInt(question.createdAt)),
          updatedAt: new Date(parseInt(question.updatedAt))
        }
      });
    }
    console.log(`✅ Migrated ${questions.length} quiz questions`);
    
    // Migrate Flashcard Decks
    console.log('🃏 Migrating flashcard decks...');
    const decks = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM FlashcardDeck', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const deck of decks) {
      await prisma.flashcardDeck.create({
        data: {
          id: deck.id,
          title: deck.title,
          description: deck.description,
          subjectId: deck.subjectId,
          teacherId: deck.teacherId,
          isPublic: Boolean(deck.isPublic),
          createdAt: new Date(parseInt(deck.createdAt)),
          updatedAt: new Date(parseInt(deck.updatedAt))
        }
      });
    }
    console.log(`✅ Migrated ${decks.length} flashcard decks`);
    
    // Migrate Flashcards
    console.log('🃏 Migrating flashcards...');
    const cards = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Flashcard', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const card of cards) {
      await prisma.flashcard.create({
        data: {
          id: card.id,
          deckId: card.deckId,
          front: card.front,
          back: card.back,
          hint: card.hint,
          difficulty: card.difficulty,
          order: card.order,
          createdAt: new Date(parseInt(card.createdAt)),
          updatedAt: new Date(parseInt(card.updatedAt))
        }
      });
    }
    console.log(`✅ Migrated ${cards.length} flashcards`);
    
    // Migrate Notes
    console.log('📝 Migrating notes...');
    const notes = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Note', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const note of notes) {
      await prisma.note.create({
        data: {
          id: note.id,
          title: note.title,
          content: note.content,
          authorId: note.authorId,
          isPrivate: Boolean(note.isPrivate),
          tags: note.tags,
          order: note.order,
          createdAt: new Date(parseInt(note.createdAt)),
          updatedAt: new Date(parseInt(note.updatedAt))
        }
      });
    }
    console.log(`✅ Migrated ${notes.length} notes`);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
    sqliteDb.close();
  }
}

// Run migration
migrateData();
