import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = "secret-key-sales-spark";
const key = new TextEncoder().encode(secretKey);

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Rotas públicas
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/login')) {
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
    await jwtVerify(session, key);
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
