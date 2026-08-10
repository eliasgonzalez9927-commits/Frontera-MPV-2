import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  isAdminLoginConfigured,
  validateAdminCredentials,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminLoginConfigured()) {
    return NextResponse.json(
      { error: "El acceso admin no esta configurado." },
      { status: 503 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const body = payload as {
    username?: unknown;
    password?: unknown;
  };
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!validateAdminCredentials(username, password)) {
    return NextResponse.json(
      { error: "Usuario o contrasena incorrectos." },
      { status: 401 }
    );
  }

  const session = createAdminSessionToken(username);

  if (!session) {
    return NextResponse.json(
      { error: "No se pudo crear la sesion admin." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    adminToken: session.token,
    expiresAt: session.expiresAt,
  });
}
