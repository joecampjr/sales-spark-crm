import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sellers = await prisma.seller.findMany({
      orderBy: { salesCount: 'desc' },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    return NextResponse.json(sellers);
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
