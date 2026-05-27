import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { targetUserId } = await request.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId é obrigatório.' }, { status: 400 });
    }

    // Busca o usuário logado atualmente para obter seu CPF
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id }
    });

    if (!currentUser || !currentUser.cpf) {
      return NextResponse.json({ error: 'Usuário atual inválido ou sem CPF cadastrado.' }, { status: 403 });
    }

    // Busca o usuário de destino
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { company: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Perfil de destino não encontrado.' }, { status: 404 });
    }

    // Valida se o perfil de destino pertence ao mesmo CPF
    if (targetUser.cpf !== currentUser.cpf) {
      return NextResponse.json({ error: 'Não autorizado. CPF de destino não coincide.' }, { status: 403 });
    }

    if (targetUser.company && targetUser.company.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Empresa do perfil selecionado suspensa.' }, { status: 403 });
    }

    // Cria a sessão definitiva de 2 horas para o novo perfil
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const newSession = await encrypt({
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      companyId: targetUser.companyId,
      expires
    });

    // Atualiza o cookie de login
    (await cookies()).set('session', newSession, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        companyId: targetUser.companyId
      }
    });

  } catch (error) {
    console.error('Error switching profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
