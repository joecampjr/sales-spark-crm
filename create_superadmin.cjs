const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'contato@cobusiness.com.br';
  const password = 'Eg2100@@';

  try {
    // Verificar se já existe o email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('Usuário já existe!');
      return;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Encontrar a primeira empresa, ou criar uma se não existir
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'CoBusiness',
          cnpj: '00000000000000',
          status: 'ACTIVE'
        }
      });
      console.log('Criada empresa default para o Superadmin.');
    }

    // Criar o Super Admin
    const superadmin = await prisma.user.create({
      data: {
        name: 'CoBusiness CEO',
        email: email,
        password: hashedPassword,
        role: 'SUPERADMIN',
        companyId: company.id
      }
    });

    console.log('SUPERADMIN criado com sucesso:', superadmin.email);
  } catch (err) {
    console.error('Erro ao criar Superadmin:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
