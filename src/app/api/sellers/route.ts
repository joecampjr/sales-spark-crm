import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SellerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().regex(/^\d{2}9?\d{8}$/, 'Formato de telefone inválido (DDD + 8 ou 9 dígitos)').optional().or(z.literal('')),
  region: z.string(),
  monthlyGoal: z.number().optional().default(0),
  contactsTarget: z.number().optional().default(10),
  commissionRate: z.number().optional().default(0),
  branchId: z.string().optional().nullable(),
  status: z.string().optional().default('ativo'),
});

export async function GET() {
  try {
    const sellers = await prisma.seller.findMany({
      orderBy: { salesCount: 'desc' },
      include: {
        branch: true,
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
    const body = await request.json();
    
    // Limpa a formatação do telefone antes de validar
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }

    const data = SellerSchema.parse(body);

    const newSeller = await prisma.seller.create({
      data: {
        name: data.name,
        // Converte string vazia para null para não quebrar o @unique do Prisma
        email: data.email && data.email !== '' ? data.email : null,
        phone: data.phone || null,
        region: data.region,
        monthlyGoal: data.monthlyGoal,
        contactsTarget: data.contactsTarget,
        commissionRate: data.commissionRate,
        branchId: data.branchId || null,
        status: data.status,
        salesCount: 0,
        conversionRate: 0,
        activeLeads: 0,
        contactsToday: 0,
      }
    });

    return NextResponse.json(newSeller, { status: 201 });
  } catch (error) {
    console.error('Error creating seller:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Erro de Validação', 
        details: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'E-mail ou Telefone já cadastrado' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
