import { NextResponse } from "next/server";
import { apiBackendUrl, authorizationBeneficiario } from "@/lib/reciprocidadeBackend";

async function chamarBackend(path: string, init?: RequestInit) {
  const authorization = await authorizationBeneficiario();
  if (!authorization) {
    return NextResponse.json({ error: "Sessao ausente." }, { status: 401 });
  }
  const response = await fetch(apiBackendUrl(path), {
    cache: "no-store",
    ...init,
    headers: { Authorization: authorization, ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}

export async function GET() {
  try {
    return await chamarBackend("/api/reciprocidade/solicitacoes");
  } catch (error) {
    console.error("Erro ao consultar solicitacoes", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = { ...((await request.json()) as Record<string, unknown>) };
    delete payload.titularCpf;
    return await chamarBackend("/api/reciprocidade/solicitacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Erro ao criar solicitacao", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
