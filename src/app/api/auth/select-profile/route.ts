import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { userId, tempToken } = await request.json();

    if (!userId || !tempToken) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes.' }, { status: 400 });
    }

    // Decifra o token temporário
    let payload;
    try {
      payload = await decrypt(tempToken);
    } catch (e) {
      return NextResponse.json({ error: 'Token temporário inválido ou expirado.' }, { status: 401 });
    }

    if (!payload || !payload.isTemp || !payload.userIds || !payload.userIds.includes(userId)) {
      return NextResponse.json({ error: 'Acesso não autorizado para o perfil selecionado.' }, { status: 403 });
    }

    // Busca o usuário selecionado no Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    if (user.company && user.company.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Conta suspensa. Entre em contato com o suporte.' }, { status: 403 });
    }

    // Cria a sessão definitiva de 2 horas
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const session = await encrypt({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      expires
    });

    // Define o cookie definitivo
    (await cookies()).set('session', session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId
    });

  } catch (error) {
    console.error('Error selecting profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
