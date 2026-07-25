import { NextResponse } from "next/server";
import {
  apiBackendUrl,
  authorizationBeneficiario,
} from "@/lib/reciprocidadeBackend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  try {
    const authorization = await authorizationBeneficiario();
    if (!authorization) {
      return NextResponse.json({ error: "Sessão ausente." }, { status: 401 });
    }

    const { codigo } = await params;
    const response = await fetch(
      apiBackendUrl(
        `/api/reciprocidade/solicitacoes/${encodeURIComponent(codigo)}/termo-ciencia-reciprocidade-fisco`,
      ),
      {
        method: "GET",
        cache: "no-store",
        headers: { Authorization: authorization },
      },
    );

    if (!response.ok) {
      const erro = await response.json().catch(() => null);
      return NextResponse.json(
        erro || { error: "Não foi possível gerar o termo da solicitação." },
        { status: response.status },
      );
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/pdf",
        "Content-Disposition":
          response.headers.get("content-disposition") ||
          `attachment; filename="termo_ciencia_reciprocidade_fisco_${codigo}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao baixar termo de reciprocidade", error);
    return NextResponse.json(
      { error: "Erro interno ao baixar o termo da solicitação." },
      { status: 500 },
    );
  }
}
