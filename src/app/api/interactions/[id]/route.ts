import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getSession } from '@/lib/auth';

const UpdateInteractionSchema = z.object({
  type: z.string().optional(),
  result: z.string().optional(),
  notes: z.string().optional(),
  scheduledFor: z.string().nullable().optional(),
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

    if (session.role === 'VENDEDOR') {
      const existing = await prisma.interaction.findUnique({
        where: { id },
        include: { seller: true }
      });
      if (existing && existing.seller?.userId !== session.id) {
        return NextResponse.json({ error: 'Você só pode alterar interações criadas por você mesmo.' }, { status: 403 });
      }
    }

    const body = await request.json();
    const data = UpdateInteractionSchema.parse(body);

    const updated = await prisma.interaction.update({
      where: { id },
      data: {
        type: data.type,
        result: data.result,
        notes: data.notes,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : data.scheduledFor === null ? null : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating interaction:', error);
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

    if (session.role === 'VENDEDOR') {
      const existing = await prisma.interaction.findUnique({
        where: { id },
        include: { seller: true }
      });
      if (existing && existing.seller?.userId !== session.id) {
        return NextResponse.json({ error: 'Você só pode excluir interações criadas por você mesmo.' }, { status: 403 });
      }
    }

    await prisma.interaction.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Interação deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting interaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
