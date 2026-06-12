import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cpf = searchParams.get("cpf")?.replace(/\D/g, "");

    if (!cpf) {
      return NextResponse.json(
        { error: "CPF não informado" },
        { status: 400 }
      );
    }

    const headers = process.env.ACCESS_TOKEN
      ? { "X-Access-Token": process.env.ACCESS_TOKEN }
      : undefined;
    const resBenef = await fetch(
      `${process.env.API_BASE_URL}/api/oracle/beneficiarios/titular/${cpf}/dependentes`,
      {
        cache: "no-store",
        headers,
      }
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
