import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = `${process.env.API_BASE_URL}/api/reciprocidade/solicitacoes`;
    const headers = {
      "Content-Type": "application/json",
      ...(process.env.ACCESS_TOKEN
        ? { "X-Access-Token": process.env.ACCESS_TOKEN }
        : {}),
    };
    const res = await fetch(
      url,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }
    );

    const text = await res.text();
    let data: unknown = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Erro ao criar solicitação",
          endpoint: url,
          status: res.status,
          data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
