import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // --- TEACHERS ---
  let teacher1 = await prisma.user.findUnique({ where: { loginCode: '1' } })
  if (!teacher1) {
    teacher1 = await prisma.user.create({
      data: { name: 'Frau Christ', loginCode: '1', role: 'TEACHER' },
    })
    console.log('Created teacher: Frau Christ')
  }

  let teacher002 = await prisma.user.findUnique({ where: { loginCode: 'TEACH002' } })
  if (!teacher002) {
    teacher002 = await prisma.user.create({
      data: { name: 'Herr Kowalski', loginCode: 'TEACH002', role: 'TEACHER' },
    })
    console.log('Created teacher: Herr Kowalski')
  }

  // --- STUDENTS ---
  const students = [
    { name: 'Josefine Baierl', loginCode: 'STUD002' },
    { name: 'Friederike Bremser', loginCode: 'STUD003' },
    { name: 'Jonathan Dillmann', loginCode: 'STUD004' },
    { name: 'Jasmin Farnung', loginCode: 'STUD005' },
    { name: 'Marlene Geis', loginCode: 'STUD006' },
    { name: 'Louis Gerharz', loginCode: 'STUD007' },
    { name: 'Luise Habach', loginCode: 'STUD008' },
    { name: 'Hannah Hagedorn', loginCode: 'STUD009' },
    { name: 'Kilian Jahnke', loginCode: 'STUD010' },
    { name: 'Marlene Krall', loginCode: 'STUD011' },
    { name: 'Lena Krämer', loginCode: 'STUD012' },
    { name: 'Lukas Krämer', loginCode: 'STUD013' },
    { name: 'Lea Krämer', loginCode: 'STUD014' },
    { name: 'Max Krämer', loginCode: 'STUD015' },
    { name: 'Emma Krämer', loginCode: 'STUD016' },
    { name: 'Noah Krämer', loginCode: 'STUD017' },
    { name: 'Sophia Krämer', loginCode: 'STUD018' },
    { name: 'Liam Krämer', loginCode: 'STUD019' },
    { name: 'Olivia Krämer', loginCode: 'STUD020' },
    { name: 'Ethan Krämer', loginCode: 'STUD021' },
    { name: 'Ava Krämer', loginCode: 'STUD022' },
    { name: 'Mason Krämer', loginCode: 'STUD023' },
    { name: 'Isabella Krämer', loginCode: 'STUD024' },
    { name: 'William Krämer', loginCode: 'STUD025' },
    { name: 'Mia Krämer', loginCode: 'STUD026' },
    { name: 'James Krämer', loginCode: 'STUD027' },
    { name: 'Charlotte Krämer', loginCode: 'STUD028' },
    { name: 'Benjamin Krämer', loginCode: 'STUD029' },
    { name: 'Amelia Krämer', loginCode: 'STUD030' },
    { name: 'Lucas Krämer', loginCode: 'STUD031' },
    { name: 'Harper Krämer', loginCode: 'STUD032' },
    { name: 'Henry Krämer', loginCode: 'STUD033' },
    { name: 'Evelyn Krämer', loginCode: 'STUD034' },
    { name: 'Alexander Krämer', loginCode: 'STUD035' },
    { name: 'Abigail Krämer', loginCode: 'STUD036' },
    { name: 'Michael Krämer', loginCode: 'STUD037' },
    { name: 'Emily Krämer', loginCode: 'STUD038' },
    { name: 'Daniel Krämer', loginCode: 'STUD039' },
    { name: 'Elizabeth Krämer', loginCode: 'STUD040' },
    { name: 'Joseph Krämer', loginCode: 'STUD041' },
    { name: 'Sofia Krämer', loginCode: 'STUD042' },
    { name: 'Christopher Krämer', loginCode: 'STUD043' },
    { name: 'Avery Krämer', loginCode: 'STUD044' },
    { name: 'Andrew Krämer', loginCode: 'STUD045' },
    { name: 'Ella Krämer', loginCode: 'STUD046' },
    { name: 'Joshua Krämer', loginCode: 'STUD047' },
    { name: 'Madison Krämer', loginCode: 'STUD048' },
    { name: 'David Krämer', loginCode: 'STUD049' },
    { name: 'Scarlett Krämer', loginCode: 'STUD050' },
    { name: 'Matthew Krämer', loginCode: 'STUD051' },
    { name: 'Victoria Krämer', loginCode: 'STUD052' },
    { name: 'Ryan Krämer', loginCode: 'STUD053' },
    { name: 'Luna Krämer', loginCode: 'STUD054' },
    { name: 'Nathan Krämer', loginCode: 'STUD055' },
    { name: 'Grace Krämer', loginCode: 'STUD056' },
    { name: 'Samuel Krämer', loginCode: 'STUD057' }
  ]

  for (const studentData of students) {
    const existingStudent = await prisma.user.findUnique({ 
      where: { loginCode: studentData.loginCode } 
    })
    if (!existingStudent) {
      await prisma.user.create({
        data: { 
          name: studentData.name, 
          loginCode: studentData.loginCode, 
          role: 'STUDENT' 
        },
      })
      console.log(`Created student: ${studentData.name}`)
    }
  }

  // --- SUBJECTS ---
  let mathematik = await prisma.subject.findFirst({ 
    where: { name: 'Mathematik', teacherId: teacher1.id } 
  })
  if (!mathematik) {
    mathematik = await prisma.subject.create({
      data: {
        name: 'Mathematik',
        description: 'Mathematik für Klasse 6a',
        teacherId: teacher1.id,
        order: 0
      }
    })
    console.log('Created subject: Mathematik')
  }

  let informatik = await prisma.subject.findFirst({ 
    where: { name: 'Informatik', teacherId: teacher1.id } 
  })
  if (!informatik) {
    informatik = await prisma.subject.create({
      data: {
        name: 'Informatik',
        description: 'Informatik für GK11',
        teacherId: teacher1.id,
        order: 1
      }
    })
    console.log('Created subject: Informatik')
  }

  // --- BLOCKS ---
  let klasse7 = await prisma.block.findFirst({ 
    where: { name: 'Klasse 7', subjectId: mathematik.id } 
  })
  if (!klasse7) {
    klasse7 = await prisma.block.create({
      data: {
        name: 'Klasse 7',
        description: '',
        subjectId: mathematik.id,
        order: 0
      }
    })
    console.log('Created block: Klasse 7')
  }

  let mssgrundthemen = await prisma.block.findFirst({ 
    where: { name: 'MSS: Grundthemen', subjectId: informatik.id } 
  })
  if (!mssgrundthemen) {
    mssgrundthemen = await prisma.block.create({
      data: {
        name: 'MSS: Grundthemen',
        description: '',
        subjectId: informatik.id,
        order: 0
      }
    })
    console.log('Created block: MSS: Grundthemen')
  }

  let msswahlundprojektthemen = await prisma.block.findFirst({ 
    where: { name: 'MSS: Wahl- und Projektthemen', subjectId: informatik.id } 
  })
  if (!msswahlundprojektthemen) {
    msswahlundprojektthemen = await prisma.block.create({
      data: {
        name: 'MSS: Wahl- und Projektthemen',
        description: '',
        subjectId: informatik.id,
        order: 1
      }
    })
    console.log('Created block: MSS: Wahl- und Projektthemen')
  }

  // --- UNITS ---
  let ganzeundrationalezahlenkapitel5 = await prisma.unit.findFirst({ 
    where: { name: 'Ganze und rationale Zahlen (Kapitel 5)', blockId: klasse7.id } 
  })
  if (!ganzeundrationalezahlenkapitel5) {
    ganzeundrationalezahlenkapitel5 = await prisma.unit.create({
      data: {
        name: 'Ganze und rationale Zahlen (Kapitel 5)',
        description: '',
        blockId: klasse7.id,
        order: 0
      }
    })
    console.log('Created unit: Ganze und rationale Zahlen (Kapitel 5)')
  }

  let datenbanken = await prisma.unit.findFirst({ 
    where: { name: 'Datenbanken', blockId: mssgrundthemen.id } 
  })
  if (!datenbanken) {
    datenbanken = await prisma.unit.create({
      data: {
        name: 'Datenbanken',
        description: '',
        blockId: mssgrundthemen.id,
        order: 0
      }
    })
    console.log('Created unit: Datenbanken')
  }

  let algorithmenunddatenstrukturen = await prisma.unit.findFirst({ 
    where: { name: 'Algorithmen und Datenstrukturen', blockId: mssgrundthemen.id } 
  })
  if (!algorithmenunddatenstrukturen) {
    algorithmenunddatenstrukturen = await prisma.unit.create({
      data: {
        name: 'Algorithmen und Datenstrukturen',
        description: '',
        blockId: mssgrundthemen.id,
        order: 1
      }
    })
    console.log('Created unit: Algorithmen und Datenstrukturen')
  }

  let objektorientierteprogrammierung = await prisma.unit.findFirst({ 
    where: { name: 'Objektorientierte Programmierung', blockId: mssgrundthemen.id } 
  })
  if (!objektorientierteprogrammierung) {
    objektorientierteprogrammierung = await prisma.unit.create({
      data: {
        name: 'Objektorientierte Programmierung',
        description: '',
        blockId: mssgrundthemen.id,
        order: 2
      }
    })
    console.log('Created unit: Objektorientierte Programmierung')
  }

  let webentwicklung = await prisma.unit.findFirst({ 
    where: { name: 'Webentwicklung', blockId: msswahlundprojektthemen.id } 
  })
  if (!webentwicklung) {
    webentwicklung = await prisma.unit.create({
      data: {
        name: 'Webentwicklung',
        description: '',
        blockId: msswahlundprojektthemen.id,
        order: 0
      }
    })
    console.log('Created unit: Webentwicklung')
  }

  // --- TOPICS ---
  let positiveundnegativezahlen = await prisma.topic.findFirst({ 
    where: { name: 'Positive und negative Zahlen', unitId: ganzeundrationalezahlenkapitel5.id } 
  })
  if (!positiveundnegativezahlen) {
    positiveundnegativezahlen = await prisma.topic.create({
      data: {
        name: 'Positive und negative Zahlen',
        description: '',
        unitId: ganzeundrationalezahlenkapitel5.id,
        order: 0
      }
    })
    console.log('Created topic: Positive und negative Zahlen')
  }

  let sqlgrundlagen = await prisma.topic.findFirst({ 
    where: { name: 'SQL Grundlagen', unitId: datenbanken.id } 
  })
  if (!sqlgrundlagen) {
    sqlgrundlagen = await prisma.topic.create({
      data: {
        name: 'SQL Grundlagen',
        description: '',
        unitId: datenbanken.id,
        order: 0
      }
    })
    console.log('Created topic: SQL Grundlagen')
  }

  let datenbankdesign = await prisma.topic.findFirst({ 
    where: { name: 'Datenbankdesign', unitId: datenbanken.id } 
  })
  if (!datenbankdesign) {
    datenbankdesign = await prisma.topic.create({
      data: {
        name: 'Datenbankdesign',
        description: '',
        unitId: datenbanken.id,
        order: 1
      }
    })
    console.log('Created topic: Datenbankdesign')
  }

  let sortieralgorithmen = await prisma.topic.findFirst({ 
    where: { name: 'Sortieralgorithmen', unitId: algorithmenunddatenstrukturen.id } 
  })
  if (!sortieralgorithmen) {
    sortieralgorithmen = await prisma.topic.create({
      data: {
        name: 'Sortieralgorithmen',
        description: '',
        unitId: algorithmenunddatenstrukturen.id,
        order: 0
      }
    })
    console.log('Created topic: Sortieralgorithmen')
  }

  let klassenundobjekte = await prisma.topic.findFirst({ 
    where: { name: 'Klassen und Objekte', unitId: objektorientierteprogrammierung.id } 
  })
  if (!klassenundobjekte) {
    klassenundobjekte = await prisma.topic.create({
      data: {
        name: 'Klassen und Objekte',
        description: '',
        unitId: objektorientierteprogrammierung.id,
        order: 0
      }
    })
    console.log('Created topic: Klassen und Objekte')
  }

  let htmlundcss = await prisma.topic.findFirst({ 
    where: { name: 'HTML und CSS', unitId: webentwicklung.id } 
  })
  if (!htmlundcss) {
    htmlundcss = await prisma.topic.create({
      data: {
        name: 'HTML und CSS',
        description: '',
        unitId: webentwicklung.id,
        order: 0
      }
    })
    console.log('Created topic: HTML und CSS')
  }

  // --- LESSONS ---
  let einfuhrungpositiveundnegativezahlen = await prisma.lesson.findFirst({ 
    where: { name: 'Einführung: Positive und negative Zahlen', topicId: positiveundnegativezahlen.id } 
  })
  if (!einfuhrungpositiveundnegativezahlen) {
    einfuhrungpositiveundnegativezahlen = await prisma.lesson.create({
      data: {
        name: 'Einführung: Positive und negative Zahlen',
        description: '',
        topicId: positiveundnegativezahlen.id,
        order: 0
      }
    })
    console.log('Created lesson: Einführung: Positive und negative Zahlen')
  }

  let sqlselect = await prisma.lesson.findFirst({ 
    where: { name: 'SQL SELECT', topicId: sqlgrundlagen.id } 
  })
  if (!sqlselect) {
    sqlselect = await prisma.lesson.create({
      data: {
        name: 'SQL SELECT',
        description: '',
        topicId: sqlgrundlagen.id,
        order: 0
      }
    })
    console.log('Created lesson: SQL SELECT')
  }

  let sqlinsertupdate = await prisma.lesson.findFirst({ 
    where: { name: 'SQL INSERT/UPDATE', topicId: sqlgrundlagen.id } 
  })
  if (!sqlinsertupdate) {
    sqlinsertupdate = await prisma.lesson.create({
      data: {
        name: 'SQL INSERT/UPDATE',
        description: '',
        topicId: sqlgrundlagen.id,
        order: 1
      }
    })
    console.log('Created lesson: SQL INSERT/UPDATE')
  }

  let erdiagramme = await prisma.lesson.findFirst({ 
    where: { name: 'ER-Diagramme', topicId: datenbankdesign.id } 
  })
  if (!erdiagramme) {
    erdiagramme = await prisma.lesson.create({
      data: {
        name: 'ER-Diagramme',
        description: '',
        topicId: datenbankdesign.id,
        order: 0
      }
    })
    console.log('Created lesson: ER-Diagramme')
  }

  let bubblesort = await prisma.lesson.findFirst({ 
    where: { name: 'Bubble Sort', topicId: sortieralgorithmen.id } 
  })
  if (!bubblesort) {
    bubblesort = await prisma.lesson.create({
      data: {
        name: 'Bubble Sort',
        description: '',
        topicId: sortieralgorithmen.id,
        order: 0
      }
    })
    console.log('Created lesson: Bubble Sort')
  }

  let quicksort = await prisma.lesson.findFirst({ 
    where: { name: 'Quick Sort', topicId: sortieralgorithmen.id } 
  })
  if (!quicksort) {
    quicksort = await prisma.lesson.create({
      data: {
        name: 'Quick Sort',
        description: '',
        topicId: sortieralgorithmen.id,
        order: 1
      }
    })
    console.log('Created lesson: Quick Sort')
  }

  let klassenkonzept = await prisma.lesson.findFirst({ 
    where: { name: 'Klassenkonzept', topicId: klassenundobjekte.id } 
  })
  if (!klassenkonzept) {
    klassenkonzept = await prisma.lesson.create({
      data: {
        name: 'Klassenkonzept',
        description: '',
        topicId: klassenundobjekte.id,
        order: 0
      }
    })
    console.log('Created lesson: Klassenkonzept')
  }

  let htmlgrundlagen = await prisma.lesson.findFirst({ 
    where: { name: 'HTML Grundlagen', topicId: htmlundcss.id } 
  })
  if (!htmlgrundlagen) {
    htmlgrundlagen = await prisma.lesson.create({
      data: {
        name: 'HTML Grundlagen',
        description: '',
        topicId: htmlundcss.id,
        order: 0
      }
    })
    console.log('Created lesson: HTML Grundlagen')
  }

  let cssstyling = await prisma.lesson.findFirst({ 
    where: { name: 'CSS Styling', topicId: htmlundcss.id } 
  })
  if (!cssstyling) {
    cssstyling = await prisma.lesson.create({
      data: { 
        name: 'CSS Styling',
        description: '',
        topicId: htmlundcss.id,
        order: 1
      }
    })
    console.log('Created lesson: CSS Styling')
  }

  // --- LEARNING GROUPS ---
  let klasse6a = await prisma.learningGroup.findFirst({ 
    where: { name: 'Klasse 6a', teacherId: teacher1.id } 
  })
  if (!klasse6a) {
    klasse6a = await prisma.learningGroup.create({
      data: {
        name: 'Klasse 6a',
        teacherId: teacher1.id
      }
    })
    console.log('Created learning group: Klasse 6a')
  }

  let gk11 = await prisma.learningGroup.findFirst({ 
    where: { name: 'GK11', teacherId: teacher1.id } 
  })
  if (!gk11) {
    gk11 = await prisma.learningGroup.create({
      data: {
        name: 'GK11',
        teacherId: teacher1.id
      }
    })
    console.log('Created learning group: GK11')
  }

  // --- GRADING SCHEMAS ---
  let mathematikSchema = await prisma.gradingSchema.findFirst({ 
    where: { name: 'Mathematik Bewertung 2024', groupId: klasse6a.id } 
  })
  if (!mathematikSchema) {
    mathematikSchema = await prisma.gradingSchema.create({
      data: {
        name: 'Mathematik Bewertung 2024',
        structure: `Mathematik Bewertung 2024 (100%)
  Mündliche Leistungen (50%)
    EPO1 (25%)
    EPO2 (25%)
  Schriftliche Leistungen (50%)
    Klassenarbeit 1 (25%)
    Klassenarbeit 2 (25%)`,
        groupId: klasse6a.id
      }
    })
    console.log('Created grading schema: Mathematik Bewertung 2024')
  }

  let informatikSchema = await prisma.gradingSchema.findFirst({ 
    where: { name: 'Informatik Bewertung GK11', groupId: gk11.id } 
  })
  if (!informatikSchema) {
    informatikSchema = await prisma.gradingSchema.create({
      data: {
        name: 'Informatik Bewertung GK11',
        structure: `Informatik Bewertung GK11 (100%)
  Theorie (40%)
    Tests (20%)
    Hausaufgaben (20%)
  Praxis (60%)
    Projekte (30%)
    Präsentationen (30%)`,
        groupId: gk11.id
      }
    })
    console.log('Created grading schema: Informatik Bewertung GK11')
  }

  console.log('Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
