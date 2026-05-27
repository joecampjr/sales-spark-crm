import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const UpdateSellerSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  cpf: z.string().min(11).optional().or(z.literal('')).nullable(),
  password: z.string().min(6).optional().or(z.literal('')).nullable(),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos (DDD + número)').optional().or(z.literal('')),
  region: z.string().optional().nullable().or(z.literal('')),
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
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Limpa a formatação do telefone e CPF antes de validar
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }
    if (body.cpf) {
      body.cpf = body.cpf.replace(/\D/g, '');
    }

    const data = UpdateSellerSchema.parse(body);

    // 1. Busca o vendedor garantindo a empresa do tenant
    const seller = await prisma.seller.findFirst({
      where: {
        id,
        companyId: session.companyId || undefined,
      }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado ou não autorizado' }, { status: 404 });
    }

    const updatedSeller = await prisma.$transaction(async (tx) => {
      // 2. Atualiza o Seller
      const s = await tx.seller.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email === '' ? null : data.email || undefined,
          phone: data.phone === '' ? null : data.phone || undefined,
          region: data.region === '' ? null : data.region || undefined,
          monthlyGoal: data.monthlyGoal,
          contactsTarget: data.contactsTarget,
          commissionRate: data.commissionRate,
          branchId: data.branchId === '' ? null : data.branchId || undefined,
          status: data.status,
        }
      });

      // 3. Se houver usuário associado, atualiza ele em sincronia
      if (s.userId) {
        const userUpdateData: any = {};
        if (data.name) userUpdateData.name = data.name;
        if (data.email !== undefined) {
          userUpdateData.email = data.email === '' ? null : data.email;
        }
        if (data.cpf !== undefined) {
          userUpdateData.cpf = data.cpf === '' ? null : data.cpf;
        }
        if (data.branchId !== undefined) {
          userUpdateData.branchId = data.branchId === '' ? null : data.branchId;
        }
        if (data.password) {
          userUpdateData.password = await bcrypt.hash(data.password, 10);
        }

        // Só atualiza o User se houver algum campo de usuário alterado
        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: s.userId },
            data: userUpdateData
          });
        }
      }

      return s;
    });

    return NextResponse.json({ message: 'Vendedor atualizado com sucesso', seller: updatedSeller });
  } catch (error) {
    console.error('Error updating seller:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Erro de Validação', 
        details: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'E-mail, CPF ou Telefone já cadastrado' }, { status: 400 });
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
    
    // 1. Busca o vendedor para saber se tem userId
    const seller = await prisma.seller.findFirst({
      where: {
        id,
        companyId: session.companyId || undefined,
      }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado ou não autorizado' }, { status: 404 });
    }

    // 2. Se tiver userId, deleta o User correspondente (causando deleção em cascata do Seller)
    if (seller.userId) {
      if (seller.userId === session.id) {
        return NextResponse.json({ error: 'Você não pode deletar sua própria conta' }, { status: 400 });
      }
      await prisma.user.delete({ where: { id: seller.userId } });
    } else {
      // Caso não tenha userId, deleta apenas o Seller
      await prisma.seller.delete({ where: { id } });
    }

    return NextResponse.json({ message: 'Vendedor removido com sucesso' });
  } catch (error) {
    console.error('Error deleting seller:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

