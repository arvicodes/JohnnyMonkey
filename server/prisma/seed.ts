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
  let matheBlock1 = await prisma.block.findFirst({ where: { name: 'Grundlagen', subjectId: mathematik.id } })
  if (!matheBlock1) {
    matheBlock1 = await prisma.block.create({
      data: {
        name: 'Grundlagen',
        description: 'Mathematische Grundlagen',
        subjectId: mathematik.id,
        order: 0
      }
    })
  }

  let matheBlock2 = await prisma.block.findFirst({ where: { name: 'Geometrie', subjectId: mathematik.id } })
  if (!matheBlock2) {
    matheBlock2 = await prisma.block.create({
      data: {
        name: 'Geometrie',
        description: 'Geometrische Formen und Berechnungen',
        subjectId: mathematik.id,
        order: 1
      }
    })
  }

  let matheBlock3 = await prisma.block.findFirst({ where: { name: 'Algebra', subjectId: mathematik.id } })
  if (!matheBlock3) {
    matheBlock3 = await prisma.block.create({
      data: {
        name: 'Algebra',
        description: 'Algebraische Ausdrücke und Gleichungen',
        subjectId: mathematik.id,
        order: 2
      }
    })
  }

  // --- UNITS für Mathematik ---
  let matheUnit1 = await prisma.unit.findFirst({ where: { name: 'Zahlen und Operationen', blockId: matheBlock1.id } })
  if (!matheUnit1) {
    matheUnit1 = await prisma.unit.create({
      data: {
        name: 'Zahlen und Operationen',
        description: 'Grundlegende Zahlenoperationen',
        blockId: matheBlock1.id,
        order: 0
      }
    })
  }

  let matheUnit2 = await prisma.unit.findFirst({ where: { name: 'Brüche und Dezimalzahlen', blockId: matheBlock1.id } })
  if (!matheUnit2) {
    matheUnit2 = await prisma.unit.create({
      data: {
        name: 'Brüche und Dezimalzahlen',
        description: 'Arbeiten mit Brüchen und Dezimalzahlen',
        blockId: matheBlock1.id,
        order: 1
      }
    })
  }

  let matheUnit3 = await prisma.unit.findFirst({ where: { name: 'Prozentrechnung', blockId: matheBlock1.id } })
  if (!matheUnit3) {
    matheUnit3 = await prisma.unit.create({
      data: {
        name: 'Prozentrechnung',
        description: 'Prozentrechnung und Zinsrechnung',
        blockId: matheBlock1.id,
        order: 2
      }
    })
  }

  let matheUnit4 = await prisma.unit.findFirst({ where: { name: 'Dreiecke', blockId: matheBlock2.id } })
  if (!matheUnit4) {
    matheUnit4 = await prisma.unit.create({
      data: {
        name: 'Dreiecke',
        description: 'Eigenschaften und Berechnungen von Dreiecken',
        blockId: matheBlock2.id,
        order: 0
      }
    })
  }

  let matheUnit5 = await prisma.unit.findFirst({ where: { name: 'Kreise', blockId: matheBlock2.id } })
  if (!matheUnit5) {
    matheUnit5 = await prisma.unit.create({
      data: {
        name: 'Kreise',
        description: 'Kreisberechnungen und Flächen',
        blockId: matheBlock2.id,
        order: 1
      }
    })
  }

  let matheUnit6 = await prisma.unit.findFirst({ where: { name: 'Gleichungen', blockId: matheBlock3.id } })
  if (!matheUnit6) {
    matheUnit6 = await prisma.unit.create({
      data: {
        name: 'Gleichungen',
        description: 'Lineare Gleichungen lösen',
        blockId: matheBlock3.id,
        order: 0
      }
    })
  }

  // --- TOPICS für Mathematik ---
  let matheTopics = [
    { name: 'Addition und Subtraktion', unitId: matheUnit1.id, order: 0 },
    { name: 'Multiplikation und Division', unitId: matheUnit1.id, order: 1 },
    { name: 'Gemischte Zahlen', unitId: matheUnit2.id, order: 0 },
    { name: 'Dezimalzahlen', unitId: matheUnit2.id, order: 1 },
    { name: 'Prozentrechnung Grundlagen', unitId: matheUnit3.id, order: 0 },
    { name: 'Zinsrechnung', unitId: matheUnit3.id, order: 1 },
    { name: 'Dreiecksarten', unitId: matheUnit4.id, order: 0 },
    { name: 'Satz des Pythagoras', unitId: matheUnit4.id, order: 1 },
    { name: 'Kreisumfang', unitId: matheUnit5.id, order: 0 },
    { name: 'Kreisfläche', unitId: matheUnit5.id, order: 1 },
    { name: 'Einfache Gleichungen', unitId: matheUnit6.id, order: 0 },
    { name: 'Gleichungen mit Klammern', unitId: matheUnit6.id, order: 1 }
  ]

  for (const topicData of matheTopics) {
    let topic = await prisma.topic.findFirst({ where: { name: topicData.name, unitId: topicData.unitId } })
    if (!topic) {
      topic = await prisma.topic.create({
        data: topicData
      })
    }
  }

  // --- LESSONS für Mathematik ---
  let matheLessons = [
    { name: 'Addition von natürlichen Zahlen', topicId: (await prisma.topic.findFirst({ where: { name: 'Addition und Subtraktion' } }))!.id, order: 0 },
    { name: 'Subtraktion von natürlichen Zahlen', topicId: (await prisma.topic.findFirst({ where: { name: 'Addition und Subtraktion' } }))!.id, order: 1 },
    { name: 'Multiplikation von natürlichen Zahlen', topicId: (await prisma.topic.findFirst({ where: { name: 'Multiplikation und Division' } }))!.id, order: 0 },
    { name: 'Division von natürlichen Zahlen', topicId: (await prisma.topic.findFirst({ where: { name: 'Multiplikation und Division' } }))!.id, order: 1 },
    { name: 'Gemischte Zahlen addieren', topicId: (await prisma.topic.findFirst({ where: { name: 'Gemischte Zahlen' } }))!.id, order: 0 },
    { name: 'Gemischte Zahlen subtrahieren', topicId: (await prisma.topic.findFirst({ where: { name: 'Gemischte Zahlen' } }))!.id, order: 1 },
    { name: 'Dezimalzahlen addieren', topicId: (await prisma.topic.findFirst({ where: { name: 'Dezimalzahlen' } }))!.id, order: 0 },
    { name: 'Dezimalzahlen multiplizieren', topicId: (await prisma.topic.findFirst({ where: { name: 'Dezimalzahlen' } }))!.id, order: 1 },
    { name: 'Prozentrechnung Grundlagen', topicId: (await prisma.topic.findFirst({ where: { name: 'Prozentrechnung Grundlagen' } }))!.id, order: 0 },
    { name: 'Prozentrechnung Aufgaben', topicId: (await prisma.topic.findFirst({ where: { name: 'Prozentrechnung Grundlagen' } }))!.id, order: 1 },
    { name: 'Einfache Zinsrechnung', topicId: (await prisma.topic.findFirst({ where: { name: 'Zinsrechnung' } }))!.id, order: 0 },
    { name: 'Zinseszinsrechnung', topicId: (await prisma.topic.findFirst({ where: { name: 'Zinsrechnung' } }))!.id, order: 1 },
    { name: 'Dreiecksarten kennenlernen', topicId: (await prisma.topic.findFirst({ where: { name: 'Dreiecksarten' } }))!.id, order: 0 },
    { name: 'Dreiecksarten bestimmen', topicId: (await prisma.topic.findFirst({ where: { name: 'Dreiecksarten' } }))!.id, order: 1 },
    { name: 'Satz des Pythagoras', topicId: (await prisma.topic.findFirst({ where: { name: 'Satz des Pythagoras' } }))!.id, order: 0 },
    { name: 'Pythagoras Aufgaben', topicId: (await prisma.topic.findFirst({ where: { name: 'Satz des Pythagoras' } }))!.id, order: 1 },
    { name: 'Kreisumfang berechnen', topicId: (await prisma.topic.findFirst({ where: { name: 'Kreisumfang' } }))!.id, order: 0 },
    { name: 'Kreisumfang Aufgaben', topicId: (await prisma.topic.findFirst({ where: { name: 'Kreisumfang' } }))!.id, order: 1 },
    { name: 'Kreisfläche berechnen', topicId: (await prisma.topic.findFirst({ where: { name: 'Kreisfläche' } }))!.id, order: 0 },
    { name: 'Kreisfläche Aufgaben', topicId: (await prisma.topic.findFirst({ where: { name: 'Kreisfläche' } }))!.id, order: 1 },
    { name: 'Einfache Gleichungen lösen', topicId: (await prisma.topic.findFirst({ where: { name: 'Einfache Gleichungen' } }))!.id, order: 0 },
    { name: 'Gleichungen mit einer Unbekannten', topicId: (await prisma.topic.findFirst({ where: { name: 'Einfache Gleichungen' } }))!.id, order: 1 },
    { name: 'Gleichungen mit Klammern', topicId: (await prisma.topic.findFirst({ where: { name: 'Gleichungen mit Klammern' } }))!.id, order: 0 },
    { name: 'Klammern auflösen', topicId: (await prisma.topic.findFirst({ where: { name: 'Gleichungen mit Klammern' } }))!.id, order: 1 }
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

  // --- ASSIGNMENTS für Klasse 6a ---
  // Subject Assignment
  let subjectAssignment = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse6a.id,
      type: 'subject',
      refId: mathematik.id
    }
  });
  if (!subjectAssignment) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse6a.id,
        type: 'subject',
        refId: mathematik.id
      }
    });
  }

  // Block Assignments
  const matheBlocks = [matheBlock1, matheBlock2, matheBlock3];
  for (const block of matheBlocks) {
    let blockAssignment = await prisma.groupAssignment.findFirst({
      where: {
        groupId: klasse6a.id,
        type: 'block',
        refId: block.id
      }
    });
    if (!blockAssignment) {
      await prisma.groupAssignment.create({
        data: {
          groupId: klasse6a.id,
          type: 'block',
          refId: block.id
        }
      });
    }
  }

  // Unit Assignments
  const matheUnits = [matheUnit1, matheUnit2, matheUnit3, matheUnit4, matheUnit5, matheUnit6];
  for (const unit of matheUnits) {
    let unitAssignment = await prisma.groupAssignment.findFirst({
      where: {
        groupId: klasse6a.id,
        type: 'unit',
        refId: unit.id
      }
    });
    if (!unitAssignment) {
      await prisma.groupAssignment.create({
        data: {
          groupId: klasse6a.id,
          type: 'unit',
          refId: unit.id
        }
      });
    }
  }

  // Topic Assignments
  for (const topicData of matheTopics) {
    const topic = await prisma.topic.findFirst({ where: { name: topicData.name, unitId: topicData.unitId } });
    if (topic) {
      let topicAssignment = await prisma.groupAssignment.findFirst({
        where: {
          groupId: klasse6a.id,
          type: 'topic',
          refId: topic.id
        }
      });
      if (!topicAssignment) {
        await prisma.groupAssignment.create({
          data: {
            groupId: klasse6a.id,
            type: 'topic',
            refId: topic.id
          }
        });
      }
    }
  }

  // Lesson Assignments
  for (const lessonData of matheLessons) {
    const lesson = await prisma.lesson.findFirst({ where: { name: lessonData.name, topicId: lessonData.topicId } });
    if (lesson) {
      let lessonAssignment = await prisma.groupAssignment.findFirst({
        where: {
          groupId: klasse6a.id,
          type: 'lesson',
          refId: lesson.id
        }
      });
      if (!lessonAssignment) {
        await prisma.groupAssignment.create({
          data: {
            groupId: klasse6a.id,
            type: 'lesson',
            refId: lesson.id
          }
        });
      }
    }
  }

  console.log('Database has been seeded with complete content structure! 🌱')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 