import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: session.id },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Perfil de vendedor não encontrado' }, { status: 404 });
    }

    return NextResponse.json(seller);
  } catch (error) {
    console.error('Error fetching current seller:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
