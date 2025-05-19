import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  // Create teachers
  const teacher1 = await prisma.user.create({
    data: {
      name: 'Frau Christ',
      loginCode: '1',
      role: 'TEACHER',
    },
  })

  const teacher2 = await prisma.user.create({
    data: {
      name: 'Herr Kowalski',
      loginCode: 'TEACH002',
      role: 'TEACHER',
    },
  })

  // Create learning groups for Frau Christ
  const klasse6a = await prisma.learningGroup.create({
    data: {
      name: 'Klasse 6a Mathe',
      teacherId: teacher1.id,
    },
  })

  const gk11 = await prisma.learningGroup.create({
    data: {
      name: 'GK11 Informatik',
      teacherId: teacher1.id,
    },
  })

  // Create learning groups for Herr Kowalski
  const klasse8d = await prisma.learningGroup.create({
    data: {
      name: 'Klasse 8d Mathe',
      teacherId: teacher2.id,
    },
  })

  const gk13 = await prisma.learningGroup.create({
    data: {
      name: 'GK13 Informatik',
      teacherId: teacher2.id,
    },
  })

  // Create students for Klasse 6a
  const student1 = await prisma.user.create({
    data: {
      name: 'Emma Schmidt',
      loginCode: 'S1',
      role: 'STUDENT',
      learningGroups: {
        connect: [{ id: klasse6a.id }],
      },
    },
  })

  const student2 = await prisma.user.create({
    data: {
      name: 'Leon Meyer',
      loginCode: 'STUD002',
      role: 'STUDENT',
      learningGroups: {
        connect: [{ id: klasse6a.id }],
      },
    },
  })

  // Create students for GK11
  const student3 = await prisma.user.create({
    data: {
      name: 'Sophie Wagner',
      loginCode: 'STUD003',
      role: 'STUDENT',
      learningGroups: {
        connect: [{ id: gk11.id }],
      },
    },
  })

  const student4 = await prisma.user.create({
    data: {
      name: 'Tim Becker',
      loginCode: 'STUD004',
      role: 'STUDENT',
      learningGroups: {
        connect: [{ id: gk11.id }],
      },
    },
  })

  // Create students for Klasse 8d
  const student5 = await prisma.user.create({
    data: {
      name: 'Laura Fischer',
      loginCode: 'STUD005',
      role: 'STUDENT',
      learningGroups: {
        connect: [{ id: klasse8d.id }],
      },
    },
  })

  const student6 = await prisma.user.create({
    data: {
      name: 'Felix Weber',
      loginCode: 'STUD006',
      role: 'STUDENT',
      learningGroups: {
        connect: [{ id: klasse8d.id }],
      },
    },
  })

  // Create students for GK13
  const student7 = await prisma.user.create({
    data: {
      name: 'Julia Koch',
      loginCode: 'STUD007',
      role: 'STUDENT',
      learningGroups: {
        connect: [{ id: gk13.id }],
      },
    },
  })

  const student8 = await prisma.user.create({
    data: {
      name: 'Max Hoffmann',
      loginCode: 'STUD008',
      role: 'STUDENT',
      learningGroups: {
        connect: [{ id: gk13.id }],
      },
    },
  })

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