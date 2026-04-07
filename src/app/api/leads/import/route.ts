import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ImportSchema = z.array(z.object({
  name: z.string(),
  phone: z.string(),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  status: z.string().optional().default('novo'),
  priority: z.string().optional().default('media'),
  estimatedValue: z.number().optional().nullable(),
  source: z.string().optional().default('CSV')
}));

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const leads = ImportSchema.parse(body);

    if (leads.length === 0) {
      return NextResponse.json({ message: 'Nenhum lead encontrado' }, { status: 400 });
    }

    // Upsert para ignorar duplicatas baseado no telefone
    let imported = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const lead of leads) {
        if (!lead.phone) continue; // Exige telefone
        
        const existing = await tx.lead.findUnique({ where: { phone: lead.phone } });
        
        if (existing) {
          // Atualiza dados
          await tx.lead.update({
            where: { phone: lead.phone },
            data: {
              name: lead.name,
              city: lead.city || existing.city,
              state: lead.state || existing.state,
              estimatedValue: lead.estimatedValue || existing.estimatedValue
            }
          });
          updated++;
        } else {
          await tx.lead.create({
            data: {
              name: lead.name,
              phone: lead.phone,
              city: lead.city,
              state: lead.state,
              status: lead.status,
              priority: lead.priority,
              estimatedValue: lead.estimatedValue,
              source: lead.source
            }
          });
          imported++;
        }
      }
    });

    return NextResponse.json({ message: `Sucesso. Importados: ${imported}, Atualizados: ${updated}` });
  } catch (error) {
    console.error('Error importing leads:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
