import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const CreateCompanySchema = z.object({
  name: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  cnpj: z.string().min(14, 'CNPJ deve ser preenchido corretamente'),
  adminName: z.string().min(2, 'Nome do administrador deve ter pelo menos 2 caracteres'),
  adminEmail: z.string().email('E-mail do administrador inválido'),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true, leads: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateCompanySchema.parse(body);

    // Verificar se a empresa já existe por CNPJ
    const existingCompany = await prisma.company.findUnique({
      where: { cnpj: data.cnpj }
    });
    if (existingCompany) {
      return NextResponse.json({ error: 'Já existe uma empresa cadastrada com este CNPJ.' }, { status: 400 });
    }

    // Verificar se o email do admin já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.adminEmail }
    });
    if (existingUser) {
      return NextResponse.json({ error: 'Já existe um usuário cadastrado com este e-mail.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

    // Transação atômica para criar empresa e administrador
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.name,
          cnpj: data.cnpj,
          status: 'ACTIVE'
        }
      });

      const adminUser = await tx.user.create({
        data: {
          name: data.adminName,
          email: data.adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          companyId: company.id
        }
      });

      return { company, adminUser };
    });

    const { password, ...adminWithoutPassword } = result.adminUser;

    return NextResponse.json({
      message: 'Empresa e Administrador criados com sucesso!',
      company: result.company,
      admin: adminWithoutPassword
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating company and admin:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Erro de validação', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao criar empresa.' }, { status: 500 });
  }
}

