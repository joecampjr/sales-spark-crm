import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, role, companyId, branchId } = body;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) {
      // Verificar se e-mail já existe em outro usuário
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id } }
      });
      if (existing) {
        return NextResponse.json({ error: 'Este e-mail já está sendo utilizado por outro usuário.' }, { status: 400 });
      }
      updateData.email = email;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (role) updateData.role = role;
    
    // Permitir alterar/desvincular empresa e filial
    updateData.companyId = companyId || null;
    updateData.branchId = branchId || null;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating global user:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados do usuário.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Não permitir deletar a si mesmo
    if (session.id === id) {
      return NextResponse.json({ error: 'Você não pode excluir sua própria conta.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Usuário excluído permanentemente da plataforma.' });
  } catch (error) {
    console.error('Error deleting global user:', error);
    return NextResponse.json({ error: 'Erro ao excluir usuário da plataforma.' }, { status: 500 });
  }
}
