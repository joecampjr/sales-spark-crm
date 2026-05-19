import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Enriquecer dados de empresa com faturamento simulado/determinístico baseado no ID
    const billingData = companies.map((c, index) => {
      // Determinando dados financeiros fixos para os mesmos IDs
      const value = c.status === 'ACTIVE' ? 499.00 : 0.00;
      const plan = index % 2 === 0 ? 'Plano Premium' : 'Plano Standard';
      
      // Criar status de pagamento determinístico
      let paymentStatus = 'PAID';
      if (c.status === 'SUSPENDED') {
        paymentStatus = 'OVERDUE';
      } else if (index === 1) {
        paymentStatus = 'PENDING';
      }

      // Vencimento determinístico (ex: dia 10 do próximo mês)
      const nextDue = new Date();
      nextDue.setDate(10);
      nextDue.setMonth(nextDue.getMonth() + 1);

      return {
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        status: c.status,
        plan,
        value,
        paymentStatus,
        nextDueDate: nextDue.toISOString(),
        usersCount: c._count.users
      };
    });

    return NextResponse.json(billingData);
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
