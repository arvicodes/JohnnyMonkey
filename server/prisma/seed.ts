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

  // --- DELETE OLD KLASSE 7A IF EXISTS ---
  const oldKlasse7a = await prisma.learningGroup.findFirst({ where: { name: 'Klasse 7a', teacherId: teacher1.id } })
  if (oldKlasse7a) {
    await prisma.learningGroup.delete({
      where: { id: oldKlasse7a.id }
    })
    console.log('Alte Klasse 7a wurde gelöscht')
  }

  // --- STUDENTS ---
  // Klasse 6a - Echte Schüler von Frau Christ
  const students = [
    { name: 'Jakob Ackermann', loginCode: 'STUD001', role: 'STUDENT' },
    { name: 'Josefine Baierl', loginCode: 'STUD002', role: 'STUDENT' },
    { name: 'Friederike Bremser', loginCode: 'STUD003', role: 'STUDENT' },
    { name: 'Jonathan Dillmann', loginCode: 'STUD004', role: 'STUDENT' },
    { name: 'Jasmin Farnung', loginCode: 'STUD005', role: 'STUDENT' },
    { name: 'Marlene Geis', loginCode: 'STUD006', role: 'STUDENT' },
    { name: 'Louis Gerharz', loginCode: 'STUD007', role: 'STUDENT' },
    { name: 'Luise Habach', loginCode: 'STUD008', role: 'STUDENT' },
    { name: 'Hannah Hagedorn', loginCode: 'STUD009', role: 'STUDENT' },
    { name: 'Kilian Jahnke', loginCode: 'STUD010', role: 'STUDENT' },
    { name: 'Marlene Krall', loginCode: 'STUD011', role: 'STUDENT' },
    { name: 'Robin Maas', loginCode: 'STUD012', role: 'STUDENT' },
    { name: 'Jonas Maxeiner', loginCode: 'STUD013', role: 'STUDENT' },
    { name: 'Samuel May', loginCode: 'STUD014', role: 'STUDENT' },
    { name: 'Dennis Miller', loginCode: 'STUD015', role: 'STUDENT' },
    { name: 'Miró Mohr', loginCode: 'STUD016', role: 'STUDENT' },
    { name: 'Adela Mureşan', loginCode: 'STUD017', role: 'STUDENT' },
    { name: 'Paul Pfeifer', loginCode: 'STUD018', role: 'STUDENT' },
    { name: 'Louisa Plattes', loginCode: 'STUD019', role: 'STUDENT' },
    { name: 'Arthur Potemkin', loginCode: 'STUD020', role: 'STUDENT' },
    { name: 'Julia Reiners', loginCode: 'STUD021', role: 'STUDENT' },
    { name: 'Bruno Scavio', loginCode: 'STUD022', role: 'STUDENT' },
    { name: 'Vincent Schlag', loginCode: 'STUD023', role: 'STUDENT' },
    { name: 'Felix Schmelzlin', loginCode: 'STUD024', role: 'STUDENT' },
    { name: 'Niklas Schmitz', loginCode: 'STUD025', role: 'STUDENT' },
    { name: 'Andreas Thielen', loginCode: 'STUD026', role: 'STUDENT' },
    { name: 'Fabio Urso', loginCode: 'STUD027', role: 'STUDENT' },
    { name: 'Lennas Weinem', loginCode: 'STUD028', role: 'STUDENT' },
    { name: 'Nils Weiß', loginCode: 'STUD029', role: 'STUDENT' },
    { name: 'Jan Wimmershoff', loginCode: 'STUD030', role: 'STUDENT' },
    { name: 'Freya Zipper', loginCode: 'STUD031', role: 'STUDENT' }
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
  // Klasse 6a: Alle 31 Schüler von Frau Christ
  for (let i = 0; i < createdStudents.length; i++) {
    await prisma.learningGroup.update({
      where: { id: klasse6a.id },
      data: {
        students: {
          connect: { id: createdStudents[i].id }
        }
      }
    });
  }

  // GK11: Leer lassen oder separate Schüler hinzufügen falls benötigt
  // Klasse 7b: Leer lassen oder separate Schüler hinzufügen falls benötigt

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