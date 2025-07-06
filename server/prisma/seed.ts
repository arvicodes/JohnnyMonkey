import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  // --- TEACHERS ---
  let teacher1 = await prisma.user.findUnique({ where: { loginCode: '1' } })
  if (!teacher1) {
    teacher1 = await prisma.user.create({
      data: { name: 'Frau Christ', loginCode: '1', role: 'TEACHER' },
    })
  }
  let teacher2 = await prisma.user.findUnique({ where: { loginCode: 'TEACH002' } })
  if (!teacher2) {
    teacher2 = await prisma.user.create({
      data: { name: 'Herr Kowalski', loginCode: 'TEACH002', role: 'TEACHER' },
    })
  }

  // --- SUBJECTS ---
  let matheSubject = await prisma.subject.findFirst({ where: { name: 'Mathematik', teacherId: teacher1.id } })
  if (!matheSubject) {
    matheSubject = await prisma.subject.create({
      data: { name: 'Mathematik', description: 'Mathematik für Klasse 6a', teacherId: teacher1.id, order: 0 },
    })
  }
  let informatikSubject = await prisma.subject.findFirst({ where: { name: 'Informatik', teacherId: teacher1.id } })
  if (!informatikSubject) {
    informatikSubject = await prisma.subject.create({
      data: { name: 'Informatik', description: 'Informatik für GK11', teacherId: teacher1.id, order: 1 },
    })
  }

  // --- BLOCKS ---
  let algebraBlock = await prisma.block.findFirst({ where: { name: 'Algebra', subjectId: matheSubject.id } })
  if (!algebraBlock) {
    algebraBlock = await prisma.block.create({
      data: { name: 'Algebra', description: 'Grundlagen der Algebra', subjectId: matheSubject.id, order: 0 },
    })
  }
  let geometrieBlock = await prisma.block.findFirst({ where: { name: 'Geometrie', subjectId: matheSubject.id } })
  if (!geometrieBlock) {
    geometrieBlock = await prisma.block.create({
      data: { name: 'Geometrie', description: 'Grundlagen der Geometrie', subjectId: matheSubject.id, order: 1 },
    })
  }

  // --- UNITS ---
  let gleichungenUnit = await prisma.unit.findFirst({ where: { name: 'Lineare Gleichungen', blockId: algebraBlock.id } })
  if (!gleichungenUnit) {
    gleichungenUnit = await prisma.unit.create({
      data: { name: 'Lineare Gleichungen', description: 'Lösen linearer Gleichungen', blockId: algebraBlock.id, order: 0 },
    })
  }
  let funktionenUnit = await prisma.unit.findFirst({ where: { name: 'Funktionen', blockId: algebraBlock.id } })
  if (!funktionenUnit) {
    funktionenUnit = await prisma.unit.create({
      data: { name: 'Funktionen', description: 'Einführung in Funktionen', blockId: algebraBlock.id, order: 1 },
    })
  }

  // --- TOPICS ---
  let gleichungenTopic = await prisma.topic.findFirst({ where: { name: 'Gleichungen mit einer Unbekannten', unitId: gleichungenUnit.id } })
  if (!gleichungenTopic) {
    gleichungenTopic = await prisma.topic.create({
      data: { name: 'Gleichungen mit einer Unbekannten', description: 'Grundlegende Gleichungslösung', unitId: gleichungenUnit.id, order: 0 },
    })
  }

  // --- LESSONS ---
  let lesson1 = await prisma.lesson.findFirst({ where: { name: 'Einführung in Gleichungen', topicId: gleichungenTopic.id } })
  if (!lesson1) {
    lesson1 = await prisma.lesson.create({
      data: { name: 'Einführung in Gleichungen', description: 'Was sind Gleichungen?', topicId: gleichungenTopic.id, order: 0 },
    })
  }
  let lesson2 = await prisma.lesson.findFirst({ where: { name: 'Gleichungen lösen', topicId: gleichungenTopic.id } })
  if (!lesson2) {
    lesson2 = await prisma.lesson.create({
      data: { name: 'Gleichungen lösen', description: 'Praktische Übungen', topicId: gleichungenTopic.id, order: 1 },
    })
  }

  console.log('Database has been seeded! 🌱')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 