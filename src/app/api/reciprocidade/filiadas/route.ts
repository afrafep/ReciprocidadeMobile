import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      `${process.env.API_BASE_URL}/api/reciprocidade/filiadas/completa`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erro ao consultar filiadas" },
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
