import { NextResponse } from "next/server";

export async function GET() {
  try {
    const headers = process.env.ACCESS_TOKEN
      ? { "X-Access-Token": process.env.ACCESS_TOKEN }
      : undefined;
    const url = `${process.env.API_BASE_URL}/api/reciprocidade/filiadas/ativas`;
    const res = await fetch(url, {
      cache: "no-store",
      headers,
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Erro ao consultar filiadas ativas",
          endpoint: url,
          status: res.status,
        },
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
