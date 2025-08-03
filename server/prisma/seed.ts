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
  const students = [
    { name: 'Anna Schmidt', loginCode: 's1', role: 'STUDENT' },
    { name: 'Laura Braun', loginCode: 'STUD019', role: 'STUDENT' },
    { name: 'Lea Bauer', loginCode: 'STUD013', role: 'STUDENT' }
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
  // Klasse 7a: Anna Schmidt
  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents[0].id }
      }
    }
  });

  // Informatik GK 12: Laura Braun und Lea Bauer
  await prisma.learningGroup.update({
    where: { id: informatikGK12.id },
    data: {
      students: {
        connect: { id: createdStudents[1].id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikGK12.id },
    data: {
      students: {
        connect: { id: createdStudents[2].id }
      }
    }
  });

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