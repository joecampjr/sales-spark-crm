import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const UpdateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  estimatedValue: z.number().nullable().optional(),
  source: z.string().optional(),
  sellerId: z.string().nullable().optional(),
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

    // Limpa a formatação do telefone antes de salvar
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }

    const data = UpdateLeadSchema.parse(body);

    const whereClause: any = { id };
    if (session.companyId) {
      whereClause.companyId = session.companyId;
    }

    const updatedLead = await prisma.lead.updateMany({
      where: whereClause,
      data: {
        ...data,
      },
    });

    if (updatedLead.count === 0) {
      return NextResponse.json({ error: 'Lead não encontrado ou não autorizado' }, { status: 404 });
    }

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
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

    const deletedLead = await prisma.lead.deleteMany({
      where: whereClause,
    });

    if (deletedLead.count === 0) {
      return NextResponse.json({ error: 'Lead não encontrado ou não autorizado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Lead deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
