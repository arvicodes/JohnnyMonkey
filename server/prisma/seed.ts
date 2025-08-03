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

  let teacher002 = await prisma.user.findUnique({ where: { loginCode: 'TEACH002' } })
  if (!teacher002) {
    teacher002 = await prisma.user.create({
      data: { name: 'Herr Kowalski', loginCode: 'TEACH002', role: 'TEACHER' },
    })
  }

  // --- SUBJECTS ---
  let mathematik = await prisma.subject.findFirst({ where: { name: 'Mathematik', teacherId: teacher1.id } })
  if (!mathematik) {
    mathematik = await prisma.subject.create({
      data: {
        name: 'Mathematik',
        description: 'Mathematik für Klasse 7',
        teacherId: teacher1.id,
        order: 0
      }
    })
  }

  let informatik = await prisma.subject.findFirst({ where: { name: 'Informatik', teacherId: teacher1.id } })
  if (!informatik) {
    informatik = await prisma.subject.create({
      data: {
        name: 'Informatik',
        description: 'Informatik für GK 12',
        teacherId: teacher1.id,
        order: 1
      }
    })
  }

  // --- BLOCKS ---
  let klasse7 = await prisma.block.findFirst({ where: { name: 'Klasse 7', subjectId: mathematik.id } })
  if (!klasse7) {
    klasse7 = await prisma.block.create({
      data: {
        name: 'Klasse 7',
        description: '',
        subjectId: mathematik.id,
        order: 0
      }
    })
  }

  let mssgrundthemen = await prisma.block.findFirst({ where: { name: 'MSS: Grundthemen', subjectId: informatik.id } })
  if (!mssgrundthemen) {
    mssgrundthemen = await prisma.block.create({
      data: {
        name: 'MSS: Grundthemen',
        description: '',
        subjectId: informatik.id,
        order: 0
      }
    })
  }

  let msswahlundprojektthemen = await prisma.block.findFirst({ where: { name: 'MSS: Wahl- und Projektthemen', subjectId: informatik.id } })
  if (!msswahlundprojektthemen) {
    msswahlundprojektthemen = await prisma.block.create({
      data: {
        name: 'MSS: Wahl- und Projektthemen',
        description: '',
        subjectId: informatik.id,
        order: 0
      }
    })
  }

  // --- UNITS ---
  let ganzeundrationalezahlenkapitel5 = await prisma.unit.findFirst({ where: { name: 'Ganze und rationale Zahlen (Kapitel 5)', blockId: klasse7.id } })
  if (!ganzeundrationalezahlenkapitel5) {
    ganzeundrationalezahlenkapitel5 = await prisma.unit.create({
      data: {
        name: 'Ganze und rationale Zahlen (Kapitel 5)',
        description: '',
        blockId: klasse7.id,
        order: 0
      }
    })
  }

  let datenundzufallkapitel4 = await prisma.unit.findFirst({ where: { name: 'Daten und Zufall (Kapitel 4)', blockId: klasse7.id } })
  if (!datenundzufallkapitel4) {
    datenundzufallkapitel4 = await prisma.unit.create({
      data: {
        name: 'Daten und Zufall (Kapitel 4)',
        description: '',
        blockId: klasse7.id,
        order: 0
      }
    })
  }

  let grundlagen = await prisma.unit.findFirst({ where: { name: 'Grundlagen', blockId: mssgrundthemen.id } })
  if (!grundlagen) {
    grundlagen = await prisma.unit.create({
      data: {
        name: 'Grundlagen',
        description: '',
        blockId: mssgrundthemen.id,
        order: 0
      }
    })
  }

  let druck = await prisma.unit.findFirst({ where: { name: '3D Druck', blockId: msswahlundprojektthemen.id } })
  if (!druck) {
    druck = await prisma.unit.create({
      data: {
        name: '3D Druck',
        description: '',
        blockId: msswahlundprojektthemen.id,
        order: 0
      }
    })
  }

  // --- TOPICS ---
  let unserGrundwissen = await prisma.topic.findFirst({ where: { name: 'Unser Grundwissen ... ', unitId: ganzeundrationalezahlenkapitel5.id } })
  if (!unserGrundwissen) {
    unserGrundwissen = await prisma.topic.create({
      data: {
        name: 'Unser Grundwissen ... ',
        description: '',
        unitId: ganzeundrationalezahlenkapitel5.id,
        order: 0
      }
    })
  }

  let grundlagenTopic = await prisma.topic.findFirst({ where: { name: 'Grundlagen', unitId: grundlagen.id } })
  if (!grundlagenTopic) {
    grundlagenTopic = await prisma.topic.create({
      data: {
        name: 'Grundlagen',
        description: '',
        unitId: grundlagen.id,
        order: 0
      }
    })
  }

  let dererstedruck = await prisma.topic.findFirst({ where: { name: 'Der erste Druck', unitId: druck.id } })
  if (!dererstedruck) {
    dererstedruck = await prisma.topic.create({
      data: {
        name: 'Der erste Druck',
        description: '',
        unitId: druck.id,
        order: 0
      }
    })
  }

  // --- LESSONS ---
  let sommeraufgaben = await prisma.lesson.findFirst({ where: { name: 'Sommeraufgaben zur Wiederholung', topicId: unserGrundwissen.id } })
  if (!sommeraufgaben) {
    sommeraufgaben = await prisma.lesson.create({
      data: {
        name: 'Sommeraufgaben zur Wiederholung',
        description: '',
        topicId: unserGrundwissen.id,
        order: 0
      }
    })
  }

  let mehrSommeraufgaben = await prisma.lesson.findFirst({ where: { name: 'Mehr Sommeraufgaben zum Üben', topicId: unserGrundwissen.id } })
  if (!mehrSommeraufgaben) {
    mehrSommeraufgaben = await prisma.lesson.create({
      data: {
        name: 'Mehr Sommeraufgaben zum Üben',
        description: '',
        topicId: unserGrundwissen.id,
        order: 0
      }
    })
  }

  let pruefungsblock = await prisma.lesson.findFirst({ where: { name: 'PRÜFUNGSBLOCK', topicId: unserGrundwissen.id } })
  if (!pruefungsblock) {
    pruefungsblock = await prisma.lesson.create({
      data: {
        name: 'PRÜFUNGSBLOCK',
        description: '',
        topicId: unserGrundwissen.id,
        order: 0
      }
    })
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

  let informatikgk12 = await prisma.learningGroup.findFirst({ where: { name: 'Informatik GK 12', teacherId: teacher1.id } })
  if (!informatikgk12) {
    informatikgk12 = await prisma.learningGroup.create({
      data: { 
        name: 'Informatik GK 12', 
        teacherId: teacher1.id 
      },
    })
  }

  let klasse10c = await prisma.learningGroup.findFirst({ where: { name: 'Klasse 10c', teacherId: teacher002.id } })
  if (!klasse10c) {
    klasse10c = await prisma.learningGroup.create({
      data: { 
        name: 'Klasse 10c', 
        teacherId: teacher002.id 
      },
    })
  }

  // --- STUDENTS ---
  // Schüler in der exakten Reihenfolge der Datenbank
  const students = [
    { name: 'Adela Mureşan', loginCode: 'STUD017', role: 'STUDENT' },
    { name: 'Andreas Thielen', loginCode: 'STUD026', role: 'STUDENT' },
    { name: 'Arthur Potemkin', loginCode: 'STUD020', role: 'STUDENT' },
    { name: 'Bruno Scavio', loginCode: 'STUD022', role: 'STUDENT' },
    { name: 'Dennis Miller', loginCode: 'STUD015', role: 'STUDENT' },
    { name: 'Fabio Urso', loginCode: 'STUD027', role: 'STUDENT' },
    { name: 'Felix Schmelzlin', loginCode: 'STUD024', role: 'STUDENT' },
    { name: 'Freya Zipper', loginCode: 'STUD031', role: 'STUDENT' },
    { name: 'Friederike Bremser', loginCode: 'STUD003', role: 'STUDENT' },
    { name: 'Hannah Hagedorn', loginCode: 'STUD009', role: 'STUDENT' },
    { name: 'Jakob Ackermann', loginCode: 'STUD001', role: 'STUDENT' },
    { name: 'Jan Wimmershoff', loginCode: 'STUD030', role: 'STUDENT' },
    { name: 'Jasmin Farnung', loginCode: 'STUD005', role: 'STUDENT' },
    { name: 'Jonas Maxeiner', loginCode: 'STUD013', role: 'STUDENT' },
    { name: 'Jonathan Dillmann', loginCode: 'STUD004', role: 'STUDENT' },
    { name: 'Josefine Baierl', loginCode: 'STUD002', role: 'STUDENT' },
    { name: 'Julia Reiners', loginCode: 'STUD021', role: 'STUDENT' },
    { name: 'Kilian Jahnke', loginCode: 'STUD010', role: 'STUDENT' },
    { name: 'Lennas Weinem', loginCode: 'STUD028', role: 'STUDENT' },
    { name: 'Louis Gerharz', loginCode: 'STUD007', role: 'STUDENT' },
    { name: 'Louisa Plattes', loginCode: 'STUD019', role: 'STUDENT' },
    { name: 'Luise Habach', loginCode: 'STUD008', role: 'STUDENT' },
    { name: 'Marlene Geis', loginCode: 'STUD006', role: 'STUDENT' },
    { name: 'Marlene Krall', loginCode: 'STUD011', role: 'STUDENT' },
    { name: 'Miró Mohr', loginCode: 'STUD016', role: 'STUDENT' },
    { name: 'Niklas Schmitz', loginCode: 'STUD025', role: 'STUDENT' },
    { name: 'Nils Weiß', loginCode: 'STUD029', role: 'STUDENT' },
    { name: 'Paul Pfeifer', loginCode: 'STUD018', role: 'STUDENT' },
    { name: 'Robin Maas', loginCode: 'STUD012', role: 'STUDENT' },
    { name: 'Samuel May', loginCode: 'STUD014', role: 'STUDENT' },
    { name: 'Vincent Schlag', loginCode: 'STUD023', role: 'STUDENT' },
    { name: 'Laura Braun', loginCode: 'STUD019_ORIG', role: 'STUDENT' },
    { name: 'Lea Bauer', loginCode: 'STUD013_ORIG', role: 'STUDENT' }
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
  // Klasse 7a: Alle 31 Schüler aus Screenshots
  const klasse7aStudents = students.slice(0, 31); // Erste 31 Schüler
  for (const studentData of klasse7aStudents) {
    await prisma.learningGroup.update({
      where: { id: klasse7a.id },
      data: {
        students: {
          connect: { id: createdStudents.find(s => s.loginCode === studentData.loginCode).id }
        }
      }
    });
  }

  // Informatik GK 12: Laura Braun und Lea Bauer
  const informatikStudents = students.slice(31); // Letzte 2 Schüler
  for (const studentData of informatikStudents) {
    await prisma.learningGroup.update({
      where: { id: informatikgk12.id },
      data: {
        students: {
          connect: { id: createdStudents.find(s => s.loginCode === studentData.loginCode).id }
        }
      }
    });
  }

  // --- ASSIGNMENTS ---
  // Assignments für Klasse 7a
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

  let blockAssignment = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'block',
      refId: klasse7.id
    }
  });
  if (!blockAssignment) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'block',
        refId: klasse7.id
      }
    });
  }

  let unitAssignment = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'unit',
      refId: ganzeundrationalezahlenkapitel5.id
    }
  });
  if (!unitAssignment) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'unit',
        refId: ganzeundrationalezahlenkapitel5.id
      }
    });
  }

  let topicAssignment = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'topic',
      refId: unserGrundwissen.id
    }
  });
  if (!topicAssignment) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'topic',
        refId: unserGrundwissen.id
      }
    });
  }

  // Lesson Assignments für Klasse 7a
  const lessons = [sommeraufgaben, mehrSommeraufgaben, pruefungsblock];
  for (const lesson of lessons) {
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

  console.log('Seed finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
