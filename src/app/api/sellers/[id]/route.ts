import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateSellerSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().regex(/^\d{2}9?\d{8}$/, 'Formato de telefone inválido (DDD + 8 ou 9 dígitos)').optional().or(z.literal('')),
  region: z.string().optional(),
  monthlyGoal: z.number().optional(),
  contactsTarget: z.number().optional(),
  commissionRate: z.number().optional(),
  branchId: z.string().optional().nullable(),
  status: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Limpa a formatação do telefone antes de validar
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }

    const data = UpdateSellerSchema.parse(body);

    const updated = await prisma.seller.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email === '' ? null : data.email || undefined,
        phone: data.phone === '' ? null : data.phone || undefined,
        region: data.region,
        monthlyGoal: data.monthlyGoal,
        contactsTarget: data.contactsTarget,
        commissionRate: data.commissionRate,
        branchId: data.branchId === '' ? null : data.branchId || undefined,
        status: data.status,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating seller:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Erro de Validação', 
        details: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
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
    await prisma.seller.delete({ where: { id } });
    return NextResponse.json({ message: 'Vendedor removido com sucesso' });
  } catch (error) {
    console.error('Error deleting seller:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
