import { prisma } from './src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Teste Um', mode: 'insensitive' } }
  });

  if (!user) {
    console.log('User Teste Um not found');
    return;
  }

  console.log('User details:', {
    id: user.id,
    name: user.name,
    role: user.role,
    companyId: user.companyId
  });

  const seller = await prisma.seller.findUnique({
    where: { userId: user.id }
  });

  if (seller) {
    console.log('Seller details:', {
      id: seller.id,
      name: seller.name,
      userId: seller.userId,
      companyId: seller.companyId
    });
  } else {
    console.log('No seller found for userId:', user.id);
  }

  const allCompanies = await prisma.company.findMany();
  console.log('All companies in DB:', allCompanies.map(c => ({ id: c.id, name: c.name })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
