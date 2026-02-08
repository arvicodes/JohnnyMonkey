/**
 * Setzt den Login-Code von Vera Christ (Lehrerin) auf Pan8.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      role: 'TEACHER',
      OR: [
        { name: { contains: 'Christ' } },
        { name: { contains: 'Vera' } }
      ]
    }
  });
  if (!user) {
    const teachers = await prisma.user.findMany({ where: { role: 'TEACHER' }, select: { name: true, loginCode: true } });
    console.log('Kein Lehrer mit Name "Christ" oder "Vera" gefunden. Vorhandene Lehrer:', teachers);
    process.exit(1);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { loginCode: 'Pan8' }
  });
  console.log(`Login-Code von "${user.name}" auf Pan8 gesetzt.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
