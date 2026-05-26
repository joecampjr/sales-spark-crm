import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const UpdateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  address: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  email: z.string().email().optional().nullable().or(z.literal('')),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    if (body.phone) body.phone = body.phone.replace(/\D/g, '');
    
    const data = UpdateBranchSchema.parse(body);

    const whereClause: any = { id };
    if (session.companyId) {
      whereClause.companyId = session.companyId;
    }

    const updated = await prisma.branch.updateMany({
      where: whereClause,
      data: {
        name: data.name,
        city: data.city,
        state: data.state?.toUpperCase(),
        address: data.address === '' ? null : data.address || undefined,
        phone: data.phone === '' ? null : data.phone || undefined,
        email: data.email === '' ? null : data.email || undefined,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Filial não encontrada ou não autorizada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Filial atualizada com sucesso' });
  } catch (error) {
    console.error('Error updating branch:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Erro de Validação', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const whereClause: any = { id };
    if (session.companyId) {
      whereClause.companyId = session.companyId;
    }

    const deleted = await prisma.branch.deleteMany({ where: whereClause });
    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Filial não encontrada ou não autorizada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Filial removida com sucesso' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
