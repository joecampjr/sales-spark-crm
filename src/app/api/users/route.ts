import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
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
  commissionRateInternal: z.number().optional().nullable(),
  commissionRateExternal: z.number().optional().nullable(),
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
      orderBy: { name: 'asc' }
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

    // Apenas ADMIN, SUPERADMIN e SUPERVISOR podem criar usuários
    if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN' && session.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Sanitiza CPF e telefone antes de validar e salvar
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }
    if (body.cpf) {
      body.cpf = body.cpf.replace(/\D/g, '');
    }

    const data = UserSchema.parse(body);

    if (!data.password) {
      return NextResponse.json({ error: 'Senha obrigatória' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    let finalBranchId = data.branchId || null;
    if (data.role === 'SUPERVISOR' || data.role === 'ADMIN' || data.role === 'SUPERADMIN') {
      finalBranchId = null;
    }

    const newUser = await prisma.$transaction(async (tx) => {
      // 1. Cria o usuário
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email || null,
          password: hashedPassword,
          role: data.role,
          cpf: data.cpf || null,
          branchId: finalBranchId,
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
            commissionRateInternal: data.commissionRateInternal ?? 5,
            commissionRateExternal: data.commissionRateExternal ?? 5,
            branchId: finalBranchId,
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
