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
  source: z.string().optional().default('CSV'),
  cpf: z.string(),
  branchId: z.string().optional().nullable(),
}));

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'VENDEDOR') {
      return NextResponse.json({ error: 'Vendedores não têm permissão para importar listas de leads.' }, { status: 403 });
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

        if (!lead.cpf) {
          throw new Error(`O lead "${lead.name}" não possui um CPF preenchido.`);
        }
        const cleanedCpf = lead.cpf.replace(/\D/g, '');
        if (cleanedCpf.length !== 11) {
          throw new Error(`O CPF "${lead.cpf}" do lead "${lead.name}" é inválido (deve conter 11 dígitos).`);
        }

        // Resolve branchId (pode vir como UUID ou como Nome da filial, ex: "VN")
        let finalBranchId: string | null = null;
        if (lead.branchId) {
          const trimmedBranch = lead.branchId.trim();
          if (trimmedBranch) {
            // 1. Tenta buscar por ID (UUID)
            const branchById = await tx.branch.findFirst({
              where: {
                id: trimmedBranch,
                companyId: companyId
              }
            });
            if (branchById) {
              finalBranchId = branchById.id;
            } else {
              // 2. Tenta buscar por Nome (ex: "VN")
              const branchByName = await tx.branch.findFirst({
                where: {
                  name: {
                    equals: trimmedBranch,
                    mode: 'insensitive'
                  },
                  companyId: companyId
                }
              });
              if (branchByName) {
                finalBranchId = branchByName.id;
              } else {
                throw new Error(`A filial "${trimmedBranch}" não foi encontrada no sistema.`);
              }
            }
          }
        }

        // Upsert baseado em Telefone OU CPF para ignorar/atualizar duplicatas
        const existing = await tx.lead.findFirst({
          where: {
            OR: [
              { phone: cleanedPhone },
              { cpf: cleanedCpf }
            ],
            companyId: companyId
          }
        });
        
        if (existing) {
          // Atualiza dados
          await tx.lead.update({
            where: { id: existing.id },
            data: {
              name: lead.name,
              phone: cleanedPhone,
              city: lead.city || existing.city,
              state: lead.state || existing.state,
              estimatedValue: lead.estimatedValue || existing.estimatedValue,
              cpf: cleanedCpf,
              branchId: lead.branchId ? finalBranchId : existing.branchId
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
              cpf: cleanedCpf,
              branchId: finalBranchId,
              companyId: companyId
            }
          });
          imported++;
        }
      }
    });

    return NextResponse.json({ message: `Sucesso. Importados: ${imported}, Atualizados: ${updated}` });
  } catch (error: any) {
    console.error('Error importing leads:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
