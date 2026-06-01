import { prisma } from './src/lib/prisma';

async function main() {
  const seller = await prisma.seller.findFirst({
    where: { name: { contains: 'Teste Um', mode: 'insensitive' } }
  });

  if (!seller) {
    console.log('Seller Teste Um not found');
    return;
  }

  console.log('Found seller:', seller.id, seller.name);

  const leads = await prisma.lead.findMany({
    where: { sellerId: seller.id }
  });

  console.log('All leads for Teste Um:', leads.map(l => ({ id: l.id, name: l.name, status: l.status })));

  const activeLeads = await prisma.lead.findMany({
    where: {
      sellerId: seller.id,
      status: {
        notIn: ['vendido', 'perdido', 'contato_nao_atualizado']
      }
    }
  });

  console.log('Active leads count:', activeLeads.length);
  console.log('Active leads:', activeLeads.map(l => ({ id: l.id, name: l.name, status: l.status })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
