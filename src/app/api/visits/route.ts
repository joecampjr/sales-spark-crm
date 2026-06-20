import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const VisitSchema = z.object({
  leadId: z.string(),
  sellerId: z.string(),
  address: z.string(),
  visitDate: z.string(),
  status: z.string(),
  notes: z.string().optional(),
  result: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {};
    if (session.companyId) {
      where.companyId = session.companyId;
    }

    // Restrições de Visibilidade baseadas em Função (Filial e Vendedor)
    if (session.role === 'VENDEDOR') {
      const userSeller = await prisma.seller.findUnique({
        where: { userId: session.id }
      });
      if (userSeller) {
        where.sellerId = userSeller.id;
      } else {
        where.sellerId = 'non-existent-seller-id';
      }
    } else if (session.role === 'GERENTE') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { branchId: true }
      });
      if (dbUser && dbUser.branchId) {
        where.seller = {
          branchId: dbUser.branchId
        };
      } else {
        where.seller = {
          branchId: 'non-existent-branch-id'
        };
      }
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        lead: { select: { name: true } },
        seller: { select: { name: true } }
      },
      orderBy: { visitDate: 'asc' }
    });
    return NextResponse.json(visits);
  } catch (error) {
    console.error('Error fetching visits:', error);
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
    const data = VisitSchema.parse(body);

    if (session.role === 'GERENTE') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { branchId: true }
      });
      if (!dbUser || !dbUser.branchId) {
        return NextResponse.json({ error: 'Não autorizado. Gerente sem filial vinculada.' }, { status: 403 });
      }

      // Validar vendedor
      const targetSeller = await prisma.seller.findUnique({
        where: { id: data.sellerId }
      });
      if (!targetSeller || targetSeller.branchId !== dbUser.branchId) {
        return NextResponse.json({ error: 'Não autorizado. O gerente só pode agendar visitas para vendedores da sua própria filial.' }, { status: 403 });
      }

      // Validar lead
      const targetLead = await prisma.lead.findUnique({
        where: { id: data.leadId }
      });
      if (!targetLead || targetLead.branchId !== dbUser.branchId) {
        return NextResponse.json({ error: 'Não autorizado. O gerente só pode agendar visitas para leads da sua própria filial.' }, { status: 403 });
      }
    }

    const newVisit = await prisma.visit.create({
      data: {
        leadId: data.leadId,
        sellerId: data.sellerId,
        address: data.address,
        visitDate: new Date(data.visitDate),
        status: data.status,
        notes: data.notes,
        result: data.result,
        companyId: session.companyId || null,
      }
    });

    return NextResponse.json(newVisit, { status: 201 });
  } catch (error) {
    console.error('Error creating visit:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
