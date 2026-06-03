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
  paymentMode: z.string().nullable().optional(),
  downPayment: z.number().nullable().optional(),
  saleType: z.string().nullable().optional(),
  source: z.string().optional(),
  sellerId: z.string().nullable().optional(),
  cpf: z.string().optional(),
  branchId: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
  avgDelayDays: z.number().nullable().optional(),
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
    if (body.birthday !== undefined) {
      if (body.birthday === null || body.birthday === '') {
        body.birthday = null;
      } else {
        const bMatch = body.birthday.match(/^(\d{1,2})\/(\d{1,2})/);
        if (bMatch) {
          const day = bMatch[1].padStart(2, '0');
          const month = bMatch[2].padStart(2, '0');
          const dayNum = parseInt(day);
          const monthNum = parseInt(month);
          if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
            body.birthday = `${day}/${month}`;
          } else {
            return NextResponse.json({ error: 'Data de aniversário inválida. Use o formato DD/MM.' }, { status: 400 });
          }
        } else {
          return NextResponse.json({ error: 'Formato de aniversário inválido. Use o formato DD/MM.' }, { status: 400 });
        }
      }
    }

    const data = UpdateLeadSchema.parse(body);

    // Validação obrigatória de valor de venda ao marcar como vendido
    if (data.status === 'vendido') {
      if (data.estimatedValue === undefined || data.estimatedValue === null || data.estimatedValue <= 0) {
        return NextResponse.json({ error: 'O valor da venda é obrigatório e deve ser maior que zero quando o status é Vendido.' }, { status: 400 });
      }
      if (!data.paymentMode) {
        return NextResponse.json({ error: 'O modo de pagamento é obrigatório quando o status é Vendido.' }, { status: 400 });
      }
      if (!['a_vista', 'carne', 'cartao', 'pix'].includes(data.paymentMode)) {
        return NextResponse.json({ error: 'Modo de pagamento inválido.' }, { status: 400 });
      }
      if (data.paymentMode === 'carne') {
        if (data.downPayment === undefined || data.downPayment === null || data.downPayment < 0) {
          return NextResponse.json({ error: 'O valor da entrada é obrigatório (maior ou igual a zero) para pagamento via Carnê.' }, { status: 400 });
        }
      }
      if (!data.saleType) {
        return NextResponse.json({ error: 'O tipo de venda (interna ou externa) é obrigatório quando o status é Vendido.' }, { status: 400 });
      }
      if (!['interna', 'externa'].includes(data.saleType)) {
        return NextResponse.json({ error: 'Tipo de venda inválido. Deve ser interna ou externa.' }, { status: 400 });
      }
    }

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

      // 3. Vendedor só pode alterar status, sellerId, e os campos da venda (se status for vendido ou já for vendido)
      const allowedFields = ['status', 'sellerId'];
      if (data.status === 'vendido' || lead.status === 'vendido') {
        allowedFields.push('estimatedValue', 'paymentMode', 'downPayment', 'saleType');
      }
      const fieldsBeingUpdated = Object.keys(data).filter(k => (data as any)[k] !== undefined);
      const isUpdatingRestrictedFields = fieldsBeingUpdated.some(k => !allowedFields.includes(k));
      if (isUpdatingRestrictedFields) {
        return NextResponse.json({ error: 'Vendedores só possuem permissão para atualizar o status do lead, vinculá-lo ou informar o valor da venda.' }, { status: 403 });
      }
    }
    // CPF/CNPJ validação de duplicidade (se fornecido)
    if (data.cpf) {
      const cleanedCpf = data.cpf.replace(/\D/g, '');
      if (cleanedCpf.length !== 11 && cleanedCpf.length !== 14) {
        return NextResponse.json({ error: 'CPF/CNPJ inválido (CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos).' }, { status: 400 });
      }
      data.cpf = cleanedCpf;

      if (cleanedCpf !== lead.cpf) {
        const existingLeadCpf = await prisma.lead.findFirst({
          where: {
            cpf: cleanedCpf,
            companyId: session.companyId || null,
            id: { not: id } // Exclui o lead atual da checagem
          }
        });
        if (existingLeadCpf) {
          return NextResponse.json({ error: 'Um lead com este CPF/CNPJ já está cadastrado nesta empresa.' }, { status: 400 });
        }
      }
    } else if (data.cpf === '') {
      data.cpf = null;
    }    // Se atribuiu ou alterou o vendedor, e quem está fazendo a ação é VENDEDOR, valida o limite de 5 leads ativos
    if (session.role === 'VENDEDOR' && data.sellerId && data.sellerId !== lead.sellerId) {
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
