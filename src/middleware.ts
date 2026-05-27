import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || "fallback-secret-key-for-dev-only";
const key = new TextEncoder().encode(secretKey);

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Rotas públicas
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/select-profile') ||
    pathname.startsWith('/api/setup')
  ) {
    if (session) {
      try {
        await jwtVerify(session, key);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch (e) {
        // Token inválido, segue para login
      }
    }
    return NextResponse.next();
  }

  // Se não houver sessão, redireciona para login
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Valida o token
    const { payload } = await jwtVerify(session, key);
    const role = payload.role as string;

    // 1. Bloqueia Dashboard para VENDEDOR
    if (pathname === '/dashboard' || pathname === '/') {
      if (role === 'VENDEDOR') {
        return NextResponse.redirect(new URL('/leads', request.url));
      }
    }

    // 2. Proteção de rotas restritas de Gestão
    const isSellersRoute = pathname.startsWith('/vendedores') || pathname.startsWith('/api/sellers');
    const isBranchesRoute = pathname.startsWith('/filiais') || pathname.startsWith('/api/branches');
    const isUsersRoute = pathname.startsWith('/usuarios') || pathname.startsWith('/api/users');

    if (isSellersRoute) {
      const allowed = ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'GERENTE'];
      if (!allowed.includes(role)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/leads', request.url));
      }
    }

    if (isBranchesRoute || isUsersRoute) {
      const allowed = ['SUPERADMIN', 'ADMIN', 'SUPERVISOR'];
      if (!allowed.includes(role)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const redirectUrl = role === 'VENDEDOR' ? '/leads' : '/dashboard';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Token expirado ou inválido
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }
}

// Configura quais rotas o middleware deve observar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
