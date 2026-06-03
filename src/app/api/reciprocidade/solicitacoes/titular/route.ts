import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chavePasse = searchParams.get("chavePasse")?.replace(/\D/g, "");
    const cpf =
      searchParams.get("cpf")?.replace(/\D/g, "") ||
      chavePasse ||
      process.env.NEXT_PUBLIC_CHAVE_UNICA?.replace(/\D/g, "");

    if (!cpf) {
      return NextResponse.json(
        { error: "CPF ou chavePasse não informado" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${process.env.API_BASE_URL}/api/reciprocidade/solicitacoes/titular/${cpf}`
    );

    if (res.status === 404) {
      return NextResponse.json([]);
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erro ao consultar solicitações" },
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
