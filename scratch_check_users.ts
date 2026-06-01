import { prisma } from './src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Teste Um', mode: 'insensitive' } }
  });

  if (!user) {
    console.log('User Teste Um not found');
    return;
  }

  console.log('Found user:', user.id, user.name, user.role);

  const seller = await prisma.seller.findUnique({
    where: { userId: user.id }
  });

  if (seller) {
    console.log('Found matching seller:', seller.id, seller.name, 'userId:', seller.userId);
  } else {
    console.log('No matching seller found for userId:', user.id);
  }

  const allSellers = await prisma.seller.findMany();
  console.log('All sellers in DB:', allSellers.map(s => ({ id: s.id, name: s.name, userId: s.userId })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
