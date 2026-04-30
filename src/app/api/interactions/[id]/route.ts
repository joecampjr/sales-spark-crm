import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
    const { id } = await params;
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
    const { id } = await params;

    await prisma.interaction.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Interação deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting interaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
