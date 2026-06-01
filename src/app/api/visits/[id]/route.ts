import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const { id } = await params;
    const body = await request.json();
    const data = UpdateVisitSchema.parse(body);

    const existing = await prisma.visit.findUnique({ where: { id } });
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
    const { id } = await params;
    await prisma.visit.delete({ where: { id } });
    return NextResponse.json({ message: 'Visita deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
