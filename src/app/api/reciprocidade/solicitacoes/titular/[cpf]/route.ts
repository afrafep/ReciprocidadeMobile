import { NextResponse } from "next/server";

interface Params {
  params: Promise<{
    cpf: string;
  }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { cpf } = await params;
    const cpfLimpo = cpf.replace(/\D/g, "");
    const url = `${process.env.API_BASE_URL}/api/reciprocidade/solicitacoes/titular/${cpfLimpo}`;
    const headers = process.env.ACCESS_TOKEN
      ? { "X-Access-Token": process.env.ACCESS_TOKEN }
      : undefined;
    const res = await fetch(url, { cache: "no-store", headers });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erro ao consultar solicitações do titular" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
