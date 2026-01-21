const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.painting.findFirst({
    where: {
      title: {
        contains: 'The Family Concert'
      }
    }
  });
  console.log('Found item:', item);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
