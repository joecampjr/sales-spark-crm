import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        role: true,
        companyId: true,
        branchId: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching global users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, companyId, branchId, cpf } = body;

    if (!name || !password || !role || !cpf) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    // Verificar se e-mail já existe
    if (email) {
      const existing = await prisma.user.findUnique({
        where: { email }
      });

      if (existing) {
        return NextResponse.json({ error: 'Este e-mail já está sendo utilizado.' }, { status: 400 });
      }
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email || null,
        cpf: cpf.replace(/\D/g, ''),
        password: hashedPassword,
        role,
        companyId: companyId || null,
        branchId: branchId || null
      }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating global user:', error);
    return NextResponse.json({ error: 'Erro ao criar usuário na plataforma.' }, { status: 500 });
  }
}
