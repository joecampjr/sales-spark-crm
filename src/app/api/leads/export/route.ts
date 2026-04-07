import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

export async function GET(request: Request) {
  try {
    const leads = await prisma.lead.findMany({
      include: { seller: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Flatten data for CSV
    const csvData = leads.map(l => ({
      Nome: l.name,
      Telefone: l.phone,
      Cidade: l.city,
      Estado: l.state,
      Status: l.status,
      Prioridade: l.priority,
      'Valor Estimado': l.estimatedValue || 0,
      Origem: l.source,
      Vendedor: l.seller?.name || 'Sem responsável',
      'Data de Entrada': l.createdAt.toISOString().split('T')[0]
    }));

    const csv = Papa.unparse(csvData);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=leads.csv',
      },
    });
  } catch (error) {
    console.error('Error exporting leads:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
