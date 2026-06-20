import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const UpdateVisitSchema = z.object({
  address: z.string().optional(),
  visitDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  result: z.string().optional().nullable(),
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
    const data = UpdateVisitSchema.parse(body);

    const existing = await prisma.visit.findUnique({
      where: { id },
      include: { seller: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Visita não encontrada' }, { status: 404 });
    }

    if (session.role === 'GERENTE') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { branchId: true }
      });
      if (!dbUser || !dbUser.branchId || existing.seller?.branchId !== dbUser.branchId) {
        return NextResponse.json({ error: 'Não autorizado. O gerente só pode editar visitas da sua própria filial.' }, { status: 403 });
      }
    }
    let finalNotes = data.notes !== undefined ? data.notes : (existing?.notes || "");
    if (body.justification) {
      finalNotes = (finalNotes ? finalNotes + "\n\n" : "") + `[Justificativa da Autorização/Recusa]: ${body.justification}`;
    }

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        address: data.address,
        visitDate: data.visitDate ? new Date(data.visitDate) : undefined,
        status: data.status,
        notes: finalNotes,
        result: data.result,
        authorizedById: body.authorizedById,
        authorizedAt: body.authorizedById ? new Date() : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating visit:', error);
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

    const existing = await prisma.visit.findUnique({
      where: { id },
      include: { seller: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Visita não encontrada' }, { status: 404 });
    }

    if (session.role === 'GERENTE') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { branchId: true }
      });
      if (!dbUser || !dbUser.branchId || existing.seller?.branchId !== dbUser.branchId) {
        return NextResponse.json({ error: 'Não autorizado. O gerente só pode remover visitas da sua própria filial.' }, { status: 403 });
      }
    }

    await prisma.visit.delete({ where: { id } });
    return NextResponse.json({ message: 'Visita deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
