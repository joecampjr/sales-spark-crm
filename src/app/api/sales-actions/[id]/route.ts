import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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
    
    // Garantir multitenancy: o usuário só altera ações da própria empresa
    const salesAction = await prisma.salesAction.findFirst({
      where: {
        id,
        companyId: session.companyId || undefined
      }
    });

    if (!salesAction) {
      return NextResponse.json({ error: 'Ação de vendas não encontrada ou não autorizada' }, { status: 404 });
    }

    const body = await request.json();

    // Se for uma autorização (apenas supervisor, admin ou superadmin)
    if (body.action === 'authorize' || body.action === 'reject') {
      const allowedRoles = ['SUPERADMIN', 'ADMIN', 'SUPERVISOR'];
      if (!allowedRoles.includes(session.role)) {
        return NextResponse.json({ error: 'Apenas supervisores ou administradores podem autorizar ações.' }, { status: 403 });
      }

      let finalObs = salesAction.observations || "";
      if (body.justification) {
        finalObs = (finalObs ? finalObs + "\n\n" : "") + `[Justificativa da Autorização/Recusa]: ${body.justification}`;
      }

      const updated = await prisma.salesAction.update({
        where: { id },
        data: {
          status: body.action === 'authorize' ? 'autorizada' : 'recusada',
          authorizedById: session.id,
          authorizedAt: new Date(),
          observations: finalObs,
        }
      });
      return NextResponse.json(updated);
    }

    // Se for preenchimento de relatório
    if (body.action === 'submit_report') {
      const updated = await prisma.salesAction.update({
        where: { id },
        data: {
          status: 'concluida',
          reportContent: body.reportContent,
          reportResult: body.reportResult,
          reportRealCost: body.reportRealCost !== undefined ? Number(body.reportRealCost) : null,
          reportRealSales: body.reportRealSales !== undefined ? Number(body.reportRealSales) : null,
          reportSubmittedAt: new Date(),
        }
      });
      
      // Se houver resultados por lead
      if (body.leadResults) {
        for (const res of body.leadResults) {
          await prisma.salesActionLead.updateMany({
            where: { salesActionId: id, leadId: res.leadId },
            data: { result: res.result, feedback: res.feedback }
          });
        }
      }
      
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating sales action:', error);
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

    // Apenas supervisor, admin e superadmin podem deletar
    const allowedRoles = ['SUPERADMIN', 'ADMIN', 'SUPERVISOR'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Você não tem permissão para deletar ações de vendas.' }, { status: 403 });
    }

    const { id } = await params;

    // Garantir multitenancy: o usuário só deleta ações da própria empresa
    const salesAction = await prisma.salesAction.findFirst({
      where: {
        id,
        companyId: session.companyId || undefined
      }
    });

    if (!salesAction) {
      return NextResponse.json({ error: 'Ação de vendas não encontrada ou não autorizada' }, { status: 404 });
    }

    await prisma.salesAction.delete({ where: { id } });
    return NextResponse.json({ message: 'Ação deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting sales action:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
