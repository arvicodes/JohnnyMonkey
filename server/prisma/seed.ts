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
  let matheTopics = [
    { name: 'Addition und Subtraktion', unitId: matheUnit1.id, order: 0 },
    { name: 'Multiplikation und Division', unitId: matheUnit1.id, order: 1 },
    { name: 'Gemischte Zahlen', unitId: matheUnit1.id, order: 2 },
    { name: 'Dezimalzahlen', unitId: matheUnit1.id, order: 3 },
    { name: 'Prozentrechnung Grundlagen', unitId: matheUnit1.id, order: 4 },
    { name: 'Zinsrechnung', unitId: matheUnit1.id, order: 5 },
    { name: 'Dreiecksarten', unitId: matheUnit1.id, order: 6 },
    { name: 'Satz des Pythagoras', unitId: matheUnit1.id, order: 7 },
    { name: 'Kreisumfang', unitId: matheUnit1.id, order: 8 },
    { name: 'Kreisfläche', unitId: matheUnit1.id, order: 9 },
    { name: 'Einfache Gleichungen', unitId: matheUnit1.id, order: 10 },
    { name: 'Gleichungen mit Klammern', unitId: matheUnit1.id, order: 11 },
    { name: 'Daten sammeln und darstellen', unitId: matheUnit2.id, order: 0 },
    { name: 'Mittelwert und Median', unitId: matheUnit2.id, order: 1 },
    { name: 'Wahrscheinlichkeit', unitId: matheUnit2.id, order: 2 },
    { name: 'Zufallsexperimente', unitId: matheUnit2.id, order: 3 }
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
    { name: 'Klammern auflösen', topicId: (await prisma.topic.findFirst({ where: { name: 'Gleichungen mit Klammern' } }))!.id, order: 1 },
    { name: 'Daten sammeln', topicId: (await prisma.topic.findFirst({ where: { name: 'Daten sammeln und darstellen' } }))!.id, order: 0 },
    { name: 'Daten darstellen', topicId: (await prisma.topic.findFirst({ where: { name: 'Daten sammeln und darstellen' } }))!.id, order: 1 },
    { name: 'Mittelwert berechnen', topicId: (await prisma.topic.findFirst({ where: { name: 'Mittelwert und Median' } }))!.id, order: 0 },
    { name: 'Median bestimmen', topicId: (await prisma.topic.findFirst({ where: { name: 'Mittelwert und Median' } }))!.id, order: 1 },
    { name: 'Wahrscheinlichkeit Grundlagen', topicId: (await prisma.topic.findFirst({ where: { name: 'Wahrscheinlichkeit' } }))!.id, order: 0 },
    { name: 'Wahrscheinlichkeit berechnen', topicId: (await prisma.topic.findFirst({ where: { name: 'Wahrscheinlichkeit' } }))!.id, order: 1 },
    { name: 'Zufallsexperimente durchführen', topicId: (await prisma.topic.findFirst({ where: { name: 'Zufallsexperimente' } }))!.id, order: 0 },
    { name: 'Zufallsexperimente auswerten', topicId: (await prisma.topic.findFirst({ where: { name: 'Zufallsexperimente' } }))!.id, order: 1 }
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

  // Block Assignments
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

  // Unit Assignments
  const matheUnits = [matheUnit1, matheUnit2];
  for (const unit of matheUnits) {
    let unitAssignment = await prisma.groupAssignment.findFirst({
      where: {
        groupId: klasse7a.id,
        type: 'unit',
        refId: unit.id
      }
    });
    if (!unitAssignment) {
      await prisma.groupAssignment.create({
        data: {
          groupId: klasse7a.id,
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
          groupId: klasse7a.id,
          type: 'topic',
          refId: topic.id
        }
      });
      if (!topicAssignment) {
        await prisma.groupAssignment.create({
          data: {
            groupId: klasse7a.id,
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

  console.log('Database has been seeded with current structure! 🌱')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 