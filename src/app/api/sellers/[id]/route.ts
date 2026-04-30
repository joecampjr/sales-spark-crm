import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateSellerSchema = z.object({
  name: z.string().min(2).optional(),
  region: z.string().optional(),
  monthlyGoal: z.number().optional(),
  contactsTarget: z.number().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateSellerSchema.parse(body);

    const updated = await prisma.seller.update({
      where: { id },
      data: {
        name: data.name,
        region: data.region,
        monthlyGoal: data.monthlyGoal,
        contactsTarget: data.contactsTarget,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating seller:', error);
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

    await prisma.seller.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Vendedor removido com sucesso' });
  } catch (error) {
    console.error('Error deleting seller:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
