import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const email = 'contato@cobusiness.com.br';
    const password = 'Eg2100@@';

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
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: 'SUPERADMIN',
          companyId: existing.companyId || company.id
        }
      });
      return NextResponse.json({ message: 'Superadmin atualizado com sucesso! A senha foi resetada.', email });
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

    return NextResponse.json({ message: 'SUPERADMIN criado com sucesso!', email: superadmin.email });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar Superadmin' }, { status: 500 });
  }
}
