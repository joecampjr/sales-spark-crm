import { config } from 'dotenv';
config();

import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'contato@cobusiness.com.br';
  const password = 'Eg2100@@';

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('Usuário já existe!');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
    // Cannot disconnect safely with extended Prisma Client, so just process.exit
    process.exit(0);
  }
}

main();
