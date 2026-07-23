import { NextResponse } from "next/server";
import { apiBackendUrl, authorizationBeneficiario } from "@/lib/reciprocidadeBackend";

export async function GET() {
  try {
    const authorization = await authorizationBeneficiario();
    if (!authorization) {
      return NextResponse.json({ error: "Sessao ausente." }, { status: 401 });
    }
    const response = await fetch(apiBackendUrl("/api/beneficiarios/familia"), {
      cache: "no-store",
      headers: { Authorization: authorization },
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Erro ao consultar familia do beneficiario", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
