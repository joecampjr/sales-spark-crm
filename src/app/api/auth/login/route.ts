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
      await prisma.user.create({
        data: {
          name: 'Administrador Spark',
          email: 'admin@admin.com',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Cria a sessão
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
    const session = await encrypt({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role,
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
      role: user.role 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
