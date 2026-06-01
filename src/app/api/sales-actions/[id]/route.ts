import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Se for uma autorização
    if (body.action === 'authorize' || body.action === 'reject') {
      const existing = await prisma.salesAction.findUnique({ where: { id } });
      let finalObs = existing?.observations || "";
      if (body.justification) {
        finalObs = (finalObs ? finalObs + "\n\n" : "") + `[Justificativa da Autorização/Recusa]: ${body.justification}`;
      }

      const updated = await prisma.salesAction.update({
        where: { id },
        data: {
          status: body.action === 'authorize' ? 'autorizada' : 'recusada',
          authorizedById: body.authorizedById,
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
    const { id } = await params;
    await prisma.salesAction.delete({ where: { id } });
    return NextResponse.json({ message: 'Ação deletada' });
  } catch (error) {
    console.error('Error deleting sales action:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
