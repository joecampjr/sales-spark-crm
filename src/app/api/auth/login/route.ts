import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { cpf, password } = await request.json();

    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';

    // Lógica de seed automática para o primeiro Admin via CPF
    const userCount = await prisma.user.count();
    if (userCount === 0 && cleanCpf === '00000000000') {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const defaultCompany = await prisma.company.create({
        data: {
          name: 'Empresa Principal',
          cnpj: '00000000000000',
          status: 'ACTIVE'
        }
      });

      await prisma.user.create({
        data: {
          name: 'Administrador Spark',
          email: 'admin@admin.com',
          cpf: '00000000000',
          password: hashedPassword,
          role: 'SUPERADMIN',
          companyId: defaultCompany.id
        }
      });
    }

    const users = await prisma.user.findMany({
      where: { cpf: cleanCpf },
      include: { company: true }
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Filtra os usuários que coincidem a senha informada
    const validUsers = [];
    for (const u of users) {
      const isMatch = await bcrypt.compare(password, u.password);
      if (isMatch) {
        validUsers.push(u);
      }
    }

    if (validUsers.length === 0) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Caso possua múltiplos perfis com a mesma senha e CPF
    if (validUsers.length > 1) {
      const tempToken = await encrypt({
        cpf: cleanCpf,
        userIds: validUsers.map(u => u.id),
        isTemp: true
      });

      const profiles = validUsers.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        companyName: u.company?.name || 'Global (CoBusiness)'
      }));

      return NextResponse.json({
        multipleProfiles: true,
        profiles,
        tempToken
      });
    }

    // Se possuir perfil único ativo
    const user = validUsers[0];

    if (user.company && user.company.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Conta suspensa. Entre em contato com o suporte.' }, { status: 403 });
    }

    // Cria a sessão
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
    const session = await encrypt({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role,
      companyId: user.companyId,
      expires 
    });

    // Define o cookie
    (await cookies()).set('session', session, { 
      expires, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({ 
      multipleProfiles: false,
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      companyId: user.companyId
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
