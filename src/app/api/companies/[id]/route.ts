import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.company.update({
      where: { id },
      data: {
        status: body.status,
        suspendedAt: body.status === 'SUSPENDED' ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
