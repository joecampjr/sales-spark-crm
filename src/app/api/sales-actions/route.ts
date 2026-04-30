import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SalesActionSchema = z.object({
  title: z.string().min(3),
  region: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  salesTarget: z.number(),
  observations: z.string().optional(),
  staffCount: z.number(),
  staffIds: z.array(z.string()),
  leadIds: z.array(z.string()),
  createdById: z.string(),
});

export async function GET() {
  try {
    const actions = await prisma.salesAction.findMany({
      include: {
        staff: { include: { seller: true } },
        targetLeads: { include: { lead: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(actions);
  } catch (error) {
    console.error('Error fetching sales actions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = SalesActionSchema.parse(body);

    const newAction = await prisma.salesAction.create({
      data: {
        title: data.title,
        region: data.region,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        salesTarget: data.salesTarget,
        status: 'aguardando_autorizacao',
        observations: data.observations,
        staffCount: data.staffCount,
        createdById: data.createdById,
        staff: {
          create: data.staffIds.map(id => ({ sellerId: id }))
        },
        targetLeads: {
          create: data.leadIds.map(id => ({ leadId: id }))
        }
      }
    });

    return NextResponse.json(newAction, { status: 201 });
  } catch (error) {
    console.error('Error creating sales action:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
