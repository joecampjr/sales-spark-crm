import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Lógica de seed automática para o primeiro Admin
    const userCount = await prisma.user.count();
    if (userCount === 0 && email === 'admin@admin.com') {
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
          password: hashedPassword,
          role: 'SUPERADMIN',
          companyId: defaultCompany.id
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

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
