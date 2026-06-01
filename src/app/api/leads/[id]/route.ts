import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const UpdateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  estimatedValue: z.number().nullable().optional(),
  source: z.string().optional(),
  sellerId: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
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

    // Limpa a formatação do telefone e CPF antes de salvar
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }
    if (body.cpf) {
      body.cpf = body.cpf.replace(/\D/g, '');
    }

    const data = UpdateLeadSchema.parse(body);

    const lead = await prisma.lead.findUnique({
      where: { id }
    });
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Restrições para o papel de VENDEDOR
    if (session.role === 'VENDEDOR') {
      const userSeller = await prisma.seller.findUnique({
        where: { userId: session.id }
      });
      
      // 1. Se o lead pertence a outro vendedor, bloqueia a edição
      if (lead.sellerId && (!userSeller || lead.sellerId !== userSeller.id)) {
        return NextResponse.json({ error: 'Você não tem permissão para editar este lead pois ele está atribuído a outro vendedor.' }, { status: 403 });
      }

      // 2. Se tentar atribuir o lead a outro vendedor
      if (data.sellerId && (!userSeller || data.sellerId !== userSeller.id)) {
        return NextResponse.json({ error: 'Você só pode atribuir leads a si mesmo ou deixá-los sem responsável.' }, { status: 403 });
      }

      // 3. Vendedor só pode alterar status e sellerId
      const allowedFields = ['status', 'sellerId'];
      const fieldsBeingUpdated = Object.keys(data).filter(k => (data as any)[k] !== undefined);
      const isUpdatingRestrictedFields = fieldsBeingUpdated.some(k => !allowedFields.includes(k));
      if (isUpdatingRestrictedFields) {
        return NextResponse.json({ error: 'Vendedores só possuem permissão para atualizar o status do lead ou vinculá-lo.' }, { status: 403 });
      }
    }

    // Se atribuiu ou alterou o vendedor, valida o limite de 5 leads ativos
    if (data.sellerId && data.sellerId !== lead.sellerId) {
      const activeLeadsCount = await prisma.lead.count({
        where: {
          sellerId: data.sellerId,
          status: {
            notIn: ['vendido', 'perdido', 'contato_nao_atualizado']
          }
        }
      });
      if (activeLeadsCount >= 5) {
        return NextResponse.json({ error: 'Este vendedor já possui o limite de 5 leads ativos.' }, { status: 400 });
      }
    }

    const whereClause: any = { id };
    if (session.companyId) {
      whereClause.companyId = session.companyId;
    }

    const updatedLead = await prisma.lead.updateMany({
      where: whereClause,
      data: {
        ...data,
      },
    });

    if (updatedLead.count === 0) {
      return NextResponse.json({ error: 'Lead não encontrado ou não autorizado' }, { status: 404 });
    }

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
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
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'VENDEDOR') {
      return NextResponse.json({ error: 'Vendedores não têm permissão para excluir leads.' }, { status: 403 });
    }

    const { id } = await params;

    const whereClause: any = { id };
    if (session.companyId) {
      whereClause.companyId = session.companyId;
    }

    const deletedLead = await prisma.lead.deleteMany({
      where: whereClause,
    });

    if (deletedLead.count === 0) {
      return NextResponse.json({ error: 'Lead não encontrado ou não autorizado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Lead deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
