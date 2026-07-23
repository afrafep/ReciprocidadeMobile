import { cookies } from "next/headers";

const COOKIE_SESSAO = "reciprocidade_session";

export function apiBackendUrl(path: string): string {
  const baseUrl = process.env.API_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("API_BASE_URL nao configurada.");
  return `${baseUrl}${path}`;
}

export async function authorizationBeneficiario(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESSAO)?.value;
  return token ? `Bearer ${token}` : null;
}

export function tokenTecnicoReciprocidade(): string {
  const token = process.env.RECIPROCIDADE_FRONT_TOKEN?.trim();
  if (!token) throw new Error("RECIPROCIDADE_FRONT_TOKEN nao configurado.");
  return token;
}
