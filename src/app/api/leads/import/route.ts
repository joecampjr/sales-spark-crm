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
  cpf: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  sellerId: z.string().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  downPayment: z.number().optional().nullable(),
  saleType: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  avgDelayDays: z.number().optional().nullable(),
  route: z.string().optional().nullable(),
  lastPurchaseDate: z.string().optional().nullable(),
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

    // 1. Pre-fetch reference data (branches and sellers)
    const branches = await prisma.branch.findMany({
      where: companyId ? { companyId } : {}
    });

    const sellers = await prisma.seller.findMany({
      where: companyId ? { companyId } : {}
    });

    // 2. Pre-fetch existing leads based on phone numbers and CPFs to minimize DB queries
    const phoneNumbers = leads
      .map(l => l.phone ? l.phone.replace(/\D/g, '') : '')
      .filter(Boolean);
    const cpfs = leads
      .map(l => l.cpf ? l.cpf.replace(/\D/g, '') : '')
      .filter(Boolean);

    const existingLeads = await prisma.lead.findMany({
      where: {
        companyId,
        OR: [
          { phone: { in: phoneNumbers } },
          { cpf: { in: cpfs } }
        ]
      }
    });

    let imported = 0;
    let updated = 0;

    // Use a higher timeout of 60 seconds for larger import files
    await prisma.$transaction(async (tx) => {
      for (const lead of leads) {
        if (!lead.phone) continue; // Exige telefone
        
        // Remove formatação do telefone para consistência no banco e na busca
        const cleanedPhone = lead.phone.replace(/\D/g, '');
        if (!cleanedPhone) continue;
        let cleanedCpf: string | null = null;
        if (lead.cpf) {
          const rawCpf = lead.cpf.replace(/\D/g, '');
          if (rawCpf) {
            if (rawCpf.length !== 11 && rawCpf.length !== 14) {
              throw new Error(`O CPF/CNPJ "${lead.cpf}" do lead "${lead.name}" é inválido (deve conter 11 dígitos para CPF ou 14 dígitos para CNPJ).`);
            }
            cleanedCpf = rawCpf;
          }
        }
        // Resolve branchId in-memory (pode vir como UUID ou como Nome da filial, ex: "VN")
        let finalBranchId: string | null = null;
        if (lead.branchId) {
          const trimmedBranch = lead.branchId.trim();
          if (trimmedBranch) {
            const foundBranch = branches.find(b => 
              b.id === trimmedBranch || 
              b.name.toLowerCase() === trimmedBranch.toLowerCase()
            );
            if (foundBranch) {
              finalBranchId = foundBranch.id;
            } else {
              throw new Error(`A filial "${trimmedBranch}" não foi encontrada no sistema.`);
            }
          }
        }

        // Resolve sellerId in-memory (pode vir como UUID ou como Nome do vendedor)
        let finalSellerId: string | null = null;
        if (lead.sellerId) {
          const trimmedSeller = lead.sellerId.trim();
          if (trimmedSeller) {
            const foundSeller = sellers.find(s => 
              s.id === trimmedSeller || 
              s.name.toLowerCase() === trimmedSeller.toLowerCase()
            );
            if (foundSeller) {
              finalSellerId = foundSeller.id;
            } else {
              throw new Error(`O vendedor "${trimmedSeller}" não foi encontrado no sistema.`);
            }
          }
        }

        // Find existing lead in-memory (based on Phone or CPF)
        const existingIndex = existingLeads.findIndex(el => 
          el.phone === cleanedPhone || 
          (cleanedCpf !== null && el.cpf === cleanedCpf)
        );
        const existing = existingIndex !== -1 ? existingLeads[existingIndex] : null;
        
        let cleanedBirthday: string | null = null;
        if (lead.birthday) {
          const bMatch = lead.birthday.match(/^(\d{1,2})\/(\d{1,2})/);
          if (bMatch) {
            const day = bMatch[1].padStart(2, '0');
            const month = bMatch[2].padStart(2, '0');
            const dayNum = parseInt(day);
            const monthNum = parseInt(month);
            if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
              cleanedBirthday = `${day}/${month}`;
            }
          }
        }

        let finalLastPurchaseDate: Date | null = null;
        if (lead.lastPurchaseDate) {
          const trimmedDate = lead.lastPurchaseDate.trim();
          // Check for DD/MM/YYYY format
          const dmyMatch = trimmedDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
          if (dmyMatch) {
            const day = parseInt(dmyMatch[1]);
            const month = parseInt(dmyMatch[2]) - 1; // JS months are 0-11
            const year = parseInt(dmyMatch[3]);
            const parsedDate = new Date(year, month, day);
            if (!isNaN(parsedDate.getTime())) {
              finalLastPurchaseDate = parsedDate;
            }
          } else {
            const parsedDate = new Date(trimmedDate);
            if (!isNaN(parsedDate.getTime())) {
              finalLastPurchaseDate = parsedDate;
            }
          }
        }

        if (existing) {
          // Atualiza dados
          const updatedLead = await tx.lead.update({
            where: { id: existing.id },
            data: {
              name: lead.name,
              phone: cleanedPhone,
              city: lead.city || existing.city,
              state: lead.state || existing.state,
              estimatedValue: lead.estimatedValue || existing.estimatedValue,
              status: lead.status || existing.status,
              cpf: cleanedCpf,
              branchId: lead.branchId ? finalBranchId : existing.branchId,
              sellerId: lead.sellerId ? finalSellerId : existing.sellerId,
              paymentMode: lead.paymentMode || existing.paymentMode,
              downPayment: lead.downPayment || existing.downPayment,
              saleType: lead.saleType || existing.saleType,
              birthday: cleanedBirthday || existing.birthday,
              avgDelayDays: lead.avgDelayDays || existing.avgDelayDays,
              route: lead.route || existing.route,
              lastPurchaseDate: finalLastPurchaseDate !== null ? finalLastPurchaseDate : existing.lastPurchaseDate,
            }
          });
          
          // Mapeia atualização no cache em memória para evitar falsos positivos
          existingLeads[existingIndex] = updatedLead;
          updated++;
        } else {
          const newLead = await tx.lead.create({
            data: {
              name: lead.name,
              phone: cleanedPhone,
              city: lead.city,
              state: lead.state,
              status: lead.status || 'novo',
              priority: lead.priority,
              estimatedValue: lead.estimatedValue,
              source: lead.source,
              cpf: cleanedCpf,
              branchId: finalBranchId,
              sellerId: finalSellerId,
              companyId: companyId,
              paymentMode: lead.paymentMode,
              downPayment: lead.downPayment,
              saleType: lead.saleType,
              birthday: cleanedBirthday,
              avgDelayDays: lead.avgDelayDays,
              route: lead.route || null,
              lastPurchaseDate: finalLastPurchaseDate,
            }
          });

          // Adiciona ao cache em memória para caso o CSV tenha múltiplos do mesmo lead
          existingLeads.push(newLead);
          imported++;
        }
      }
    }, {
      maxWait: 10000,
      timeout: 60000
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
