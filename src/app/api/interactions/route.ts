import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const InteractionSchema = z.object({
  leadId: z.string(),
  sellerId: z.string(),
  type: z.string(),
  result: z.string(),
  notes: z.string().optional(),
  scheduledFor: z.string().nullable().optional(), // ISO string
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    const where: any = {};
    if (session.companyId) where.companyId = session.companyId;
    if (leadId) where.leadId = leadId;

    const interactions = await prisma.interaction.findMany({
      where,
      include: {
        lead: { select: { name: true } },
        seller: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(interactions);
  } catch (error) {
    console.error('Error fetching interactions:', error);
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
    const data = InteractionSchema.parse(body);

    const newInteraction = await prisma.interaction.create({
      data: {
        leadId: data.leadId,
        sellerId: data.sellerId,
        type: data.type,
        result: data.result,
        notes: data.notes,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        companyId: session.companyId || null,
      }
    });

    return NextResponse.json(newInteraction, { status: 201 });
  } catch (error) {
    console.error('Error creating interaction:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
