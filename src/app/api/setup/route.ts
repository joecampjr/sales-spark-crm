import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Iniciando reset do banco de dados...');

    // 1. Limpeza em cascata respeitando a integridade referencial
    const deleteSalesActionLeads = prisma.salesActionLead.deleteMany({});
    const deleteSalesActionStaffs = prisma.salesActionStaff.deleteMany({});
    const deleteSalesActions = prisma.salesAction.deleteMany({});
    const deleteVisits = prisma.visit.deleteMany({});
    const deleteInteractions = prisma.interaction.deleteMany({});
    const deleteLeads = prisma.lead.deleteMany({});
    const deleteSellers = prisma.seller.deleteMany({});
    const deleteUsers = prisma.user.deleteMany({});
    const deleteBranches = prisma.branch.deleteMany({});
    const deleteCompanies = prisma.company.deleteMany({});

    // Executa a transação de exclusão de dados com integridade absoluta
    await prisma.$transaction([
      deleteSalesActionLeads,
      deleteSalesActionStaffs,
      deleteSalesActions,
      deleteVisits,
      deleteInteractions,
      deleteLeads,
      deleteSellers,
      deleteUsers,
      deleteBranches,
      deleteCompanies,
    ]);

    console.log('Banco de dados completamente zerado com sucesso.');

    // 2. Criação da estrutura de dados padrão
    const company = await prisma.company.create({
      data: {
        name: 'Sales Spark CRM',
        cnpj: '00000000000000',
        status: 'ACTIVE',
        planName: 'Plano Premium',
        planValue: 499.00,
        paymentStatus: 'PAID'
      }
    });

    const branch = await prisma.branch.create({
      data: {
        name: 'Matriz',
        city: 'Brasília',
        state: 'DF',
        companyId: company.id
      }
    });

    // 3. Criação do novo usuário Administrador Principal
    const hashedPassword = await bcrypt.hash('123456', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Administrador Principal',
        email: 'zeedfisica@gmail.com',
        cpf: '31020403810',
        password: hashedPassword,
        role: 'SUPERADMIN',
        companyId: company.id,
        branchId: branch.id
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Banco de dados zerado e Administrador Principal cadastrado com sucesso!', 
      data: {
        company: { id: company.id, name: company.name },
        branch: { id: branch.id, name: branch.name },
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          cpf: user.cpf, 
          role: user.role 
        }
      }
    });
  } catch (error: any) {
    console.error('Erro no setup/reset do banco de dados:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao zerar banco ou criar Administrador Principal',
      details: error.message || error
    }, { status: 500 });
  }
}

