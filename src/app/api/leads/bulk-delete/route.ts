import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'VENDEDOR') {
      return NextResponse.json({ error: 'Vendedores não têm permissão para excluir leads.' }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = BulkDeleteSchema.parse(body);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead informado' }, { status: 400 });
    }

    const whereClause: any = {
      id: { in: ids }
    };
    
    if (session.companyId) {
      whereClause.companyId = session.companyId;
    }

    const deleted = await prisma.lead.deleteMany({
      where: whereClause,
    });

    return NextResponse.json({ 
      message: `${deleted.count} leads deletados com sucesso`,
      count: deleted.count 
    });
  } catch (error) {
    console.error('Error bulk deleting leads:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Erro de validação', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
