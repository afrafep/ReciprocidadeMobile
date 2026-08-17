import { NextResponse } from "next/server";

const COOKIE_SESSAO = "reciprocidade_session";

function opcoesCookieSessao() {
  const producao = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: producao,
    sameSite: producao ? ("none" as const) : ("lax" as const),
    path: "/",
  };
}

type SessaoBackend = {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  aplicacao: string;
  beneficiario: {
    nome: string;
    cpf: string;
    matricula: string;
    codigoBeneficiario: string;
  };
};

function configuracaoObrigatoria(nome: string): string {
  const valor = process.env[nome]?.trim();
  if (!valor) {
    throw new Error(`Configuracao server-side ausente: ${nome}`);
  }
  return valor;
}

export async function POST(request: Request) {
  try {
    const apiBaseUrl = configuracaoObrigatoria("API_BASE_URL");
    const tokenTecnico = configuracaoObrigatoria("RECIPROCIDADE_FRONT_TOKEN");
    const devCpf = process.env.RECIPROCIDADE_DEV_CPF?.replace(/\D/g, "") || "";
    const modoLocal =
      process.env.RECIPROCIDADE_DEV_AUTH_ENABLED === "true" &&
      devCpf.length === 11;
    const body = (await request.json().catch(() => ({}))) as { chavePasse?: string };

    let endpoint: string;
    let payload: Record<string, string>;

    if (modoLocal) {
      endpoint = "/api/auth/desenvolvimento/sessoes";
      payload = { cpf: devCpf };
    } else {
      const chavePasse = body.chavePasse?.trim();
      if (!chavePasse) {
        return NextResponse.json(
          { error: "Nenhuma chavePasse foi informada." },
          { status: 400 },
        );
      }

      endpoint = "/api/auth/mosia/sessoes";
      payload = {
        chavePasse,
        chaveFuncionalidade: configuracaoObrigatoria(
          "RECIPROCIDADE_CHAVE_FUNCIONALIDADE",
        ),
      };
    }

    const backendResponse = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": tokenTecnico,
      },
      body: JSON.stringify(payload),
    });
    const resposta = (await backendResponse.json().catch(() => null)) as
      | SessaoBackend
      | { mensagem?: string; error?: string }
      | null;

    if (!backendResponse.ok || !resposta || !("accessToken" in resposta)) {
      const mensagem =
        resposta && "mensagem" in resposta
          ? resposta.mensagem
          : resposta && "error" in resposta
            ? resposta.error
            : undefined;
      return NextResponse.json(
        {
          error: mensagem || "Nao foi possivel criar a sessao do beneficiario.",
          backendStatus: backendResponse.status,
        },
        { status: backendResponse.status || 502 },
      );
    }

    const response = NextResponse.json({
      expiresAt: resposta.expiresAt,
      aplicacao: resposta.aplicacao,
      beneficiario: resposta.beneficiario,
      modoLocal,
    });
    response.cookies.set(COOKIE_SESSAO, resposta.accessToken, {
      ...opcoesCookieSessao(),
    });
    response.headers.set("Cache-Control", "no-store, private");
    return response;
  } catch (error) {
    console.error("Erro ao criar sessao de reciprocidade", error);
    return NextResponse.json(
      { error: "Configuracao interna da sessao de reciprocidade invalida." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ encerrada: true });
  response.cookies.set(COOKIE_SESSAO, "", {
    ...opcoesCookieSessao(),
    maxAge: 0,
  });
  return response;
}
