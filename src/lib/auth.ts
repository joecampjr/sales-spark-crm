import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const secretKey = process.env.JWT_SECRET || "fallback-secret-key-for-dev-only";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}

export async function getSession() {
  const sessionVal = (await cookies()).get("session")?.value;
  if (!sessionVal) return null;
  try {
    const decrypted = await decrypt(sessionVal);
    // Se o usuário logado não possuir companyId na sessão e não for SUPERADMIN,
    // invalidamos a sessão para evitar vazamento de dados entre inquilinos (Fail-Closed).
    if (decrypted && !decrypted.companyId && decrypted.role !== 'SUPERADMIN') {
      return null;
    }
    return decrypted;
  } catch (e) {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  if (!session) return null;

  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + 10 * 1000); // 10 seconds refresh
  const res = NextResponse.next();
  res.cookies.set({
    name: "session",
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
  });
  return res;
}
