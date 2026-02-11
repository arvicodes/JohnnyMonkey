import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GROUP_NAME = 'Mathe 10c';

// Aus den Screenshots: Vorname Nachname, LoginCode
const STUDENTS: Array<{ name: string; loginCode: string }> = [
  { name: 'Sophie Schaaf', loginCode: 'SchSop10' },
  { name: 'Julia Zimmermann', loginCode: 'ZimJul09' },
  { name: 'Romeh Wollweber', loginCode: 'WolRom10' },
  { name: 'Aaron Schroeder', loginCode: 'SchAar09' },
  { name: 'Sarina Schulz', loginCode: 'SchSar10' },
  { name: 'Anna-Sophia Spadi', loginCode: 'SpaAnn10' },
  { name: 'Noah Theis', loginCode: 'TheNoa09' },
  { name: 'Paul Volk', loginCode: 'VolPau09' },
  { name: 'Finley Wandtke', loginCode: 'WanFin09' },
  { name: 'Philipp Weinand', loginCode: 'WeiPhi10' },
  { name: 'Merle Weinem', loginCode: 'WeiMer10' },
  { name: 'Nika Monschauer', loginCode: 'MonNik10' },
  { name: 'Melanie Mosgold', loginCode: 'MosMel10' },
  { name: 'Claudia Oellermann', loginCode: 'OelCla09' },
  { name: 'Moritz Paulik', loginCode: 'PauMor10' },
  { name: 'Tim Brockmann', loginCode: 'BroTim09' },
  { name: 'Charlotte Doll', loginCode: 'DolCha09' },
  { name: 'Marie Fedrowitz', loginCode: 'FedMar10' },
  { name: 'David Preygermann', loginCode: 'PreDav09' },
  { name: 'Felix Reinhardt', loginCode: 'ReiFel09' },
  { name: 'Benedikt Roth', loginCode: 'RotBen10' },
  { name: 'Hanna Ruess Mejias', loginCode: 'RueHan10' },
  { name: 'Adriana Gruenewald', loginCode: 'GruAdr09' },
  { name: 'Amelie Heimes', loginCode: 'HeiAme09' },
  { name: 'Ole Hofmann', loginCode: 'HofOle10' },
  { name: 'Paul Jung', loginCode: 'JunPau10' },
  { name: 'Magdalena Kaschny', loginCode: 'KasMag10' },
  { name: 'Jonah May', loginCode: 'MayJon10' },
  { name: 'Mateo Abas', loginCode: 'AbaMat10' },
  { name: 'Anne Berres', loginCode: 'BerAnn10' },
  { name: 'Karoline Bremser', loginCode: 'BreKar09' },
];

async function createMathe10cStudents() {
  console.log(`🔄 Schüler für Lerngruppe "${GROUP_NAME}" anlegen...\n`);

  const learningGroup = await prisma.learningGroup.findFirst({
    where: { name: GROUP_NAME },
  });

  if (!learningGroup) {
    console.error(`❌ Lerngruppe "${GROUP_NAME}" nicht gefunden. Bitte zuerst anlegen.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`✅ Lerngruppe gefunden: ${GROUP_NAME} (ID: ${learningGroup.id})\n`);

  const studentIds: string[] = [];

  for (const { name, loginCode } of STUDENTS) {
    let student = await prisma.user.findUnique({
      where: { loginCode },
      include: { learningGroups: { where: { id: learningGroup.id }, select: { id: true } } },
    });

    if (!student) {
      student = await prisma.user.create({
        data: {
          name,
          loginCode,
          role: 'STUDENT',
        },
        include: { learningGroups: { where: { id: learningGroup.id }, select: { id: true } } },
      });
      console.log(`  Neu: ${name.padEnd(30)} | ${loginCode}`);
    } else {
      console.log(`  Vorhanden: ${name.padEnd(30)} | ${loginCode}`);
    }

    studentIds.push(student.id);
  }

  // Alle Schüler der Lerngruppe zuordnen (falls noch nicht drin)
  const alreadyInGroup = await prisma.user.findMany({
    where: {
      id: { in: studentIds },
      learningGroups: { some: { id: learningGroup.id } },
    },
    select: { id: true },
  });
  const alreadyIds = new Set(alreadyInGroup.map((u) => u.id));
  const toConnect = studentIds.filter((id) => !alreadyIds.has(id));

  if (toConnect.length > 0) {
    await prisma.learningGroup.update({
      where: { id: learningGroup.id },
      data: {
        students: { connect: toConnect.map((id) => ({ id })) },
      },
    });
    console.log(`\n🔗 ${toConnect.length} Schüler der Lerngruppe zugeordnet.`);
  }

  console.log(`\n✅ Fertig: ${STUDENTS.length} Schüler für "${GROUP_NAME}".`);
}

createMathe10cStudents()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
