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
  source: z.string(),
  sellerId: z.string().nullable().optional(),
  cpf: z.string().min(11, 'CPF é obrigatório'),
  branchId: z.string().nullable().optional(),
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

    if (search) {
      const searchCondition = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ]
      };
      if (where.AND) {
        where.AND.push(searchCondition);
      } else {
        where.AND = [searchCondition];
      }
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
    // CPF/CNPJ obrigatório e validação de duplicidade
    if (!data.cpf) {
      return NextResponse.json({ error: 'CPF/CNPJ é obrigatório.' }, { status: 400 });
    }
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
    // Se atribuiu um vendedor, e quem está fazendo a ação é VENDEDOR, valida o limite de 5 leads ativos
    if (session.role === 'VENDEDOR' && data.sellerId) {
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
        source: data.source,
        cpf: data.cpf || null,
        branchId: finalBranchId,
        sellerId: data.sellerId || null,
        companyId: session.companyId || null,
      }
    });

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
