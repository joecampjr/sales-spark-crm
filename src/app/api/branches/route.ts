import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
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
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {};
    if (session.companyId) {
      where.companyId = session.companyId;
    }

    const branches = await prisma.branch.findMany({
      where,
      include: {
        sellers: {
          select: { id: true, name: true, status: true }
        },
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
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.companyId) {
      return NextResponse.json({ error: 'Company ID is required to create a branch' }, { status: 400 });
    }

    const body = await request.json();
    
    // Limpa telefone
    if (body.phone) body.phone = body.phone.replace(/\D/g, '');
    
    const data = BranchSchema.parse(body);

    const newBranch = await prisma.branch.create({
      data: {
        name: data.name,
        city: data.city,
        state: data.state.toUpperCase(),
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        companyId: session.companyId
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
