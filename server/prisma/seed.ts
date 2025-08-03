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



  // Clear students from Klasse 6a if it exists
  const existingKlasse6a = await prisma.learningGroup.findFirst({ where: { name: 'Klasse 6a', teacherId: teacher1.id } })
  if (existingKlasse6a) {
    await prisma.learningGroup.update({
      where: { id: existingKlasse6a.id },
      data: {
        students: {
          set: []
        }
      }
    })
    console.log('Alle Schüler aus Klasse 6a entfernt')
  }

  // Clear students from GK11 if it exists
  const existingGK11 = await prisma.learningGroup.findFirst({ where: { name: 'GK11', teacherId: teacher1.id } })
  if (existingGK11) {
    await prisma.learningGroup.update({
      where: { id: existingGK11.id },
      data: {
        students: {
          set: []
        }
      }
    })
    console.log('Alle Schüler aus GK11 entfernt')
  }

  // --- LEARNING GROUPS ---
  let klasse7a = await prisma.learningGroup.findFirst({ where: { name: 'Klasse 7a', teacherId: teacher1.id } })
  if (!klasse7a) {
    klasse7a = await prisma.learningGroup.create({
      data: { 
        name: 'Klasse 7a', 
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
  // Klasse 7a - Schüler nach Nachnamen alphabetisch sortiert, nur erste Vornamen
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

  // Lösche alle anderen Schüler, die nicht in der Liste stehen
  const allStudents = await prisma.user.findMany({
    where: { role: 'STUDENT' }
  });
  
  const validLoginCodes = students.map(s => s.loginCode);
  const studentsToDelete = allStudents.filter(s => !validLoginCodes.includes(s.loginCode));
  
  if (studentsToDelete.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: studentsToDelete.map(s => s.id)
        }
      }
    });
    console.log(`${studentsToDelete.length} unerwünschte Schüler gelöscht`);
  }

  // Erstelle oder aktualisiere Schüler
  const createdStudents: any[] = [];
  for (const studentData of students) {
    let student = await prisma.user.findUnique({ where: { loginCode: studentData.loginCode } });
    if (!student) {
      student = await prisma.user.create({
        data: studentData
      });
      console.log(`Schüler erstellt: ${student.name}`);
    } else {
      // Aktualisiere den Namen falls er sich geändert hat
      if (student.name !== studentData.name) {
        student = await prisma.user.update({
          where: { id: student.id },
          data: { name: studentData.name }
        });
        console.log(`Schüler aktualisiert: ${student.name}`);
      }
    }
    createdStudents.push(student);
  }

  // --- ADD STUDENTS TO LEARNING GROUPS ---
  // Klasse 7a: Alle 31 Schüler von Frau Christ (ersetze alle bestehenden)
  if (klasse7a) {
    await prisma.learningGroup.update({
      where: { id: klasse7a.id },
      data: {
        students: {
          set: createdStudents.map(s => ({ id: s.id }))
        }
      }
    });
    console.log(`Klasse 7a: ${createdStudents.length} Schüler zugewiesen`);
  }

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