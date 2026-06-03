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

    const resBenef = await fetch(
      `${process.env.API_BASE_URL}/api/oracle/beneficiarios/titular/${cpf}/dependentes`
    );

    if (resBenef.status === 404) {
      return NextResponse.json({}, { status: 404 });
    }

    const data = await resBenef.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
