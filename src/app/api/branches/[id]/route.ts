import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (body.phone) body.phone = body.phone.replace(/\D/g, '');
    
    const data = UpdateBranchSchema.parse(body);

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        city: data.city,
        state: data.state?.toUpperCase(),
        address: data.address === '' ? null : data.address || undefined,
        phone: data.phone === '' ? null : data.phone || undefined,
        email: data.email === '' ? null : data.email || undefined,
      },
    });

    return NextResponse.json(updated);
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
    const { id } = await params;
    await prisma.branch.delete({ where: { id } });
    return NextResponse.json({ message: 'Filial removida com sucesso' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
