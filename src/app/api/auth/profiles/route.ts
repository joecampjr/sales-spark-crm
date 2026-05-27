import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Busca o usuário logado para obter seu CPF
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id }
    });

    if (!currentUser || !currentUser.cpf) {
      return NextResponse.json({ profiles: [] });
    }

    // Busca todos os perfis com o mesmo CPF
    const profiles = await prisma.user.findMany({
      where: { cpf: currentUser.cpf },
      include: { company: true },
      orderBy: { role: 'asc' }
    });

    const profilesList = profiles.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      companyName: p.company?.name || 'Global (CoBusiness)'
    }));

    return NextResponse.json({ profiles: profilesList });

  } catch (error) {
    console.error('Error fetching associated profiles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
