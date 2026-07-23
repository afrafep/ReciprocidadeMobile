import { NextResponse } from "next/server";
import { apiBackendUrl, tokenTecnicoReciprocidade } from "@/lib/reciprocidadeBackend";

export async function GET() {
  try {
    const response = await fetch(apiBackendUrl("/api/reciprocidade/filiadas/ativas"), {
      cache: "no-store",
      headers: { "X-Access-Token": tokenTecnicoReciprocidade() },
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Erro ao consultar filiadas ativas", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
