import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
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
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = session.companyId || null;
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
        
        // Remove formatação do telefone para consistência no banco e na busca
        const cleanedPhone = lead.phone.replace(/\D/g, '');
        if (!cleanedPhone) continue;

        const existing = await tx.lead.findFirst({
          where: {
            phone: cleanedPhone,
            companyId: companyId
          }
        });
        
        if (existing) {
          // Atualiza dados
          await tx.lead.update({
            where: { id: existing.id },
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
              phone: cleanedPhone,
              city: lead.city,
              state: lead.state,
              status: lead.status,
              priority: lead.priority,
              estimatedValue: lead.estimatedValue,
              source: lead.source,
              companyId: companyId
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
