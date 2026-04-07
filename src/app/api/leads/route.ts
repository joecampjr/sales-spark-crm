import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'todos';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (statusFilter && statusFilter !== 'todos') {
      where.status = statusFilter;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        seller: { select: { name: true } }
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
    const body = await request.json();
    const data = CreateLeadSchema.parse(body);

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
        sellerId: data.sellerId || null,
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
