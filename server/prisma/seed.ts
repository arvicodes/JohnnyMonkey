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
  let mathematik = await prisma.subject.findFirst({ where: { name: 'Mathematik', teacherId: teacher01610.id } })
  if (!mathematik) {
    mathematik = await prisma.subject.create({
      data: {
        name: 'Mathematik',
        description: 'Mathematik für Klasse 6a',
        teacherId: teacher01610.id,
        order: 0
      }
    })
  }

  let informatik = await prisma.subject.findFirst({ where: { name: 'Informatik', teacherId: teacher01610.id } })
  if (!informatik) {
    informatik = await prisma.subject.create({
      data: {
        name: 'Informatik',
        description: 'Informatik für GK11',
        teacherId: teacher01610.id,
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

  let informatikinformation = await prisma.unit.findFirst({ where: { name: 'Informatik = Information?', blockId: mssgrundthemen.id } })
  if (!informatikinformation) {
    informatikinformation = await prisma.unit.create({
      data: {
        name: 'Informatik = Information?',
        description: '',
        blockId: mssgrundthemen.id,
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

  let 3ddruck = await prisma.unit.findFirst({ where: { name: '3D Druck', blockId: msswahlundprojektthemen.id } })
  if (!3ddruck) {
    3ddruck = await prisma.unit.create({
      data: {
        name: '3D Druck',
        description: '',
        blockId: msswahlundprojektthemen.id,
        order: 0
      }
    })
  }

  // --- TOPICS ---
  let unsergrundwissen = await prisma.topic.findFirst({ where: { name: 'Unser Grundwissen ... ', unitId: ganzeundrationalezahlenkapitel5.id } })
  if (!unsergrundwissen) {
    unsergrundwissen = await prisma.topic.create({
      data: {
        name: 'Unser Grundwissen ... ',
        description: '',
        unitId: ganzeundrationalezahlenkapitel5.id,
        order: 0
      }
    })
  }

  let stichproben41 = await prisma.topic.findFirst({ where: { name: 'Stichproben (4.1)', unitId: datenundzufallkapitel4.id } })
  if (!stichproben41) {
    stichproben41 = await prisma.topic.create({
      data: {
        name: 'Stichproben (4.1)',
        description: '',
        unitId: datenundzufallkapitel4.id,
        order: 0
      }
    })
  }

  let median42 = await prisma.topic.findFirst({ where: { name: 'Median (4.2)', unitId: datenundzufallkapitel4.id } })
  if (!median42) {
    median42 = await prisma.topic.create({
      data: {
        name: 'Median (4.2)',
        description: '',
        unitId: datenundzufallkapitel4.id,
        order: 0
      }
    })
  }

  let streuung43 = await prisma.topic.findFirst({ where: { name: 'Streuung (4.3)', unitId: datenundzufallkapitel4.id } })
  if (!streuung43) {
    streuung43 = await prisma.topic.create({
      data: {
        name: 'Streuung (4.3)',
        description: '',
        unitId: datenundzufallkapitel4.id,
        order: 0
      }
    })
  }

  let zufallsexperimente44und45 = await prisma.topic.findFirst({ where: { name: 'Zufallsexperimente (4.4 und 4.5)', unitId: datenundzufallkapitel4.id } })
  if (!zufallsexperimente44und45) {
    zufallsexperimente44und45 = await prisma.topic.create({
      data: {
        name: 'Zufallsexperimente (4.4 und 4.5)',
        description: '',
        unitId: datenundzufallkapitel4.id,
        order: 0
      }
    })
  }

  let ereignisse46 = await prisma.topic.findFirst({ where: { name: 'Ereignisse (4.6)', unitId: datenundzufallkapitel4.id } })
  if (!ereignisse46) {
    ereignisse46 = await prisma.topic.create({
      data: {
        name: 'Ereignisse (4.6)',
        description: '',
        unitId: datenundzufallkapitel4.id,
        order: 0
      }
    })
  }

  let blickpunktregen = await prisma.topic.findFirst({ where: { name: 'Blickpunkt Regen', unitId: datenundzufallkapitel4.id } })
  if (!blickpunktregen) {
    blickpunktregen = await prisma.topic.create({
      data: {
        name: 'Blickpunkt Regen',
        description: '',
        unitId: datenundzufallkapitel4.id,
        order: 0
      }
    })
  }

  let informationeninverschiedenendastellungsformen = await prisma.topic.findFirst({ where: { name: 'Informationen in verschiedenen Dastellungsformen', unitId: informatikinformation.id } })
  if (!informationeninverschiedenendastellungsformen) {
    informationeninverschiedenendastellungsformen = await prisma.topic.create({
      data: {
        name: 'Informationen in verschiedenen Dastellungsformen',
        description: '',
        unitId: informatikinformation.id,
        order: 0
      }
    })
  }

  let grundlagen = await prisma.topic.findFirst({ where: { name: 'Grundlagen', unitId: grundlagen.id } })
  if (!grundlagen) {
    grundlagen = await prisma.topic.create({
      data: {
        name: 'Grundlagen',
        description: '',
        unitId: grundlagen.id,
        order: 0
      }
    })
  }

  let grundlagen = await prisma.topic.findFirst({ where: { name: 'Grundlagen', unitId: 3ddruck.id } })
  if (!grundlagen) {
    grundlagen = await prisma.topic.create({
      data: {
        name: 'Grundlagen',
        description: '',
        unitId: 3ddruck.id,
        order: 0
      }
    })
  }

  let dererstedruck = await prisma.topic.findFirst({ where: { name: 'Der erste Druck', unitId: 3ddruck.id } })
  if (!dererstedruck) {
    dererstedruck = await prisma.topic.create({
      data: {
        name: 'Der erste Druck',
        description: '',
        unitId: 3ddruck.id,
        order: 0
      }
    })
  }

  // --- LESSONS ---
  let sommeraufgabenzurwiederholung = await prisma.lesson.findFirst({ where: { name: 'Sommeraufgaben zur Wiederholung', topicId: unsergrundwissen.id } })
  if (!sommeraufgabenzurwiederholung) {
    sommeraufgabenzurwiederholung = await prisma.lesson.create({
      data: {
        name: 'Sommeraufgaben zur Wiederholung',
        description: '',
        topicId: unsergrundwissen.id,
        order: 0
      }
    })
  }

  let mehrsommeraufgabenzumben = await prisma.lesson.findFirst({ where: { name: 'Mehr Sommeraufgaben zum Üben', topicId: unsergrundwissen.id } })
  if (!mehrsommeraufgabenzumben) {
    mehrsommeraufgabenzumben = await prisma.lesson.create({
      data: {
        name: 'Mehr Sommeraufgaben zum Üben',
        description: '',
        topicId: unsergrundwissen.id,
        order: 0
      }
    })
  }

  let prfungsblock = await prisma.lesson.findFirst({ where: { name: 'PRÜFUNGSBLOCK', topicId: unsergrundwissen.id } })
  if (!prfungsblock) {
    prfungsblock = await prisma.lesson.create({
      data: {
        name: 'PRÜFUNGSBLOCK',
        description: '',
        topicId: unsergrundwissen.id,
        order: 0
      }
    })
  }

  let wetterapps = await prisma.lesson.findFirst({ where: { name: 'Wetterapps', topicId: blickpunktregen.id } })
  if (!wetterapps) {
    wetterapps = await prisma.lesson.create({
      data: {
        name: 'Wetterapps',
        description: '',
        topicId: blickpunktregen.id,
        order: 0
      }
    })
  }

  let bungenzumwetter = await prisma.lesson.findFirst({ where: { name: 'Übungen zum Wetter', topicId: blickpunktregen.id } })
  if (!bungenzumwetter) {
    bungenzumwetter = await prisma.lesson.create({
      data: {
        name: 'Übungen zum Wetter',
        description: '',
        topicId: blickpunktregen.id,
        order: 0
      }
    })
  }

  let berweiteentfernungen = await prisma.lesson.findFirst({ where: { name: 'Über weite Entfernungen', topicId: informationeninverschiedenendastellungsformen.id } })
  if (!berweiteentfernungen) {
    berweiteentfernungen = await prisma.lesson.create({
      data: {
        name: 'Über weite Entfernungen',
        description: '',
        topicId: informationeninverschiedenendastellungsformen.id,
        order: 0
      }
    })
  }

  let kheundsand = await prisma.lesson.findFirst({ where: { name: 'Kühe und Sand', topicId: informationeninverschiedenendastellungsformen.id } })
  if (!kheundsand) {
    kheundsand = await prisma.lesson.create({
      data: {
        name: 'Kühe und Sand',
        description: '',
        topicId: informationeninverschiedenendastellungsformen.id,
        order: 0
      }
    })
  }

  let go = await prisma.lesson.findFirst({ where: { name: 'Go?', topicId: informationeninverschiedenendastellungsformen.id } })
  if (!go) {
    go = await prisma.lesson.create({
      data: {
        name: 'Go?',
        description: '',
        topicId: informationeninverschiedenendastellungsformen.id,
        order: 0
      }
    })
  }

  let checkup = await prisma.lesson.findFirst({ where: { name: 'Checkup', topicId: informationeninverschiedenendastellungsformen.id } })
  if (!checkup) {
    checkup = await prisma.lesson.create({
      data: {
        name: 'Checkup',
        description: '',
        topicId: informationeninverschiedenendastellungsformen.id,
        order: 0
      }
    })
  }

  let blickindievergangenheit = await prisma.lesson.findFirst({ where: { name: 'Blick in die Vergangenheit', topicId: grundlagen.id } })
  if (!blickindievergangenheit) {
    blickindievergangenheit = await prisma.lesson.create({
      data: {
        name: 'Blick in die Vergangenheit',
        description: '',
        topicId: grundlagen.id,
        order: 0
      }
    })
  }

  let modellierung = await prisma.lesson.findFirst({ where: { name: 'Modellierung', topicId: grundlagen.id } })
  if (!modellierung) {
    modellierung = await prisma.lesson.create({
      data: {
        name: 'Modellierung',
        description: '',
        topicId: grundlagen.id,
        order: 2
      }
    })
  }

  let slicing = await prisma.lesson.findFirst({ where: { name: 'Slicing', topicId: grundlagen.id } })
  if (!slicing) {
    slicing = await prisma.lesson.create({
      data: {
        name: 'Slicing',
        description: '',
        topicId: grundlagen.id,
        order: 3
      }
    })
  }

  let technischeraufbau = await prisma.lesson.findFirst({ where: { name: 'Technischer Aufbau', topicId: grundlagen.id } })
  if (!technischeraufbau) {
    technischeraufbau = await prisma.lesson.create({
      data: {
        name: 'Technischer Aufbau',
        description: '',
        topicId: grundlagen.id,
        order: 1
      }
    })
  }

  let miniaufgabensammlung = await prisma.lesson.findFirst({ where: { name: 'Mini-Aufgabensammlung', topicId: dererstedruck.id } })
  if (!miniaufgabensammlung) {
    miniaufgabensammlung = await prisma.lesson.create({
      data: {
        name: 'Mini-Aufgabensammlung',
        description: '',
        topicId: dererstedruck.id,
        order: 0
      }
    })
  }

  // --- LEARNING GROUPS ---
  let klasse7a = await prisma.learningGroup.findFirst({ where: { name: 'Klasse 7a', teacherId: teacher01610.id } })
  if (!klasse7a) {
    klasse7a = await prisma.learningGroup.create({
      data: { 
        name: 'Klasse 7a', 
        teacherId: teacher01610.id 
      },
    })
  }

  let informatikgk12 = await prisma.learningGroup.findFirst({ where: { name: 'Informatik GK 12', teacherId: teacher01610.id } })
  if (!informatikgk12) {
    informatikgk12 = await prisma.learningGroup.create({
      data: { 
        name: 'Informatik GK 12', 
        teacherId: teacher01610.id 
      },
    })
  }

  let klasse10c = await prisma.learningGroup.findFirst({ where: { name: 'Klasse 10c', teacherId: teacher676495.id } })
  if (!klasse10c) {
    klasse10c = await prisma.learningGroup.create({
      data: { 
        name: 'Klasse 10c', 
        teacherId: teacher676495.id 
      },
    })
  }

  // --- STUDENTS ---
  // Schüler in der exakten Reihenfolge der Datenbank
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
    { name: 'Lea Bauer', loginCode: 'STUD013_ORIG', role: 'STUDENT' },
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
    { name: 'Freya Zipper', loginCode: 'STUD031', role: 'STUDENT' },
    { name: 'Martin Bindewald', loginCode: 'STUD032', role: 'STUDENT' },
    { name: 'Laureen Budka', loginCode: 'STUD033', role: 'STUDENT' },
    { name: 'Benjamin Clos', loginCode: 'STUD034', role: 'STUDENT' },
    { name: 'Justus Damm', loginCode: 'STUD035', role: 'STUDENT' },
    { name: 'Stipe Drmic', loginCode: 'STUD036', role: 'STUDENT' },
    { name: 'Aaron Herrenkind', loginCode: 'STUD037', role: 'STUDENT' },
    { name: 'Nikita Kling', loginCode: 'STUD038', role: 'STUDENT' },
    { name: 'Alex Koch', loginCode: 'STUD039', role: 'STUDENT' },
    { name: 'Erich König', loginCode: 'STUD040', role: 'STUDENT' },
    { name: 'Tom Kup', loginCode: 'STUD041', role: 'STUDENT' },
    { name: 'Helge Nebendahl', loginCode: 'STUD042', role: 'STUDENT' },
    { name: 'Janic Schaaf', loginCode: 'STUD043', role: 'STUDENT' },
    { name: 'Sophie Schaaf', loginCode: 'STUD044', role: 'STUDENT' },
    { name: 'Louis Scheerer', loginCode: 'STUD045', role: 'STUDENT' },
    { name: 'Jana Schiffer', loginCode: 'STUD046', role: 'STUDENT' },
    { name: 'Wiebke Schmidt', loginCode: 'STUD047', role: 'STUDENT' },
    { name: 'Julius Schöning', loginCode: 'STUD048', role: 'STUDENT' },
    { name: 'Duy Anh Trân', loginCode: 'STUD049', role: 'STUDENT' },
    { name: 'Paul Ulrich', loginCode: 'STUD050', role: 'STUDENT' },
    { name: 'Jasper Wagner', loginCode: 'STUD051', role: 'STUDENT' },
    { name: 'Julian Weitz', loginCode: 'STUD052', role: 'STUDENT' },
    { name: 'Lukas Wetzlar', loginCode: 'STUD053', role: 'STUDENT' },
    { name: 'Jakob Weyerhäuser', loginCode: 'STUD054', role: 'STUDENT' },
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
  // Klasse 7a: Jakob Ackermann, Josefine Baierl, Friederike Bremser, Jonathan Dillmann, Jasmin Farnung, Marlene Geis, Louis Gerharz, Luise Habach, Hannah Hagedorn, Kilian Jahnke, Marlene Krall, Robin Maas, Jonas Maxeiner, Samuel May, Dennis Miller, Miró Mohr, Adela Mureşan, Paul Pfeifer, Louisa Plattes, Arthur Potemkin, Julia Reiners, Bruno Scavio, Vincent Schlag, Felix Schmelzlin, Niklas Schmitz, Andreas Thielen, Fabio Urso, Lennas Weinem, Nils Weiß, Jan Wimmershoff, Freya Zipper
  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD001').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD002').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD003').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD004').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD005').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD006').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD007').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD008').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD009').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD010').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD011').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD012').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD013').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD014').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD015').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD016').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD017').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD018').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD019').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD020').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD021').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD022').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD023').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD024').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD025').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD026').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD027').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD028').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD029').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD030').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: klasse7a.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD031').id }
      }
    }
  });

  // Informatik GK 12: Martin Bindewald, Laureen Budka, Benjamin Clos, Justus Damm, Stipe Drmic, Aaron Herrenkind, Nikita Kling, Alex Koch, Erich König, Tom Kup, Helge Nebendahl, Janic Schaaf, Sophie Schaaf, Louis Scheerer, Jana Schiffer, Wiebke Schmidt, Julius Schöning, Duy Anh Trân, Paul Ulrich, Jasper Wagner, Julian Weitz, Lukas Wetzlar, Jakob Weyerhäuser
  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD032').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD033').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD034').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD035').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD036').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD037').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD038').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD039').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD040').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD041').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD042').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD043').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD044').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD045').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD046').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD047').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD048').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD049').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD050').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD051').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD052').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD053').id }
      }
    }
  });

  await prisma.learningGroup.update({
    where: { id: informatikgk12.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD054').id }
      }
    }
  });

  // Klasse 10c: Lea Bauer
  await prisma.learningGroup.update({
    where: { id: klasse10c.id },
    data: {
      students: {
        connect: { id: createdStudents.find(s => s.loginCode === 'STUD013_ORIG').id }
      }
    }
  });

  // --- ASSIGNMENTS ---
  // Assignments für Informatik GK 12
  let subjectAssignmentd6de3912 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'subject',
      refId: '63d3a6d0-a7d1-496b-beb4-ea222a0831ed'
    }
  });
  if (!subjectAssignmentd6de3912) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'subject',
        refId: '63d3a6d0-a7d1-496b-beb4-ea222a0831ed'
      }
    });
  }

  let blockAssignmentcd0ea0c3 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'block',
      refId: 'cc755c84-0be3-4ece-99c8-9a3bf2ce219e'
    }
  });
  if (!blockAssignmentcd0ea0c3) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'block',
        refId: 'cc755c84-0be3-4ece-99c8-9a3bf2ce219e'
      }
    });
  }

  let blockAssignmentc92964a9 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'block',
      refId: '225dc96d-8ff1-4539-9461-bc0242dda06a'
    }
  });
  if (!blockAssignmentc92964a9) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'block',
        refId: '225dc96d-8ff1-4539-9461-bc0242dda06a'
      }
    });
  }

  let unitAssignment7af11a30 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'unit',
      refId: '5998d206-044c-4ab1-bd74-59b54ca64f16'
    }
  });
  if (!unitAssignment7af11a30) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'unit',
        refId: '5998d206-044c-4ab1-bd74-59b54ca64f16'
      }
    });
  }

  let topicAssignmentb9317ebc = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'topic',
      refId: '19ccb2bf-e4f1-441c-81cd-df776b6d994d'
    }
  });
  if (!topicAssignmentb9317ebc) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'topic',
        refId: '19ccb2bf-e4f1-441c-81cd-df776b6d994d'
      }
    });
  }

  let lessonAssignment0c3acc55 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'lesson',
      refId: '4ec32f6f-d184-4251-943f-731414dcc9da'
    }
  });
  if (!lessonAssignment0c3acc55) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'lesson',
        refId: '4ec32f6f-d184-4251-943f-731414dcc9da'
      }
    });
  }

  let lessonAssignment9de10af1 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'lesson',
      refId: 'ca179b61-0c10-433f-8493-6024a9d5e87b'
    }
  });
  if (!lessonAssignment9de10af1) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'lesson',
        refId: 'ca179b61-0c10-433f-8493-6024a9d5e87b'
      }
    });
  }

  let lessonAssignment2b6b5586 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'lesson',
      refId: '537f5fa6-c8b7-4024-a6d4-e1c3de55f673'
    }
  });
  if (!lessonAssignment2b6b5586) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'lesson',
        refId: '537f5fa6-c8b7-4024-a6d4-e1c3de55f673'
      }
    });
  }

  let unitAssignmentbd54f72f = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'unit',
      refId: '6ec37a12-e944-4019-b95d-692a3d9d08f1'
    }
  });
  if (!unitAssignmentbd54f72f) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'unit',
        refId: '6ec37a12-e944-4019-b95d-692a3d9d08f1'
      }
    });
  }

  let topicAssignment60923667 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'topic',
      refId: 'fc59e18a-c014-49e5-99ca-f2684c4478db'
    }
  });
  if (!topicAssignment60923667) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'topic',
        refId: 'fc59e18a-c014-49e5-99ca-f2684c4478db'
      }
    });
  }

  let lessonAssignmentbba2c56b = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'lesson',
      refId: '8a659fa7-4de0-4db7-8163-28ece619d862'
    }
  });
  if (!lessonAssignmentbba2c56b) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'lesson',
        refId: '8a659fa7-4de0-4db7-8163-28ece619d862'
      }
    });
  }

  let lessonAssignment9da80a95 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'lesson',
      refId: '6f342d97-18c3-438a-90ce-3b36501393a2'
    }
  });
  if (!lessonAssignment9da80a95) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'lesson',
        refId: '6f342d97-18c3-438a-90ce-3b36501393a2'
      }
    });
  }

  let lessonAssignment7f937d4d = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'lesson',
      refId: 'a9a3caed-7d30-4862-a3b7-f9e3cf888ebe'
    }
  });
  if (!lessonAssignment7f937d4d) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'lesson',
        refId: 'a9a3caed-7d30-4862-a3b7-f9e3cf888ebe'
      }
    });
  }

  let topicAssignmentfe538ae2 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'topic',
      refId: 'fa9fecd0-174c-47f1-85d8-9d2e57fe7417'
    }
  });
  if (!topicAssignmentfe538ae2) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'topic',
        refId: 'fa9fecd0-174c-47f1-85d8-9d2e57fe7417'
      }
    });
  }

  let lessonAssignment372e02c2 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'lesson',
      refId: 'a31f47a8-f822-4dcd-a983-27eb7de46987'
    }
  });
  if (!lessonAssignment372e02c2) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'lesson',
        refId: 'a31f47a8-f822-4dcd-a983-27eb7de46987'
      }
    });
  }

  let lessonAssignmente85d392e = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'lesson',
      refId: '26c474da-1bda-45e7-88a7-b78490b163c5'
    }
  });
  if (!lessonAssignmente85d392e) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'lesson',
        refId: '26c474da-1bda-45e7-88a7-b78490b163c5'
      }
    });
  }

  let lessonAssignmentf2e6346c = await prisma.groupAssignment.findFirst({
    where: {
      groupId: informatikgk12.id,
      type: 'lesson',
      refId: '160d3b2e-98ae-46e8-ad0e-1140b3e8701d'
    }
  });
  if (!lessonAssignmentf2e6346c) {
    await prisma.groupAssignment.create({
      data: {
        groupId: informatikgk12.id,
        type: 'lesson',
        refId: '160d3b2e-98ae-46e8-ad0e-1140b3e8701d'
      }
    });
  }

  // Assignments für Klasse 7a
  let blockAssignment093fbc5a = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'block',
      refId: '7e6883c6-1ded-489d-9c34-3e5e5c0ef20d'
    }
  });
  if (!blockAssignment093fbc5a) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'block',
        refId: '7e6883c6-1ded-489d-9c34-3e5e5c0ef20d'
      }
    });
  }

  let unitAssignment106d2ec7 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'unit',
      refId: 'af62b3a9-48fa-4874-8fcb-5aeed31ed154'
    }
  });
  if (!unitAssignment106d2ec7) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'unit',
        refId: 'af62b3a9-48fa-4874-8fcb-5aeed31ed154'
      }
    });
  }

  let topicAssignment900ae02a = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'topic',
      refId: '35c8a998-8bd6-4885-8d61-f9856e0caf8f'
    }
  });
  if (!topicAssignment900ae02a) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'topic',
        refId: '35c8a998-8bd6-4885-8d61-f9856e0caf8f'
      }
    });
  }

  let lessonAssignment1b3b8cf0 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'lesson',
      refId: 'db705e42-21bb-47ce-b031-6c02886e410f'
    }
  });
  if (!lessonAssignment1b3b8cf0) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'lesson',
        refId: 'db705e42-21bb-47ce-b031-6c02886e410f'
      }
    });
  }

  let lessonAssignmentf2727f4b = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'lesson',
      refId: 'f21a8e7e-233f-4461-8baf-0fa13529b64a'
    }
  });
  if (!lessonAssignmentf2727f4b) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'lesson',
        refId: 'f21a8e7e-233f-4461-8baf-0fa13529b64a'
      }
    });
  }

  let unitAssignmentd84d56f6 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'unit',
      refId: '3883ccf7-35ec-4abe-9009-75168ace4b8e'
    }
  });
  if (!unitAssignmentd84d56f6) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'unit',
        refId: '3883ccf7-35ec-4abe-9009-75168ace4b8e'
      }
    });
  }

  let topicAssignment0c39a661 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'topic',
      refId: 'ca7f602b-b735-446b-adca-da725cbd03ba'
    }
  });
  if (!topicAssignment0c39a661) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'topic',
        refId: 'ca7f602b-b735-446b-adca-da725cbd03ba'
      }
    });
  }

  let topicAssignmentdf2e42ba = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'topic',
      refId: '216c4085-36e6-41b7-9665-ad3c81af1b8c'
    }
  });
  if (!topicAssignmentdf2e42ba) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'topic',
        refId: '216c4085-36e6-41b7-9665-ad3c81af1b8c'
      }
    });
  }

  let topicAssignmentd05754d7 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'topic',
      refId: '15e87553-ffe1-4d45-9a71-1e078677f168'
    }
  });
  if (!topicAssignmentd05754d7) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'topic',
        refId: '15e87553-ffe1-4d45-9a71-1e078677f168'
      }
    });
  }

  let topicAssignment6323363f = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'topic',
      refId: '19be3a1a-6b75-4a16-bf98-305d029e04a7'
    }
  });
  if (!topicAssignment6323363f) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'topic',
        refId: '19be3a1a-6b75-4a16-bf98-305d029e04a7'
      }
    });
  }

  let topicAssignment90f40613 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'topic',
      refId: '867fa1e6-1baf-4132-83e2-a3c0b90251cf'
    }
  });
  if (!topicAssignment90f40613) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'topic',
        refId: '867fa1e6-1baf-4132-83e2-a3c0b90251cf'
      }
    });
  }

  let topicAssignment3b317779 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'topic',
      refId: '7ae8592c-5973-44d7-a51d-efe524237546'
    }
  });
  if (!topicAssignment3b317779) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'topic',
        refId: '7ae8592c-5973-44d7-a51d-efe524237546'
      }
    });
  }

  let lessonAssignment6a4caa58 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'lesson',
      refId: '947cbfc3-fd8f-4c8e-82af-0dadc4e60508'
    }
  });
  if (!lessonAssignment6a4caa58) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'lesson',
        refId: '947cbfc3-fd8f-4c8e-82af-0dadc4e60508'
      }
    });
  }

  let lessonAssignment7256b40f = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'lesson',
      refId: '681845d0-8811-45ad-8b0f-8f2f9386e06f'
    }
  });
  if (!lessonAssignment7256b40f) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'lesson',
        refId: '681845d0-8811-45ad-8b0f-8f2f9386e06f'
      }
    });
  }

  let lessonAssignment2ee25183 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'lesson',
      refId: '636fbfb7-ce64-4e88-93fb-3f61cea426d7'
    }
  });
  if (!lessonAssignment2ee25183) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'lesson',
        refId: '636fbfb7-ce64-4e88-93fb-3f61cea426d7'
      }
    });
  }

  let subjectAssignmentb61daee0 = await prisma.groupAssignment.findFirst({
    where: {
      groupId: klasse7a.id,
      type: 'subject',
      refId: '59693f42-a733-442c-b745-5a1148da8d7c'
    }
  });
  if (!subjectAssignmentb61daee0) {
    await prisma.groupAssignment.create({
      data: {
        groupId: klasse7a.id,
        type: 'subject',
        refId: '59693f42-a733-442c-b745-5a1148da8d7c'
      }
    });
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
