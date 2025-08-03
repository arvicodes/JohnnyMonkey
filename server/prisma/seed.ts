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
  // Mathematik für Klasse 6a
  let mathematik = await prisma.subject.findFirst({ where: { name: 'Mathematik', teacherId: teacher1.id } })
  if (!mathematik) {
    mathematik = await prisma.subject.create({
      data: {
        name: 'Mathematik',
        description: 'Mathematik für Klasse 6a',
        teacherId: teacher1.id,
        order: 0
      }
    })
  }

  // Informatik für GK11
  let informatik = await prisma.subject.findFirst({ where: { name: 'Informatik', teacherId: teacher1.id } })
  if (!informatik) {
    informatik = await prisma.subject.create({
      data: {
        name: 'Informatik',
        description: 'Informatik für GK11',
        teacherId: teacher1.id,
        order: 1
      }
    })
  }

  // --- BLOCKS für Mathematik ---
  let matheBlock1 = await prisma.block.findFirst({ where: { name: 'Klasse 7', subjectId: mathematik.id } })
  if (!matheBlock1) {
    matheBlock1 = await prisma.block.create({
      data: {
        name: 'Klasse 7',
        description: '',
        subjectId: mathematik.id,
        order: 0
      }
    })
  }

  // --- UNITS für Mathematik ---
  let matheUnit1 = await prisma.unit.findFirst({ where: { name: 'Ganze und rationale Zahlen (Kapitel 5)', blockId: matheBlock1.id } })
  if (!matheUnit1) {
    matheUnit1 = await prisma.unit.create({
      data: {
        name: 'Ganze und rationale Zahlen (Kapitel 5)',
        description: '',
        blockId: matheBlock1.id,
        order: 0
      }
    })
  }

  let matheUnit2 = await prisma.unit.findFirst({ where: { name: 'Daten und Zufall (Kapitel 4)', blockId: matheBlock1.id } })
  if (!matheUnit2) {
    matheUnit2 = await prisma.unit.create({
      data: {
        name: 'Daten und Zufall (Kapitel 4)',
        description: '',
        blockId: matheBlock1.id,
        order: 0
      }
    })
  }

  // --- TOPICS für Mathematik ---
  let matheTopic1 = await prisma.topic.findFirst({ where: { name: 'Unser Grundwissen ... ', unitId: matheUnit1.id } })
  if (!matheTopic1) {
    matheTopic1 = await prisma.topic.create({
      data: {
        name: 'Unser Grundwissen ... ',
        description: '',
        unitId: matheUnit1.id,
        order: 0
      }
    })
  }

  // --- LESSONS für Mathematik ---
  let matheLessons = [
    { name: 'Sommeraufgaben zur Wiederholung', topicId: matheTopic1.id, order: 0 },
    { name: 'Mehr Sommeraufgaben zum Üben', topicId: matheTopic1.id, order: 0 },
    { name: 'PRÜFUNGSBLOCK', topicId: matheTopic1.id, order: 0 }
  ]

  for (const lessonData of matheLessons) {
    let lesson = await prisma.lesson.findFirst({ where: { name: lessonData.name, topicId: lessonData.topicId } })
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: lessonData
      })
    }
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

  let informatikGK12 = await prisma.learningGroup.findFirst({ where: { name: 'Informatik GK 12', teacherId: teacher1.id } })
  if (!informatikGK12) {
    informatikGK12 = await prisma.learningGroup.create({
      data: { 
        name: 'Informatik GK 12', 
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
  // 31 Schüler aus den Screenshots, alphabetisch sortiert nach Nachnamen
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
  // Alle 31 Schüler zu Klasse 7a hinzufügen
  for (const student of createdStudents) {
    await prisma.learningGroup.update({
      where: { id: klasse7a.id },
      data: {
        students: {
          connect: { id: student.id }
        }
      }
    });
  }

  // --- ASSIGNMENTS für Klasse 7a ---
  // Subject Assignment
  let subjectAssignment = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'subject',
      refId: mathematik.id
    }
  });
  if (!subjectAssignment) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'subject',
        refId: mathematik.id
      }
    });
  }

  // Block Assignment
  let blockAssignment = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'block',
      refId: matheBlock1.id
    }
  });
  if (!blockAssignment) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'block',
        refId: matheBlock1.id
      }
    });
  }

  // Unit Assignment
  let unitAssignment = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'unit',
      refId: matheUnit1.id
    }
  });
  if (!unitAssignment) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'unit',
        refId: matheUnit1.id
      }
    });
  }

  // Topic Assignment
  let topicAssignment = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'topic',
      refId: matheTopic1.id
    }
  });
  if (!topicAssignment) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'topic',
        refId: matheTopic1.id
      }
    });
  }

  // Lesson Assignments
  for (const lessonData of matheLessons) {
    const lesson = await prisma.lesson.findFirst({ where: { name: lessonData.name, topicId: lessonData.topicId } });
    if (lesson) {
      let lessonAssignment = await prisma.groupAssignment.findFirst({
        where: {
          groupId: klasse7a.id,
          type: 'lesson',
          refId: lesson.id
        }
      });
      if (!lessonAssignment) {
        await prisma.groupAssignment.create({
          data: {
            groupId: klasse7a.id,
            type: 'lesson',
            refId: lesson.id
          }
        });
      }
    }
  }

  console.log('Database has been seeded with current structure after deletion! 🌱')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 