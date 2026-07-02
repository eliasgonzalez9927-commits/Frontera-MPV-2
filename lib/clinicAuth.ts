import "server-only";

export function validateClinicAuthorization(request: Request) {
  const configuredToken = process.env.CLINIC_ACCESS_TOKEN;

  if (!configuredToken) {
    return {
      ok: false,
      status: 503,
      message: "CLINIC_ACCESS_TOKEN no esta configurado.",
    };
  }

  const authorization = request.headers.get("authorization");
  const expected = `Bearer ${configuredToken}`;

  if (authorization !== expected) {
    return {
      ok: false,
      status: 401,
      message: "Token clinico invalido o ausente.",
    };
  }

  return { ok: true, status: 200, message: "OK" };
}
