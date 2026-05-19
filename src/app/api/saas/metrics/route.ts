import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const totalCompanies = await prisma.company.count();
    const activeCompanies = await prisma.company.count({
      where: { status: 'ACTIVE' }
    });
    const suspendedCompanies = await prisma.company.count({
      where: { status: 'SUSPENDED' }
    });

    const totalUsers = await prisma.user.count();
    const totalLeads = await prisma.lead.count();
    const totalSellers = await prisma.seller.count();

    // Calcular MRR simulado (Ex: R$ 499,00 por empresa ativa)
    const mrr = activeCompanies * 499;

    // Histórico de novos tenants (mensal) - últimos 6 meses para o gráfico
    const chartData = [
      { mes: 'Dez', empresas: Math.max(0, activeCompanies - 5), mrr: Math.max(0, activeCompanies - 5) * 499 },
      { mes: 'Jan', empresas: Math.max(0, activeCompanies - 4), mrr: Math.max(0, activeCompanies - 4) * 499 },
      { mes: 'Fev', empresas: Math.max(0, activeCompanies - 3), mrr: Math.max(0, activeCompanies - 3) * 499 },
      { mes: 'Mar', empresas: Math.max(0, activeCompanies - 2), mrr: Math.max(0, activeCompanies - 2) * 499 },
      { mes: 'Abr', empresas: Math.max(0, activeCompanies - 1), mrr: Math.max(0, activeCompanies - 1) * 499 },
      { mes: 'Mai', empresas: activeCompanies, mrr: mrr }
    ];

    // Distribuição de usuários por empresa
    const usersByCompanyRaw = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      take: 5
    });

    const usersByCompany = usersByCompanyRaw.map(c => ({
      name: c.name,
      value: c._count.users
    }));

    return NextResponse.json({
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalUsers,
      totalLeads,
      totalSellers,
      mrr,
      chartData,
      usersByCompany
    });
  } catch (error) {
    console.error('Error fetching SaaS metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
