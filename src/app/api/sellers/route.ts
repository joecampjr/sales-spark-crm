import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const SellerSchema = z.object({
  name: z.string().min(2),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional().nullable(),
  cpf: z.string().min(11, 'CPF inválido'),
  password: z.string().min(6, 'Senha temporária deve ter no mínimo 6 caracteres'),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos (DDD + número)').optional().or(z.literal('')),
  region: z.string().optional().nullable().or(z.literal('')),
  monthlyGoal: z.number().optional().default(0),
  contactsTarget: z.number().optional().default(10),
  commissionRate: z.number().optional().default(0),
  commissionRateInternal: z.number().optional().default(0),
  commissionRateExternal: z.number().optional().default(0),
  branchId: z.string().optional().nullable(),
  status: z.string().optional().default('ativo'),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterBranchId = searchParams.get('branchId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const where: any = {};
    if (session.companyId) {
      where.companyId = session.companyId;
    }

    if (session.role === 'VENDEDOR') {
      where.userId = session.id;
    } else if (session.role === 'GERENTE') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { branchId: true }
      });
      if (dbUser && dbUser.branchId) {
        where.branchId = dbUser.branchId;
      } else {
        where.branchId = 'non-existent-branch-id';
      }
    } else {
      // Supervisors, Admins, Superadmins
      if (filterBranchId && filterBranchId !== 'todos') {
        const bId = filterBranchId === 'sem_filial' ? null : filterBranchId;
        where.branchId = bId;
      }
    }

    const sellers = await prisma.seller.findMany({
      where,
      include: {
        branch: true,
        user: {
          select: { cpf: true }
        },
        _count: {
          select: { leads: true, visits: true }
        }
      }
    });

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
    }
    if (endDateParam) {
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const calculatedSellers = await Promise.all(sellers.map(async (seller) => {
      // 1. Leads Vinculados (leads assigned to the seller in this period, but NOT created by them)
      const leadWhere: any = { 
        sellerId: seller.id,
        NOT: [
          { createdById: seller.userId },
          { createdById: null, source: { notIn: ['CSV Import', 'CSV'] } }
        ]
      };
      if (startDate || endDate) {
        leadWhere.createdAt = {};
        if (startDate) leadWhere.createdAt.gte = startDate;
        if (endDate) leadWhere.createdAt.lte = endDate;
      }
      const leadsLinkedCount = await prisma.lead.count({ where: leadWhere });

      // 2. Leads Adicionados (leads created by the seller in this period)
      const createdWhere: any = {
        OR: [
          { createdById: seller.userId },
          { 
            createdById: null, 
            sellerId: seller.id,
            source: { notIn: ['CSV Import', 'CSV'] }
          }
        ]
      };
      if (startDate || endDate) {
        createdWhere.createdAt = {};
        if (startDate) createdWhere.createdAt.gte = startDate;
        if (endDate) createdWhere.createdAt.lte = endDate;
      }
      const leadsCreatedCount = await prisma.lead.count({ where: createdWhere });

      // 3. Contatos/Interactions in this period
      const interactionWhere: any = { sellerId: seller.id };
      if (startDate || endDate) {
        interactionWhere.createdAt = {};
        if (startDate) interactionWhere.createdAt.gte = startDate;
        if (endDate) interactionWhere.createdAt.lte = endDate;
      }
      const interactionsCount = await prisma.interaction.count({ where: interactionWhere });

      // 4. Contar vendas reais do vendedor no período
      const salesWhere: any = {
        sellerId: seller.id,
        status: 'vendido'
      };
      if (startDate || endDate) {
        salesWhere.updatedAt = {};
        if (startDate) salesWhere.updatedAt.gte = startDate;
        if (endDate) salesWhere.updatedAt.lte = endDate;
      }
      const salesCount = await prisma.lead.count({ where: salesWhere });

      // 5. Somar o valor total vendido no período
      const salesSum = await prisma.lead.aggregate({
        where: salesWhere,
        _sum: {
          estimatedValue: true
        }
      });
      const salesValue = salesSum._sum.estimatedValue || 0;

      // 6. Contar leads ativos atuais
      const activeLeads = await prisma.lead.count({
        where: {
          sellerId: seller.id,
          status: {
            notIn: ['vendido', 'perdido', 'contato_nao_atualizado', 'aguardando_produto']
          }
        }
      });

      // 7. Contar contatos realizados hoje (sempre hoje)
      const contactsToday = await prisma.interaction.count({
        where: {
          sellerId: seller.id,
          createdAt: { gte: startOfToday }
        }
      });

      // 8. Taxa de Conversão no período
      const conversionRate = leadsLinkedCount > 0 ? Number(((salesCount / leadsLinkedCount) * 100).toFixed(1)) : 0;

      return {
        ...seller,
        salesCount,
        salesValue,
        activeLeads,
        conversionRate,
        contactsToday,
        leadsLinkedCount,
        leadsCreatedCount,
        interactionsCount
      };
    }));

    // Ordenar decrescentemente por volume de vendas (valor total ou quantidade? Quantidade de vendas é padrão, mas valor total pode desempatar)
    calculatedSellers.sort((a, b) => {
      if (b.salesCount !== a.salesCount) {
        return b.salesCount - a.salesCount;
      }
      return b.salesValue - a.salesValue;
    });

    return NextResponse.json(calculatedSellers);
  } catch (error) {
    console.error('Error fetching sellers:', error);
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
    
    // Limpa a formatação do telefone e CPF antes de validar
    if (body.phone) {
      body.phone = body.phone.replace(/\D/g, '');
    }
    if (body.cpf) {
      body.cpf = body.cpf.replace(/\D/g, '');
    }

    const data = SellerSchema.parse(body);

    let finalBranchId = data.branchId || null;

    if (session.role === 'GERENTE') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { branchId: true }
      });
      finalBranchId = dbUser?.branchId || null;
    }

    const newSeller = await prisma.$transaction(async (tx) => {
      // 1. Verifica se e-mail ou CPF de usuário já existe (apenas se fornecido)
      const conditions: any[] = [];
      if (data.email) {
        conditions.push({ email: data.email });
      }
      if (data.cpf) {
        conditions.push({ cpf: data.cpf });
      }

      if (conditions.length > 0) {
        const existingUser = await tx.user.findFirst({
          where: { OR: conditions }
        });

        if (existingUser) {
          throw new Error('E-mail ou CPF já cadastrado por outro usuário');
        }
      }

      // 2. Criptografa a senha temporária
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // 3. Cria o usuário correspondente
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email || null,
          password: hashedPassword,
          role: 'VENDEDOR',
          cpf: data.cpf,
          branchId: finalBranchId,
          companyId: session.companyId || null
        }
      });

      // 4. Cria o vendedor associado
      const seller = await tx.seller.create({
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          region: data.region || null,
          monthlyGoal: data.monthlyGoal,
          contactsTarget: data.contactsTarget,
          commissionRate: data.commissionRate,
          commissionRateInternal: data.commissionRateInternal,
          commissionRateExternal: data.commissionRateExternal,
          branchId: finalBranchId,
          status: data.status,
          salesCount: 0,
          conversionRate: 0,
          activeLeads: 0,
          contactsToday: 0,
          companyId: session.companyId || null,
          userId: user.id
        }
      });

      return seller;
    });

    return NextResponse.json(newSeller, { status: 201 });
  } catch (error: any) {
    console.error('Error creating seller:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Erro de Validação', 
        details: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    if (error.message === 'E-mail ou CPF já cadastrado por outro usuário') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'E-mail, CPF ou Telefone já cadastrado' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

