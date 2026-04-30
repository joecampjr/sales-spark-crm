import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const VisitSchema = z.object({
  leadId: z.string(),
  sellerId: z.string(),
  address: z.string(),
  visitDate: z.string(),
  status: z.string(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const visits = await prisma.visit.findMany({
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
    const body = await request.json();
    const data = VisitSchema.parse(body);

    const newVisit = await prisma.visit.create({
      data: {
        leadId: data.leadId,
        sellerId: data.sellerId,
        address: data.address,
        visitDate: new Date(data.visitDate),
        status: data.status,
        notes: data.notes,
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
