import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const SellerSchema = z.object({
  name: z.string().min(2),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional().nullable(),
  cpf: z.string().min(11, 'CPF inválido'),
  password: z.string().min(6, 'Senha temporária deve ter no mínimo 6 caracteres'),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos (DDD + número)').optional().or(z.literal('')),
  region: z.string().optional().nullable().or(z.literal('')),
  monthlyGoal: z.number().optional().default(0),
  contactsTarget: z.number().optional().default(10),
  commissionRate: z.number().optional().default(0),
  branchId: z.string().optional().nullable(),
  status: z.string().optional().default('ativo'),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {};
    if (session.companyId) {
      where.companyId = session.companyId;
    }

    const sellers = await prisma.seller.findMany({
      where,
      orderBy: { salesCount: 'desc' },
      include: {
        branch: true,
        user: {
          select: { cpf: true }
        },
        _count: {
          select: { leads: true, visits: true }
        }
      }
    });

    return NextResponse.json(sellers);
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Limpa a formatação do telefone e CPF antes de validar
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }
    if (body.cpf) {
      body.cpf = body.cpf.replace(/\D/g, '');
    }

    const data = SellerSchema.parse(body);

    const newSeller = await prisma.$transaction(async (tx) => {
      // 1. Verifica se e-mail ou CPF de usuário já existe (apenas se fornecido)
      const conditions: any[] = [];
      if (data.email) {
        conditions.push({ email: data.email });
      }
      if (data.cpf) {
        conditions.push({ cpf: data.cpf });
      }

      if (conditions.length > 0) {
        const existingUser = await tx.user.findFirst({
          where: { OR: conditions }
        });

        if (existingUser) {
          throw new Error('E-mail ou CPF já cadastrado por outro usuário');
        }
      }

      // 2. Criptografa a senha temporária
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // 3. Cria o usuário correspondente
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email || null,
          password: hashedPassword,
          role: 'VENDEDOR',
          cpf: data.cpf,
          branchId: data.branchId || null,
          companyId: session.companyId || null
        }
      });

      // 4. Cria o vendedor associado
      const seller = await tx.seller.create({
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          region: data.region || null,
          monthlyGoal: data.monthlyGoal,
          contactsTarget: data.contactsTarget,
          commissionRate: data.commissionRate,
          branchId: data.branchId || null,
          status: data.status,
          salesCount: 0,
          conversionRate: 0,
          activeLeads: 0,
          contactsToday: 0,
          companyId: session.companyId || null,
          userId: user.id
        }
      });

      return seller;
    });

    return NextResponse.json(newSeller, { status: 201 });
  } catch (error: any) {
    console.error('Error creating seller:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Erro de Validação', 
        details: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    if (error.message === 'E-mail ou CPF já cadastrado por outro usuário') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'E-mail, CPF ou Telefone já cadastrado' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

