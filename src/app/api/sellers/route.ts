import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SellerSchema = z.object({
  name: z.string().min(2),
  region: z.string(),
  monthlyGoal: z.number().optional().default(0),
  contactsTarget: z.number().optional().default(10),
});

export async function GET() {
  try {
    const sellers = await prisma.seller.findMany({
      orderBy: { salesCount: 'desc' },
      include: {
        _count: {
          select: { leads: true, visits: true }
        }
      }
    });

    return NextResponse.json(sellers);
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = SellerSchema.parse(body);

    const newSeller = await prisma.seller.create({
      data: {
        name: data.name,
        region: data.region,
        monthlyGoal: data.monthlyGoal,
        contactsTarget: data.contactsTarget,
        salesCount: 0,
        conversionRate: 0,
        activeLeads: 0,
        contactsToday: 0,
      }
    });

    return NextResponse.json(newSeller, { status: 201 });
  } catch (error) {
    console.error('Error creating seller:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
