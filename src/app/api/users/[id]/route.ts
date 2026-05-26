import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.string().optional(),
  branchId: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  // Seller fields (optional)
  phone: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  monthlyGoal: z.number().optional().nullable(),
  contactsTarget: z.number().optional().nullable(),
  commissionRate: z.number().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Sanitiza CPF e telefone
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }
    if (body.cpf) {
      body.cpf = body.cpf.replace(/\D/g, '');
    }

    const data = UpdateUserSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Atualiza o usuário
      const user = await tx.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          cpf: data.cpf,
          branchId: data.branchId === '' ? null : data.branchId || undefined,
          password: data.password ? await bcrypt.hash(data.password, 10) : undefined,
        },
      });

      const finalRole = data.role || user.role;

      // 2. Trata a vinculação e sincronização com Seller
      if (finalRole === 'VENDEDOR') {
        const existingSeller = await tx.seller.findFirst({ where: { userId: id } });
        if (existingSeller) {
          // Atualiza vendedor existente
          await tx.seller.update({
            where: { id: existingSeller.id },
            data: {
              name: data.name || undefined,
              email: data.email || undefined,
              phone: data.phone === '' ? null : data.phone || undefined,
              region: data.region || undefined,
              monthlyGoal: data.monthlyGoal !== undefined ? (data.monthlyGoal ?? 0) : undefined,
              contactsTarget: data.contactsTarget !== undefined ? (data.contactsTarget ?? 10) : undefined,
              commissionRate: data.commissionRate !== undefined ? (data.commissionRate ?? 0) : undefined,
              branchId: data.branchId === '' ? null : data.branchId || undefined,
            }
          });
        } else {
          // Se não existia o vendedor mas a role virou VENDEDOR, cria o Seller
          await tx.seller.create({
            data: {
              name: user.name,
              email: user.email,
              phone: data.phone || null,
              region: data.region || 'São Paulo - Capital',
              monthlyGoal: data.monthlyGoal ?? 50000,
              contactsTarget: data.contactsTarget ?? 10,
              commissionRate: data.commissionRate ?? 5,
              branchId: user.branchId || null,
              status: 'ativo',
              companyId: user.companyId,
              userId: user.id
            }
          });
        }
      } else {
        // Se a role final NÃO for VENDEDOR, removemos o registro do vendedor de forma segura
        const existingSeller = await tx.seller.findFirst({ where: { userId: id } });
        if (existingSeller) {
          await tx.seller.delete({ where: { id: existingSeller.id } });
        }
      }

      return user;
    });

    const { password, ...userWithoutPassword } = updated;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'E-mail ou CPF já cadastrado' }, { status: 400 });
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
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    
    // Não permitir deletar a si mesmo
    if (id === session.id) {
      return NextResponse.json({ error: 'Você não pode deletar sua própria conta' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

