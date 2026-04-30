import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateVisitSchema = z.object({
  address: z.string().optional(),
  visitDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateVisitSchema.parse(body);

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        address: data.address,
        visitDate: data.visitDate ? new Date(data.visitDate) : undefined,
        status: data.status,
        notes: data.notes,
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
    const { id } = await params;
    await prisma.visit.delete({ where: { id } });
    return NextResponse.json({ message: 'Visita deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
