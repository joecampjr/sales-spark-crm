import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterBranchId = searchParams.get('branchId');
    const filterSellerId = searchParams.get('sellerId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month'; // 'day', 'month', 'year'

    const companyId = session.companyId;

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

    // Base conditions
    const leadWhere: any = { companyId };
    const salesWhere: any = { companyId, status: 'vendido' };
    const sellerWhere: any = { companyId };
    const interactionWhere: any = { companyId };

    if (startDate || endDate) {
      leadWhere.createdAt = {};
      if (startDate) leadWhere.createdAt.gte = startDate;
      if (endDate) leadWhere.createdAt.lte = endDate;

      salesWhere.updatedAt = {};
      if (startDate) salesWhere.updatedAt.gte = startDate;
      if (endDate) salesWhere.updatedAt.lte = endDate;

      interactionWhere.createdAt = {};
      if (startDate) interactionWhere.createdAt.gte = startDate;
      if (endDate) interactionWhere.createdAt.lte = endDate;
    }

    let userSeller: any = null;

    if (session.role === 'VENDEDOR') {
      userSeller = await prisma.seller.findUnique({
        where: { userId: session.id }
      });
      if (userSeller) {
        // Vendedor só vê os seus próprios leads e interações
        leadWhere.sellerId = userSeller.id;
        salesWhere.sellerId = userSeller.id;
        interactionWhere.sellerId = userSeller.id;
        sellerWhere.id = userSeller.id;
      } else {
        leadWhere.id = 'non-existent-lead-id';
        salesWhere.id = 'non-existent-lead-id';
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
        salesWhere.branchId = dbUser.branchId;
        sellerWhere.branchId = dbUser.branchId;
        interactionWhere.seller = { branchId: dbUser.branchId };

        // Managers can filter by seller within their branch
        if (filterSellerId && filterSellerId !== 'todos') {
          leadWhere.sellerId = filterSellerId;
          salesWhere.sellerId = filterSellerId;
          interactionWhere.sellerId = filterSellerId;
        }
      } else {
        leadWhere.branchId = 'non-existent-branch-id';
        salesWhere.branchId = 'non-existent-branch-id';
        sellerWhere.branchId = 'non-existent-branch-id';
        interactionWhere.id = 'non-existent-interaction-id';
      }
    } else {
      // Supervisors, Admins, Superadmins
      if (filterBranchId && filterBranchId !== 'todos') {
        const bId = filterBranchId === 'sem_filial' ? null : filterBranchId;
        leadWhere.branchId = bId;
        salesWhere.branchId = bId;
        sellerWhere.branchId = bId;
        interactionWhere.seller = { branchId: bId };
      }
      if (filterSellerId && filterSellerId !== 'todos') {
        leadWhere.sellerId = filterSellerId;
        salesWhere.sellerId = filterSellerId;
        interactionWhere.sellerId = filterSellerId;
      }
    }

    // 1. Total de Leads
    const totalLeads = await prisma.lead.count({ where: leadWhere });

    // 2. Vendas do Período (soma do estimatedValue dos leads vendidos)
    const salesSum = await prisma.lead.aggregate({
      where: salesWhere,
      _sum: {
        estimatedValue: true
      }
    });
    const vendasMes = salesSum._sum.estimatedValue || 0;

    // 3. Contatos Realizados & Metas Dinâmicas
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let contatosHoje = 0;
    let metaDiaria = 10;
    let metaMes = 100000;

    const finalizedResults = [
      'Vendido / Sucesso',
      'Contato não atualizado',
      'Muito caro',
      'Não gostou da qualidade',
      'Não tinha o produto desejado',
      'Comprou do concorrente',
      'Não respondeu',
      'Não atendeu'
    ];

    let numDays = 1;
    if (startDate && endDate) {
      const diffTime = endDate.getTime() - startDate.getTime();
      numDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    if (session.role === 'VENDEDOR') {
      contatosHoje = userSeller ? await prisma.interaction.count({
        where: {
          sellerId: userSeller.id,
          result: { in: finalizedResults },
          createdAt: {
            gte: startDate || startOfToday,
            ...(endDate ? { lte: endDate } : {})
          }
        }
      }) : 0;
      metaDiaria = (userSeller?.contactsTarget || 10) * numDays;
      metaMes = userSeller?.monthlyGoal || 50000;
    } else {
      const sellers = await prisma.seller.findMany({
        where: sellerWhere,
        select: { id: true, contactsTarget: true, monthlyGoal: true }
      });
      const sellerIds = sellers.map(s => s.id);
      
      contatosHoje = sellerIds.length > 0 ? await prisma.interaction.count({
        where: {
          sellerId: { in: sellerIds },
          result: { in: finalizedResults },
          createdAt: {
            gte: startDate || startOfToday,
            ...(endDate ? { lte: endDate } : {})
          }
        }
      }) : 0;

      metaDiaria = (sellers.reduce((sum, s) => sum + (s.contactsTarget || 10), 0) || 10) * numDays;
      metaMes = sellers.reduce((sum, s) => sum + (s.monthlyGoal || 0), 0) || 200000;
    }

    // 4. Vendas do Período (Quantidade)
    const vendidosLeads = await prisma.lead.count({
      where: salesWhere
    });

    // 5. Taxa de Conversão (Vendas / Contatos finalizados)
    const taxaConversao = contatosHoje > 0 ? Number(Math.min(100, (vendidosLeads / contatosHoje) * 100).toFixed(1)) : 0;

    // 5. Histórico e Evolução de Leads (Dinâmico por Dia, Mês ou Ano)
    let chartStartDate = startDate;
    let chartEndDate = endDate;

    if (!chartStartDate || !chartEndDate) {
      const now = new Date();
      if (groupBy === 'day') {
        chartStartDate = new Date();
        chartStartDate.setDate(now.getDate() - 29); // 30 dias incluindo hoje
        chartStartDate.setHours(0, 0, 0, 0);
        chartEndDate = new Date();
        chartEndDate.setHours(23, 59, 59, 999);
      } else if (groupBy === 'year') {
        chartStartDate = new Date();
        chartStartDate.setFullYear(now.getFullYear() - 4); // Últimos 5 anos
        chartStartDate.setMonth(0);
        chartStartDate.setDate(1);
        chartStartDate.setHours(0, 0, 0, 0);
        chartEndDate = new Date();
        chartEndDate.setHours(23, 59, 59, 999);
      } else {
        // default: 'month'
        chartStartDate = new Date();
        chartStartDate.setMonth(now.getMonth() - 5); // 6 meses
        chartStartDate.setDate(1);
        chartStartDate.setHours(0, 0, 0, 0);
        chartEndDate = new Date();
        chartEndDate.setHours(23, 59, 59, 999);
      }
    }

    // Buscar leads e vendas nesse intervalo de tempo
    const leadsForChart = await prisma.lead.findMany({
      where: {
        companyId,
        ...(leadWhere.sellerId ? { sellerId: leadWhere.sellerId } : {}),
        ...(leadWhere.branchId ? { branchId: leadWhere.branchId } : {}),
        createdAt: { gte: chartStartDate, lte: chartEndDate }
      },
      select: {
        createdAt: true
      }
    });

    const salesForChart = await prisma.lead.findMany({
      where: {
        companyId,
        status: 'vendido',
        ...(leadWhere.sellerId ? { sellerId: leadWhere.sellerId } : {}),
        ...(leadWhere.branchId ? { branchId: leadWhere.branchId } : {}),
        updatedAt: { gte: chartStartDate, lte: chartEndDate }
      },
      select: {
        updatedAt: true
      }
    });

    const lostForChart = await prisma.lead.findMany({
      where: {
        companyId,
        status: { in: ['perdido', 'contato_nao_atualizado'] },
        ...(leadWhere.sellerId ? { sellerId: leadWhere.sellerId } : {}),
        ...(leadWhere.branchId ? { branchId: leadWhere.branchId } : {}),
        updatedAt: { gte: chartStartDate, lte: chartEndDate }
      },
      select: {
        updatedAt: true
      }
    });

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const timelineData: { [key: string]: { mes: string; novos: number; vendidos: number; perdidos: number } } = {};
    const timelineKeys: string[] = [];

    let currentIter = new Date(chartStartDate);
    while (currentIter <= chartEndDate) {
      let key = '';
      let label = '';

      if (groupBy === 'day') {
        key = `${currentIter.getFullYear()}-${String(currentIter.getMonth() + 1).padStart(2, '0')}-${String(currentIter.getDate()).padStart(2, '0')}`;
        label = `${currentIter.getDate()}/${monthNames[currentIter.getMonth()]}`;
        currentIter.setDate(currentIter.getDate() + 1);
      } else if (groupBy === 'year') {
        key = `${currentIter.getFullYear()}`;
        label = key;
        currentIter.setFullYear(currentIter.getFullYear() + 1);
      } else {
        // default: 'month'
        key = `${currentIter.getFullYear()}-${String(currentIter.getMonth() + 1).padStart(2, '0')}`;
        label = `${monthNames[currentIter.getMonth()]}/${String(currentIter.getFullYear()).slice(-2)}`;
        currentIter.setMonth(currentIter.getMonth() + 1);
      }

      if (!timelineData[key]) {
        timelineData[key] = { mes: label, novos: 0, vendidos: 0, perdidos: 0 };
        timelineKeys.push(key);
      }
      
      // Proteção de loop infinito
      if (timelineKeys.length > 400) break;
    }

    leadsForChart.forEach(lead => {
      let key = '';
      const date = lead.createdAt;
      if (groupBy === 'day') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else if (groupBy === 'year') {
        key = `${date.getFullYear()}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      if (timelineData[key]) {
        timelineData[key].novos += 1;
      }
    });

    salesForChart.forEach(lead => {
      let key = '';
      const date = lead.updatedAt;
      if (groupBy === 'day') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else if (groupBy === 'year') {
        key = `${date.getFullYear()}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      if (timelineData[key]) {
        timelineData[key].vendidos += 1;
      }
    });

    lostForChart.forEach(lead => {
      let key = '';
      const date = lead.updatedAt;
      if (groupBy === 'day') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else if (groupBy === 'year') {
        key = `${date.getFullYear()}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      if (timelineData[key]) {
        timelineData[key].perdidos += 1;
      }
    });

    const leadsPorMes = timelineKeys.map(key => timelineData[key]);

    // 6. Motivos de Perda
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

    // 7. Desempenho dos Vendedores (Leaderboard)
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
            updatedAt: {
              gte: startDate || startOfToday,
              ...(endDate ? { lte: endDate } : {})
            }
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
      where: salesWhere,
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
      redirectParams: {
        startDateParam,
        endDateParam,
        filterBranchId,
        filterSellerId
      },
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
