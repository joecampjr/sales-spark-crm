const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Iniciando limpeza de leads com o nome "Sem Nome"...');
    
    // Contar leads com "Sem Nome"
    const count = await prisma.lead.count({
      where: {
        name: {
          equals: 'Sem Nome',
          mode: 'insensitive' // Busca case-insensitive
        }
      }
    });

    console.log(`Encontrados ${count} leads com o nome "Sem Nome".`);

    if (count > 0) {
      const deleted = await prisma.lead.deleteMany({
        where: {
          name: {
            equals: 'Sem Nome',
            mode: 'insensitive'
          }
        }
      });
      console.log(`Sucesso: ${deleted.count} leads deletados.`);
    } else {
      console.log('Nenhum lead correspondente encontrado para deletar.');
    }
  } catch (error) {
    console.error('Erro durante a execução do script de limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
