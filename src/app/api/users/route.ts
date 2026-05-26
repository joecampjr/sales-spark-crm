import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.string(),
  branchId: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  // Seller extra fields (only used if role is VENDEDOR)
  phone: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  monthlyGoal: z.number().optional().nullable(),
  contactsTarget: z.number().optional().nullable(),
  commissionRate: z.number().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const where: any = {};
    if (session.companyId) {
      where.companyId = session.companyId;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        branch: { select: { name: true } },
        seller: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Remove as senhas antes de enviar
    const usersWithoutPassword = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });

    return NextResponse.json(usersWithoutPassword);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Apenas ADMIN e SUPERADMIN podem criar usuários
    if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data = UserSchema.parse(body);

    if (!data.password) {
      return NextResponse.json({ error: 'Senha obrigatória' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      // 1. Cria o usuário
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: data.role,
          cpf: data.cpf || null,
          branchId: data.branchId || null,
          companyId: session.companyId || null
        }
      });

      // 2. Se for vendedor, cria o registro na tabela Seller
      if (data.role === 'VENDEDOR') {
        let phone = data.phone || '';
        if (phone) phone = phone.replace(/\D/g, '');

        await tx.seller.create({
          data: {
            name: data.name,
            email: data.email,
            phone: phone || null,
            region: data.region || 'São Paulo - Capital',
            monthlyGoal: data.monthlyGoal ?? 50000,
            contactsTarget: data.contactsTarget ?? 10,
            commissionRate: data.commissionRate ?? 5,
            branchId: data.branchId || null,
            status: 'ativo',
            companyId: session.companyId || null,
            userId: user.id
          }
        });
      }

      return user;
    });

    const { password, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'E-mail ou CPF já cadastrado' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
