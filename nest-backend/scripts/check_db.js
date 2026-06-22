const {PrismaClient} = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany();
    console.log('USERS_COUNT', users.length);
  } catch (e) {
    console.error('ERR', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
