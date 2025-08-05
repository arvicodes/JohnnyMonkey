const fs = require('fs');
const path = require('path');

// Funktion zum Parsen der SQLite-Export-Daten
function parseSqliteData(filePath, tableName) {
  if (!fs.existsSync(filePath)) {
    console.log(`Datei nicht gefunden: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];

  const lines = content.split('\n');
  const objects = [];

  for (const line of lines) {
    const values = line.split('|');
    
    // Je nach Tabelle die entsprechenden Felder zuweisen
    switch (tableName) {
      case 'User':
        objects.push({
          id: values[0],
          name: values[1],
          loginCode: values[2],
          role: values[3],
          createdAt: new Date(parseInt(values[4])),
          updatedAt: new Date(parseInt(values[5])),
          avatarEmoji: values[6] || null
        });
        break;
      
      case 'LearningGroup':
        objects.push({
          id: values[0],
          name: values[1],
          createdAt: new Date(parseInt(values[2])),
          updatedAt: new Date(parseInt(values[3])),
          teacherId: values[4]
        });
        break;
      
      case 'Subject':
        objects.push({
          id: values[0],
          name: values[1],
          description: values[2] || null,
          order: parseInt(values[3]),
          teacherId: values[4],
          createdAt: new Date(parseInt(values[5])),
          updatedAt: new Date(parseInt(values[6]))
        });
        break;
      
      case 'Block':
        objects.push({
          id: values[0],
          name: values[1],
          description: values[2] || null,
          order: parseInt(values[3]),
          subjectId: values[4],
          createdAt: new Date(parseInt(values[5])),
          updatedAt: new Date(parseInt(values[6]))
        });
        break;
      
      case 'Unit':
        objects.push({
          id: values[0],
          name: values[1],
          description: values[2] || null,
          order: parseInt(values[3]),
          blockId: values[4],
          createdAt: new Date(parseInt(values[5])),
          updatedAt: new Date(parseInt(values[6]))
        });
        break;
      
      case 'Topic':
        objects.push({
          id: values[0],
          name: values[1],
          description: values[2] || null,
          order: parseInt(values[3]),
          unitId: values[4],
          createdAt: new Date(parseInt(values[5])),
          updatedAt: new Date(parseInt(values[6]))
        });
        break;
      
      case 'Note':
        objects.push({
          id: values[0],
          title: values[1],
          content: values[2],
          authorId: values[3],
          isPrivate: values[4] === '1',
          tags: values[5] || null,
          order: parseInt(values[6]),
          createdAt: new Date(parseInt(values[7])),
          updatedAt: new Date(parseInt(values[8]))
        });
        break;
      
      case 'Material':
        objects.push({
          id: values[0],
          fileName: values[1],
          filePath: values[2],
          type: values[3],
          createdAt: new Date(parseInt(values[4])),
          updatedAt: new Date(parseInt(values[5]))
        });
        break;
      
      case 'Lesson':
        objects.push({
          id: values[0],
          name: values[1],
          description: values[2] || null,
          order: parseInt(values[3]),
          topicId: values[4],
          createdAt: new Date(parseInt(values[5])),
          updatedAt: new Date(parseInt(values[6]))
        });
        break;
      
      case 'Quiz':
        objects.push({
          id: values[0],
          title: values[1],
          description: values[2] || null,
          sourceFile: values[3],
          shuffleQuestions: values[4] === '1',
          shuffleAnswers: values[5] === '1',
          timeLimit: parseInt(values[6]),
          teacherId: values[7],
          createdAt: new Date(parseInt(values[8])),
          updatedAt: new Date(parseInt(values[9]))
        });
        break;
      
      case 'QuizQuestion':
        objects.push({
          id: values[0],
          question: values[1],
          correctAnswer: values[2],
          options: values[3],
          order: parseInt(values[4]),
          quizId: values[5],
          createdAt: new Date(parseInt(values[6])),
          updatedAt: new Date(parseInt(values[7]))
        });
        break;
      
      case 'LessonMaterial':
        objects.push({
          id: values[0],
          lessonId: values[1],
          materialId: values[2],
          createdAt: new Date(parseInt(values[3]))
        });
        break;
      
      case 'LessonQuiz':
        objects.push({
          id: values[0],
          lessonId: values[1],
          quizId: values[2],
          createdAt: new Date(parseInt(values[3]))
        });
        break;
      
      case 'QuizSession':
        objects.push({
          id: values[0],
          quizId: values[1],
          isActive: values[2] === '1',
          startedAt: values[3] ? new Date(parseInt(values[3])) : null,
          endedAt: values[4] ? new Date(parseInt(values[4])) : null,
          createdAt: new Date(parseInt(values[5])),
          updatedAt: new Date(parseInt(values[6]))
        });
        break;
      
      case 'QuizParticipation':
        objects.push({
          id: values[0],
          sessionId: values[1],
          studentId: values[2],
          startedAt: values[3] ? new Date(parseInt(values[3])) : null,
          completedAt: values[4] ? new Date(parseInt(values[4])) : null,
          score: values[5] ? parseInt(values[5]) : null,
          maxScore: values[6] ? parseInt(values[6]) : null,
          createdAt: new Date(parseInt(values[7])),
          updatedAt: new Date(parseInt(values[8]))
        });
        break;
      
      case 'QuizAnswer':
        objects.push({
          id: values[0],
          participationId: values[1],
          questionId: values[2],
          selectedAnswer: values[3],
          isCorrect: values[4] === '1',
          points: parseInt(values[5]),
          answeredAt: new Date(parseInt(values[6]))
        });
        break;
      
      case 'GroupAssignment':
        objects.push({
          id: values[0],
          groupId: values[1],
          type: values[2],
          refId: values[3],
          createdAt: new Date(parseInt(values[4]))
        });
        break;
      
      case 'GradingSchema':
        objects.push({
          id: values[0],
          name: values[1],
          structure: values[2],
          groupId: values[3],
          createdAt: new Date(parseInt(values[4])),
          updatedAt: new Date(parseInt(values[5]))
        });
        break;
    }
  }

  return objects;
}

// Alle Tabellen verarbeiten
const tables = [
  'User', 'LearningGroup', 'Subject', 'Block', 'Unit', 'Topic', 
  'Note', 'Material', 'Lesson', 'Quiz', 'QuizQuestion', 
  'LessonMaterial', 'LessonQuiz', 'QuizSession', 'QuizParticipation', 
  'QuizAnswer', 'GroupAssignment', 'GradingSchema'
];

console.log('Verarbeite exportierte Daten...');

const allData = {};
for (const table of tables) {
  const filePath = `/tmp/seed_${table}.txt`;
  allData[table] = parseSqliteData(filePath, table);
  console.log(`${table}: ${allData[table].length} Einträge`);
}

// Seed-Script generieren
const seedContent = `import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. ALLE TABELLEN LEEREN (richtige Reihenfolge!)
  await prisma.quizAnswer.deleteMany();
  await prisma.quizParticipation.deleteMany();
  await prisma.quizSession.deleteMany();
  await prisma.lessonQuiz.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lessonMaterial.deleteMany();
  await prisma.material.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.note.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.block.deleteMany();
  await prisma.gradingSchema.deleteMany();
  await prisma.groupAssignment.deleteMany();
  await prisma.learningGroup.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();

  console.log('All tables cleared');

  // 2. DATEN EINSETZEN (richtige Reihenfolge!)

  // User
  const users = ${JSON.stringify(allData.User, null, 2)};
  for (const user of users) {
    await prisma.user.create({ data: user });
  }
  console.log(\`Created \${users.length} users\`);

  // LearningGroup
  const learningGroups = ${JSON.stringify(allData.LearningGroup, null, 2)};
  for (const group of learningGroups) {
    await prisma.learningGroup.create({ data: group });
  }
  console.log(\`Created \${learningGroups.length} learning groups\`);

  // Subject
  const subjects = ${JSON.stringify(allData.Subject, null, 2)};
  for (const subject of subjects) {
    await prisma.subject.create({ data: subject });
  }
  console.log(\`Created \${subjects.length} subjects\`);

  // Block
  const blocks = ${JSON.stringify(allData.Block, null, 2)};
  for (const block of blocks) {
    await prisma.block.create({ data: block });
  }
  console.log(\`Created \${blocks.length} blocks\`);

  // Unit
  const units = ${JSON.stringify(allData.Unit, null, 2)};
  for (const unit of units) {
    await prisma.unit.create({ data: unit });
  }
  console.log(\`Created \${units.length} units\`);

  // Topic
  const topics = ${JSON.stringify(allData.Topic, null, 2)};
  for (const topic of topics) {
    await prisma.topic.create({ data: topic });
  }
  console.log(\`Created \${topics.length} topics\`);

  // Note
  const notes = ${JSON.stringify(allData.Note, null, 2)};
  for (const note of notes) {
    await prisma.note.create({ data: note });
  }
  console.log(\`Created \${notes.length} notes\`);

  // Material
  const materials = ${JSON.stringify(allData.Material, null, 2)};
  for (const material of materials) {
    await prisma.material.create({ data: material });
  }
  console.log(\`Created \${materials.length} materials\`);

  // Lesson
  const lessons = ${JSON.stringify(allData.Lesson, null, 2)};
  for (const lesson of lessons) {
    await prisma.lesson.create({ data: lesson });
  }
  console.log(\`Created \${lessons.length} lessons\`);

  // Quiz
  const quizzes = ${JSON.stringify(allData.Quiz, null, 2)};
  for (const quiz of quizzes) {
    await prisma.quiz.create({ data: quiz });
  }
  console.log(\`Created \${quizzes.length} quizzes\`);

  // QuizQuestion
  const quizQuestions = ${JSON.stringify(allData.QuizQuestion, null, 2)};
  for (const qq of quizQuestions) {
    await prisma.quizQuestion.create({ data: qq });
  }
  console.log(\`Created \${quizQuestions.length} quiz questions\`);

  // LessonMaterial
  const lessonMaterials = ${JSON.stringify(allData.LessonMaterial, null, 2)};
  for (const lm of lessonMaterials) {
    await prisma.lessonMaterial.create({ data: lm });
  }
  console.log(\`Created \${lessonMaterials.length} lesson materials\`);

  // LessonQuiz
  const lessonQuizzes = ${JSON.stringify(allData.LessonQuiz, null, 2)};
  for (const lq of lessonQuizzes) {
    await prisma.lessonQuiz.create({ data: lq });
  }
  console.log(\`Created \${lessonQuizzes.length} lesson quizzes\`);

  // QuizSession
  const quizSessions = ${JSON.stringify(allData.QuizSession, null, 2)};
  for (const qs of quizSessions) {
    await prisma.quizSession.create({ data: qs });
  }
  console.log(\`Created \${quizSessions.length} quiz sessions\`);

  // QuizParticipation
  const quizParticipations = ${JSON.stringify(allData.QuizParticipation, null, 2)};
  for (const qp of quizParticipations) {
    await prisma.quizParticipation.create({ data: qp });
  }
  console.log(\`Created \${quizParticipations.length} quiz participations\`);

  // QuizAnswer
  const quizAnswers = ${JSON.stringify(allData.QuizAnswer, null, 2)};
  for (const qa of quizAnswers) {
    await prisma.quizAnswer.create({ data: qa });
  }
  console.log(\`Created \${quizAnswers.length} quiz answers\`);

  // GroupAssignment
  const groupAssignments = ${JSON.stringify(allData.GroupAssignment, null, 2)};
  for (const ga of groupAssignments) {
    await prisma.groupAssignment.create({ data: ga });
  }
  console.log(\`Created \${groupAssignments.length} group assignments\`);

  // GradingSchema
  const gradingSchemas = ${JSON.stringify(allData.GradingSchema, null, 2)};
  for (const gs of gradingSchemas) {
    await prisma.gradingSchema.create({ data: gs });
  }
  console.log(\`Created \${gradingSchemas.length} grading schemas\`);

  console.log('Database seeded successfully!');
}

main()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

// Seed-Script schreiben
fs.writeFileSync('prisma/seed.ts', seedContent);
console.log('Seed-Script erfolgreich erstellt: prisma/seed.ts');
console.log('Du kannst jetzt "npx prisma db seed" ausführen!'); 