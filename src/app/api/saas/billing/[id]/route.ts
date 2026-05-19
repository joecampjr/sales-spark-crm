import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { planName, planValue, nextDueDate, paymentStatus } = body;

    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        planName: planName || undefined,
        planValue: planValue !== undefined ? parseFloat(planValue) : undefined,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        paymentStatus: paymentStatus || undefined
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating company billing:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados financeiros da empresa.' }, { status: 500 });
  }
}
