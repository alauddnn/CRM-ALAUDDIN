const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const presets = [
      { email: 'admin@crm.com', name: 'Amanda', role: 'ADMIN' },
      { email: 'sales1@crm.com', name: 'Sidiq Pantai', role: 'SALES' },
      { email: 'sales2@crm.com', name: 'Budi Kota', role: 'SALES' },
      { email: 'finance@crm.com', name: 'Fiona Manager', role: 'FINANCE' },
    ];

    for (const p of presets) {
      await prisma.user.upsert({
        where: { email: p.email },
        update: { name: p.name, role: p.role, password: '1' },
        create: { email: p.email, name: p.name, role: p.role, password: '1' }
      });
      console.log('Upserted', p.email);
    }

    console.log('Preset users upsert complete');
  } catch (e) {
    console.error('Error upserting presets:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
