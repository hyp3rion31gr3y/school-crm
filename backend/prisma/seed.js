// Idempotent seed: Class 1-12 (section A). Run: npm run db:seed
const prisma = require('../src/lib/prisma');

async function main() {
  for (let i = 1; i <= 12; i++) {
    await prisma.classes.upsert({
      where: { name_section: { name: `Class ${i}`, section: 'A' } },
      update: {},
      create: { name: `Class ${i}`, section: 'A' },
    });
  }
  console.log('Seeded Class 1-12 (A).');
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
