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

    const billingData = companies.map((c) => {
      // Default dinâmico caso os campos recém-criados estejam nulos no banco
      const planName = c.planName || 'Plano Premium';
      const planValue = c.planValue !== null && c.planValue !== undefined ? c.planValue : 499.00;
      const paymentStatus = c.paymentStatus || (c.status === 'SUSPENDED' ? 'OVERDUE' : 'PAID');
      
      let nextDueDate = c.nextDueDate;
      if (!nextDueDate) {
        const nextDue = new Date();
        nextDue.setDate(10);
        nextDue.setMonth(nextDue.getMonth() + 1);
        nextDueDate = nextDue;
      }

      return {
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        status: c.status,
        plan: planName,
        value: planValue,
        paymentStatus,
        nextDueDate: nextDueDate.toISOString(),
        usersCount: c._count.users
      };
    });

    return NextResponse.json(billingData);
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
