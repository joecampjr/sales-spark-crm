import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Se for SUPERADMIN, ele usa a rota /api/saas/metrics.
    // Esta rota calcula métricas específicas da empresa logada.
    const companyId = session.companyId;

    const leadWhere: any = { companyId };
    const sellerWhere: any = { companyId };
    const interactionWhere: any = { companyId };

    let userSeller: any = null;

    if (session.role === 'VENDEDOR') {
      userSeller = await prisma.seller.findUnique({
        where: { userId: session.id }
      });
      if (userSeller) {
        // Vendedor só vê os seus próprios leads e interações nos KPIs principais
        leadWhere.sellerId = userSeller.id;
        interactionWhere.sellerId = userSeller.id;
        sellerWhere.id = userSeller.id;
      } else {
        // Se o usuário vendedor não tem registro de seller associado
        leadWhere.id = 'non-existent-lead-id';
        sellerWhere.id = 'non-existent-seller-id';
        interactionWhere.id = 'non-existent-interaction-id';
      }
    } else if (session.role === 'GERENTE') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { branchId: true }
      });
      if (dbUser && dbUser.branchId) {
        leadWhere.branchId = dbUser.branchId;
        sellerWhere.branchId = dbUser.branchId;
        interactionWhere.seller = { branchId: dbUser.branchId };
      } else {
        leadWhere.branchId = 'non-existent-branch-id';
        sellerWhere.branchId = 'non-existent-branch-id';
        interactionWhere.id = 'non-existent-interaction-id';
      }
    }

    // 1. Total de Leads
    const totalLeads = await prisma.lead.count({ where: leadWhere });

    // 2. Vendas do Mês (soma do estimatedValue dos leads vendidos este mês)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const salesSum = await prisma.lead.aggregate({
      where: {
        ...leadWhere,
        status: 'vendido',
        updatedAt: { gte: startOfMonth }
      },
      _sum: {
        estimatedValue: true
      }
    });
    const vendasMes = salesSum._sum.estimatedValue || 0;

    // 3. Taxa de Conversão
    const vendidosLeads = await prisma.lead.count({
      where: {
        ...leadWhere,
        status: 'vendido'
      }
    });
    const taxaConversao = totalLeads > 0 ? Number(((vendidosLeads / totalLeads) * 100).toFixed(1)) : 0;

    // 4. Contatos Hoje
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let contatosHoje = 0;
    let metaDiaria = 10;
    let metaMes = 100000;

    if (session.role === 'VENDEDOR') {
      contatosHoje = userSeller ? await prisma.interaction.count({
        where: {
          sellerId: userSeller.id,
          createdAt: { gte: startOfToday }
        }
      }) : 0;
      metaDiaria = userSeller?.contactsTarget || 10;
      metaMes = userSeller?.monthlyGoal || 50000; // meta em valor ou leads
    } else {
      // Para gestores, a meta e contatos acumulam todos os vendedores da filial/empresa
      const sellers = await prisma.seller.findMany({
        where: sellerWhere,
        select: { id: true, contactsTarget: true, monthlyGoal: true }
      });
      const sellerIds = sellers.map(s => s.id);
      
      contatosHoje = sellerIds.length > 0 ? await prisma.interaction.count({
        where: {
          sellerId: { in: sellerIds },
          createdAt: { gte: startOfToday }
        }
      }) : 0;

      metaDiaria = sellers.reduce((sum, s) => sum + (s.contactsTarget || 10), 0) || 10;
      metaMes = sellers.reduce((sum, s) => sum + (s.monthlyGoal || 0), 0) || 200000;
    }

    // 5. Histórico de Leads por Mês (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const leadsForChart = await prisma.lead.findMany({
      where: {
        ...leadWhere,
        OR: [
          { createdAt: { gte: sixMonthsAgo } },
          { updatedAt: { gte: sixMonthsAgo } }
        ]
      },
      select: {
        createdAt: true,
        status: true,
        updatedAt: true
      }
    });

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyData: { [key: string]: { mes: string; novos: number; vendidos: number; perdidos: number } } = {};
    const monthsArray: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = monthNames[d.getMonth()];
      monthlyData[key] = { mes: label, novos: 0, vendidos: 0, perdidos: 0 };
      monthsArray.push(key);
    }

    leadsForChart.forEach(lead => {
      const createdKey = `${lead.createdAt.getFullYear()}-${String(lead.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[createdKey]) {
        monthlyData[createdKey].novos += 1;
      }
      
      const updatedKey = `${lead.updatedAt.getFullYear()}-${String(lead.updatedAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[updatedKey]) {
        if (lead.status === 'vendido') {
          monthlyData[updatedKey].vendidos += 1;
        } else if (['perdido', 'contato_nao_atualizado'].includes(lead.status)) {
          monthlyData[updatedKey].perdidos += 1;
        }
      }
    });
    const leadsPorMes = monthsArray.map(key => monthlyData[key]);

    // 6. Motivos de Perda (agrupados de todas as interações)
    const lostInteractions = await prisma.interaction.findMany({
      where: {
        ...interactionWhere,
        result: {
          in: ['Muito caro', 'Não gostou da qualidade', 'Não tinha o produto desejado', 'Comprou do concorrente', 'Não respondeu', 'Não atendeu']
        }
      },
      select: {
        result: true
      }
    });

    const lossCounts: { [key: string]: number } = {
      'Muito caro': 0,
      'Não gostou da qualidade': 0,
      'Não tinha o produto desejado': 0,
      'Comprou do concorrente': 0,
      'Não respondeu': 0,
      'Não atendeu': 0,
    };

    lostInteractions.forEach(inter => {
      if (lossCounts[inter.result] !== undefined) {
        lossCounts[inter.result] += 1;
      }
    });

    const motivosPerda = Object.entries(lossCounts)
      .map(([motivo, quantidade]) => ({ motivo, quantidade }))
      .filter(item => item.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade);

    // 7. Desempenho dos Vendedores (Leaderboard - limitado aos vendedores da filial/empresa)
    const sellersList = await prisma.seller.findMany({
      where: sellerWhere,
      select: {
        id: true,
        name: true,
        branch: { select: { name: true } },
        monthlyGoal: true,
      }
    });

    const vendedoresPerformance = await Promise.all(
      sellersList.map(async (s) => {
        const salesSum = await prisma.lead.aggregate({
          where: {
            sellerId: s.id,
            status: 'vendido',
            updatedAt: { gte: startOfMonth }
          },
          _sum: {
            estimatedValue: true
          }
        });
        const salesValue = salesSum._sum.estimatedValue || 0;
        return {
          id: s.id,
          nome: s.name,
          filial: s.branch?.name || 'Sem Filial',
          vendas: salesValue,
          metaVendas: s.monthlyGoal > 0 ? s.monthlyGoal : 50000,
        };
      })
    );
    vendedoresPerformance.sort((a, b) => b.vendas - a.vendas);

    // 8. Últimas Vendas
    const ultimasVendasRaw = await prisma.lead.findMany({
      where: {
        ...leadWhere,
        status: 'vendido'
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        estimatedValue: true,
        paymentMode: true,
        updatedAt: true,
        seller: {
          select: {
            name: true
          }
        }
      }
    });
    const ultimasVendas = ultimasVendasRaw.map(l => ({
      id: l.id,
      leadNome: l.name,
      vendedorNome: l.seller?.name || 'Não atribuído',
      valor: l.estimatedValue || 0,
      formaPagamento: l.paymentMode || 'Não informada',
      data: l.updatedAt
    }));

    // 9. Alertas Comerciais
    // Leads sem responsável (filtrados pelo escopo do usuário)
    let unassignedWhere: any = {
      companyId,
      sellerId: null,
      status: { notIn: ['vendido', 'perdido', 'contato_nao_atualizado'] }
    };
    if (session.role === 'VENDEDOR' && userSeller) {
      unassignedWhere.branchId = userSeller.branchId;
    } else if (session.role === 'GERENTE') {
      const dbUser = await prisma.user.findUnique({ where: { id: session.id }, select: { branchId: true } });
      if (dbUser && dbUser.branchId) {
        unassignedWhere.branchId = dbUser.branchId;
      }
    }
    const leadsSemResponsavel = await prisma.lead.count({ where: unassignedWhere });

    // Leads parados segmentados por dias desde a última interação (ou data de criação do lead)
    const activeLeads = await prisma.lead.findMany({
      where: {
        ...leadWhere,
        status: { notIn: ['vendido', 'perdido', 'contato_nao_atualizado'] }
      },
      select: {
        id: true,
        createdAt: true,
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    });

    const now = new Date();
    let parados5Dias = 0;
    let parados10Dias = 0;
    let parados15Dias = 0;
    let parados20Dias = 0;
    let parados25Dias = 0;

    activeLeads.forEach(lead => {
      const lastActivityDate = lead.interactions[0]?.createdAt || lead.createdAt;
      const diffTime = Math.abs(now.getTime() - lastActivityDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 25) {
        parados25Dias++;
      } else if (diffDays >= 20) {
        parados20Dias++;
      } else if (diffDays >= 15) {
        parados15Dias++;
      } else if (diffDays >= 10) {
        parados10Dias++;
      } else if (diffDays >= 5) {
        parados5Dias++;
      }
    });

    return NextResponse.json({
      kpis: {
        totalLeads,
        vendasMes,
        taxaConversao,
        contatosHoje,
        metaDiaria,
        metaMes
      },
      leadsPorMes,
      motivosPerda,
      vendedoresPerformance,
      ultimasVendas,
      alertas: {
        leadsSemResponsavel,
        parados5Dias,
        parados10Dias,
        parados15Dias,
        parados20Dias,
        parados25Dias,
        totalParados: parados5Dias + parados10Dias + parados15Dias + parados20Dias + parados25Dias
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
