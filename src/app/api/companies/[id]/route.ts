import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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

    const updated = await prisma.company.update({
      where: { id },
      data: {
        status: body.status,
        suspendedAt: body.status === 'SUSPENDED' ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }

    // Executar a exclusão de todos os dados relacionados em uma transação atômica
    await prisma.$transaction(async (tx) => {
      // 1. Excluir staffs e leads de ações de vendas da empresa
      await tx.salesActionStaff.deleteMany({
        where: {
          seller: { companyId: id }
        }
      });

      await tx.salesActionLead.deleteMany({
        where: {
          lead: { companyId: id }
        }
      });

      // 2. Excluir ações de vendas da empresa
      await tx.salesAction.deleteMany({
        where: { companyId: id }
      });

      // 3. Excluir visitas da empresa
      await tx.visit.deleteMany({
        where: { companyId: id }
      });

      // 4. Excluir interações da empresa
      await tx.interaction.deleteMany({
        where: { companyId: id }
      });

      // 5. Excluir leads da empresa
      await tx.lead.deleteMany({
        where: { companyId: id }
      });

      // 6. Excluir vendedores da empresa
      await tx.seller.deleteMany({
        where: { companyId: id }
      });

      // 7. Excluir usuários vinculados à empresa
      await tx.user.deleteMany({
        where: { companyId: id }
      });

      // 8. Excluir filiais vinculadas à empresa
      await tx.branch.deleteMany({
        where: { companyId: id }
      });

      // 9. Finalmente, excluir a empresa (tenant)
      await tx.company.delete({
        where: { id }
      });
    });

    return NextResponse.json({ message: 'Empresa e todos os seus dados associados foram excluídos permanentemente.' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Erro ao excluir permanentemente a empresa do sistema.' }, { status: 500 });
  }
}

