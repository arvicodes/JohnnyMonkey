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
  // Fächer werden jetzt über die UI erstellt, nicht mehr über Seeds
  // Dies verhindert, dass alte Test-Daten die aktuellen Fächer überschreiben

  // --- LEARNING GROUPS ---
  let klasse6a = await prisma.learningGroup.findFirst({ where: { name: 'Klasse 6a', teacherId: teacher1.id } })
  if (!klasse6a) {
    klasse6a = await prisma.learningGroup.create({
      data: { 
        name: 'Klasse 6a', 
        teacherId: teacher1.id 
      },
    })
  }

  let gk11 = await prisma.learningGroup.findFirst({ where: { name: 'GK11', teacherId: teacher1.id } })
  if (!gk11) {
    gk11 = await prisma.learningGroup.create({
      data: { 
        name: 'GK11', 
        teacherId: teacher1.id 
      },
    })
  }

  let klasse7b = await prisma.learningGroup.findFirst({ where: { name: 'Klasse 7b', teacherId: teacher2.id } })
  if (!klasse7b) {
    klasse7b = await prisma.learningGroup.create({
      data: { 
        name: 'Klasse 7b', 
        teacherId: teacher2.id 
      },
    })
  }

  // --- STUDENTS ---
  const students = [
    { name: 'Anna Schmidt', loginCode: 'STUD001', role: 'STUDENT' },
    { name: 'Max Müller', loginCode: 'STUD002', role: 'STUDENT' },
    { name: 'Lisa Weber', loginCode: 'STUD003', role: 'STUDENT' },
    { name: 'Tom Fischer', loginCode: 'STUD004', role: 'STUDENT' },
    { name: 'Sarah Klein', loginCode: 'STUD005', role: 'STUDENT' },
    { name: 'Felix Wagner', loginCode: 'STUD006', role: 'STUDENT' },
    { name: 'Emma Schulz', loginCode: 'STUD007', role: 'STUDENT' },
    { name: 'Lucas Becker', loginCode: 'STUD008', role: 'STUDENT' },
    { name: 'Mia Hoffmann', loginCode: 'STUD009', role: 'STUDENT' },
    { name: 'Noah Schäfer', loginCode: 'STUD010', role: 'STUDENT' },
    { name: 'Hannah Meyer', loginCode: 'STUD011', role: 'STUDENT' },
    { name: 'Jonas Koch', loginCode: 'STUD012', role: 'STUDENT' },
    { name: 'Lea Bauer', loginCode: 'STUD013', role: 'STUDENT' },
    { name: 'Paul Richter', loginCode: 'STUD014', role: 'STUDENT' },
    { name: 'Sophie Werner', loginCode: 'STUD015', role: 'STUDENT' },
    { name: 'Tim Neumann', loginCode: 'STUD016', role: 'STUDENT' },
    { name: 'Nina Schwarz', loginCode: 'STUD017', role: 'STUDENT' },
    { name: 'David Zimmermann', loginCode: 'STUD018', role: 'STUDENT' },
    { name: 'Laura Braun', loginCode: 'STUD019', role: 'STUDENT' },
    { name: 'Jan Krüger', loginCode: 'STUD020', role: 'STUDENT' }
  ];

  const createdStudents: any[] = [];
  for (const studentData of students) {
    let student = await prisma.user.findUnique({ where: { loginCode: studentData.loginCode } });
    if (!student) {
      student = await prisma.user.create({
        data: studentData
      });
    }
    createdStudents.push(student);
  }

  // --- ADD STUDENTS TO LEARNING GROUPS ---
  // Klasse 6a: Students 1-10
  for (let i = 0; i < 10; i++) {
    await prisma.learningGroup.update({
      where: { id: klasse6a.id },
      data: {
        students: {
          connect: { id: createdStudents[i].id }
        }
      }
    });
  }

  // GK11: Students 11-20
  for (let i = 10; i < 20; i++) {
    await prisma.learningGroup.update({
      where: { id: gk11.id },
      data: {
        students: {
          connect: { id: createdStudents[i].id }
        }
      }
    });
  }

  // Klasse 7b: Students 1-5, 11-15 (mixed)
  const klasse7bStudents = [0, 1, 2, 3, 4, 10, 11, 12, 13, 14];
  for (const studentIndex of klasse7bStudents) {
    await prisma.learningGroup.update({
      where: { id: klasse7b.id },
      data: {
        students: {
          connect: { id: createdStudents[studentIndex].id }
        }
      }
    });
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