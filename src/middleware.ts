import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || "fallback-secret-key-for-dev-only";
const key = new TextEncoder().encode(secretKey);

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Ignorar arquivos estáticos da pasta public
  const publicFiles = [
    '/sw.js',
    '/manifest.webmanifest',
    '/favicon.ico',
    '/apple-touch-icon.png',
    '/logo.png',
    '/icon-192.png',
    '/icon-512.png',
    '/placeholder.svg',
    '/robots.txt'
  ];

  if (publicFiles.includes(pathname)) {
    return NextResponse.next();
  }

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
    const isSellersRoute = (pathname.startsWith('/vendedores') || pathname.startsWith('/api/sellers')) && pathname !== '/api/sellers/me';
    const isBranchesRoute = pathname.startsWith('/filiais') || pathname.startsWith('/api/branches');
    const isUsersRoute = pathname.startsWith('/usuarios') || pathname.startsWith('/api/users');
    const isCompaniesRoute = pathname.startsWith('/empresas') || pathname.startsWith('/api/companies');

    if (isSellersRoute) {
      // Vendedor é permitido APENAS para ler (GET) via API. A página UI /vendedores e mutações via API continuam bloqueadas.
      const isApiGet = pathname.startsWith('/api/sellers') && request.method === 'GET';
      const allowed = isApiGet 
        ? ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'GERENTE', 'VENDEDOR']
        : ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'GERENTE'];

      if (!allowed.includes(role)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/leads', request.url));
      }
    }

    if (isBranchesRoute || isUsersRoute || isCompaniesRoute) {
      const isBranchesGet = isBranchesRoute && pathname.startsWith('/api/branches') && request.method === 'GET';
      const allowed = isBranchesGet
        ? ['SUPERADMIN', 'ADMIN', 'SUPERVISOR']
        : ['SUPERADMIN', 'ADMIN'];

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
     * - favicon.ico, manifest.webmanifest, sw.js (PWA files)
     * - apple-touch-icon.png, logo.png, icon-192.png, icon-512.png, placeholder.svg (static assets)
     * - robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|apple-touch-icon.png|logo.png|icon-192.png|icon-512.png|placeholder.svg|robots.txt).*)',
  ],
};
