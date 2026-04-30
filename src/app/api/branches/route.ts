import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const BranchSchema = z.object({
  name: z.string().min(2),
  city: z.string(),
  state: z.string().length(2),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
});

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        _count: {
          select: { sellers: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Limpa telefone
    if (body.phone) body.phone = body.phone.replace(/\D/g, '');
    
    const data = BranchSchema.parse(body);

    // Busca uma empresa padrão ou a primeira cadastrada
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: { name: 'Empresa Principal', cnpj: '00.000.000/0001-00' }
      });
    }

    const newBranch = await prisma.branch.create({
      data: {
        name: data.name,
        city: data.city,
        state: data.state.toUpperCase(),
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        companyId: company.id
      }
    });

    return NextResponse.json(newBranch, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Erro de Validação', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
