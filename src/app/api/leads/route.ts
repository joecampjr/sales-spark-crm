import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const CreateLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  city: z.string(),
  state: z.string(),
  status: z.string(),
  priority: z.string(),
  estimatedValue: z.number().nullable().optional(),
  paymentMode: z.string().nullable().optional(),
  downPayment: z.number().nullable().optional(),
  saleType: z.string().nullable().optional(),
  source: z.string(),
  sellerId: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
  avgDelayDays: z.number().nullable().optional(),
  route: z.string().nullable().optional(),
  productType: z.string().nullable().optional(),
  lastPurchaseDate: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Libera leads finalizados há mais de 30 dias (status perdido, contato_nao_atualizado)
    // Apenas se nunca foram reativados e o status não for vendido (que fica fixo)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (session.companyId) {
      const leadsToRelease = await prisma.lead.findMany({
        where: {
          companyId: session.companyId,
          status: {
            in: ['perdido', 'contato_nao_atualizado']
          },
          updatedAt: {
            lte: thirtyDaysAgo
          },
          sellerId: {
            not: null
          },
          interactions: {
            none: {
              result: 'Reativado'
            }
          }
        },
        select: {
          id: true
        }
      });

      if (leadsToRelease.length > 0) {
        const ids = leadsToRelease.map(l => l.id);
        await prisma.lead.updateMany({
          where: {
            id: {
              in: ids
            }
          },
          data: {
            sellerId: null,
            status: 'novo'
          }
        });
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'todos';
    const filterName = searchParams.get('filterName') || '';
    const filterPhone = searchParams.get('filterPhone') || '';
    const filterCpf = searchParams.get('filterCpf') || '';
    const filterBranchId = searchParams.get('filterBranchId') || '';

    const where: any = {};
    if (session.companyId) {
      where.companyId = session.companyId;
    }

    // Filtro de Vendedor (Visibilidade Restrita por Filial e Leads Sem Responsável ou Próprios)
    if (session.role === 'VENDEDOR') {
      const userSeller = await prisma.seller.findUnique({
        where: { userId: session.id }
      });
      if (userSeller) {
        where.AND = [
          {
            OR: [
              { branchId: userSeller.branchId },
              { branchId: null }
            ]
          },
          {
            OR: [
              { sellerId: userSeller.id },
              { sellerId: null }
            ]
          }
        ];
      } else {
        where.branchId = 'non-existent-branch-id';
      }
    }

    // Filtro de Gerente (Visibilidade Restrita por Filial)
    if (session.role === 'GERENTE') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { branchId: true }
      });
      if (dbUser) {
        where.AND = [
          {
            OR: [
              { branchId: dbUser.branchId },
              { branchId: null }
            ]
          }
        ];
      } else {
        where.branchId = 'non-existent-branch-id';
      }
    }

    if (!where.AND) {
      where.AND = [];
    }

    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    if (filterName) {
      where.AND.push({ name: { contains: filterName, mode: 'insensitive' } });
    }

    if (filterPhone) {
      const cleanPhone = filterPhone.replace(/\D/g, '');
      if (cleanPhone) {
        where.AND.push({ phone: { contains: cleanPhone } });
      }
    }

    if (filterCpf) {
      const cleanCpf = filterCpf.replace(/\D/g, '');
      if (cleanCpf) {
        where.AND.push({ cpf: { contains: cleanCpf } });
      }
    }

    if (filterBranchId && filterBranchId !== 'todos') {
      if (filterBranchId === 'sem_filial') {
        where.AND.push({ branchId: null });
      } else {
        where.AND.push({ branchId: filterBranchId });
      }
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    if (statusFilter && statusFilter !== 'todos') {
      where.status = statusFilter;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            seller: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Limpa a formatação do telefone e CPF antes de salvar
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }
    if (body.cpf) {
      body.cpf = body.cpf.replace(/\D/g, '');
    }

    const data = CreateLeadSchema.parse(body);

    let cleanedBirthday: string | null = null;
    if (data.birthday) {
      const bMatch = data.birthday.match(/^(\d{1,2})\/(\d{1,2})/);
      if (bMatch) {
        const day = bMatch[1].padStart(2, '0');
        const month = bMatch[2].padStart(2, '0');
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
          cleanedBirthday = `${day}/${month}`;
        } else {
          return NextResponse.json({ error: 'Data de aniversário inválida. Use o formato DD/MM.' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'Formato de aniversário inválido. Use o formato DD/MM.' }, { status: 400 });
      }
    }

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

    let finalBranchId = data.branchId || null;

    // Se for VENDEDOR, restringe atribuição apenas a si mesmo ou nulo, e herda a filial dele
    if (session.role === 'VENDEDOR') {
      const userSeller = await prisma.seller.findUnique({
        where: { userId: session.id }
      });
      if (data.sellerId && (!userSeller || data.sellerId !== userSeller.id)) {
        return NextResponse.json({ error: 'Você só pode atribuir leads a si mesmo ou deixá-los sem responsável.' }, { status: 403 });
      }
      if (userSeller) {
        finalBranchId = userSeller.branchId;
      }
    }
    // CPF/CNPJ validação de duplicidade (se fornecido)
    if (data.cpf) {
      const cleanedCpf = data.cpf.replace(/\D/g, '');
      if (cleanedCpf.length !== 11 && cleanedCpf.length !== 14) {
        return NextResponse.json({ error: 'CPF/CNPJ inválido (CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos).' }, { status: 400 });
      }
      data.cpf = cleanedCpf;

      const existingLeadCpf = await prisma.lead.findFirst({
        where: {
          cpf: cleanedCpf,
          companyId: session.companyId || null,
        }
      });
      if (existingLeadCpf) {
        return NextResponse.json({ error: 'Um lead com este CPF/CNPJ já está cadastrado nesta empresa.' }, { status: 400 });
      }
    } else {
      data.cpf = null;
    }
    // Verifica se já existe um lead com o mesmo telefone nesta empresa
    if (data.phone) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          phone: data.phone,
          companyId: session.companyId || null,
        }
      });
      if (existingLead) {
        return NextResponse.json({ error: 'Um lead com este telefone já está cadastrado nesta empresa.' }, { status: 400 });
      }
    }

    const newLead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        city: data.city,
        state: data.state,
        status: data.status,
        priority: data.priority,
        estimatedValue: data.estimatedValue,
        paymentMode: data.paymentMode || null,
        downPayment: data.downPayment || null,
        saleType: data.saleType || null,
        source: data.source,
        cpf: data.cpf || null,
        branchId: finalBranchId,
        sellerId: data.sellerId || null,
        createdById: session.id,
        companyId: session.companyId || null,
        birthday: cleanedBirthday,
        avgDelayDays: data.avgDelayDays || null,
        route: data.route || null,
        productType: data.productType || null,
        lastPurchaseDate: data.status === 'vendido' 
          ? new Date() 
          : (data.lastPurchaseDate ? new Date(data.lastPurchaseDate) : null),
      }
    });

    // Se o lead foi criado já com um vendedor atribuído por um supervisor/gerente/admin, registra a vinculação
    if (data.sellerId && session.role !== 'VENDEDOR') {
      await prisma.interaction.create({
        data: {
          leadId: newLead.id,
          sellerId: data.sellerId,
          type: 'sistema',
          result: 'Vinculado',
          notes: `Lead cadastrado e vinculado pelo ${session.role.toLowerCase()}.`,
          companyId: session.companyId || null
        }
      });
    }

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
