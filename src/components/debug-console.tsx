"use client";

import { type ReactNode, useLayoutEffect, useState } from "react";

export type DebugConfig = {
  apiBaseUrl: string;
  sessionEndpoint: string;
  chaveFuncionalidade: string;
  tokenTecnicoConfigurado: boolean;
};

type DebugEntry = {
  id: number;
  horario: string;
  titulo: string;
  dados: unknown;
};

export function DebugWrapper({ config, children }: { config: DebugConfig | null; children: ReactNode }) {
  const [entries, setEntries] = useState<DebugEntry[]>([]);

  useLayoutEffect(() => {
    if (!config) return;
    let sequence = 0;
    const originalFetch = window.fetch.bind(window);
    const add = (titulo: string, dados: unknown) => setEntries((current) => [
      ...current.slice(-99),
      { id: ++sequence, horario: new Date().toLocaleTimeString("pt-BR"), titulo, dados },
    ]);
    const url = new URL(window.location.href);
    const chavePasse = url.searchParams.get("chavePasse") ?? url.searchParams.get("chavepasse") ?? "";
    add("Inicialização", {
      url: window.location.href,
      chavePasse,
      chavePasseRecebida: Boolean(chavePasse),
      apiBaseUrl: config.apiBaseUrl,
      endpointSessaoJava: `${config.apiBaseUrl}${config.sessionEndpoint}`,
      chaveFuncionalidade: config.chaveFuncionalidade,
      tokenTecnico: config.tokenTecnicoConfigurado ? "CONFIGURADO (valor oculto)" : "AUSENTE",
    });

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      const pathname = requestUrl.startsWith("http") ? new URL(requestUrl).pathname : requestUrl.split("?")[0];
      const backendPaths: Record<string, string> = {
        "/api/reciprocidade/sessao": config.sessionEndpoint,
        "/api/reciprocidade/beneficiario": "/api/beneficiarios/familia",
        "/api/reciprocidade/solicitacoes": "/api/reciprocidade/solicitacoes",
        "/api/reciprocidade/filiadas/ativas": "/api/reciprocidade/filiadas/ativas",
      };
      const backendPath = backendPaths[pathname] ?? pathname;
      let payload: unknown = init?.body ?? null;
      if (typeof payload === "string") {
        try { payload = JSON.parse(payload); } catch { /* mantém texto original */ }
      }
      add("Requisição", {
        method,
        endpointNext: pathname,
        endpointJava: `${config.apiBaseUrl}${backendPath}`,
        payload,
      });
      try {
        const response = await originalFetch(input, init);
        const responseBody = await response.clone().json().catch(async () => {
          const texto = await response.clone().text().catch(() => "");
          return texto || null;
        });
        add("Resposta", {
          method,
          endpointNext: pathname,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          resposta: responseBody,
        });
        return response;
      } catch (error) {
        add("Falha de rede", {
          method,
          endpointNext: pathname,
          erro: error instanceof Error ? error.message : "Erro desconhecido",
        });
        throw error;
      }
    };

    return () => { window.fetch = originalFetch; };
  }, [config]);

  return <>{children}<DebugConsole config={config} entries={entries} onClear={() => setEntries([])} /></>;
}

function DebugConsole({ config, entries, onClear }: { config: DebugConfig | null; entries: DebugEntry[]; onClear: () => void }) {
  const [aberto, setAberto] = useState(true);
  const [copiado, setCopiado] = useState(false);
  if (!config) return null;

  async function copiarEventos() {
    const texto = JSON.stringify(entries, null, 2);
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <aside className="fixed inset-x-0 bottom-0 z-[100] border-t-2 border-amber-400 bg-slate-950 text-slate-100 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <p className="font-mono text-xs font-bold text-amber-300">DEBUG · {entries.length} evento(s)</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={entries.length === 0} onClick={() => void copiarEventos()} className="rounded border border-cyan-500 px-2 py-1 text-xs font-bold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">{copiado ? "Copiado!" : "Copiar eventos"}</button>
          <button type="button" onClick={onClear} className="rounded border border-slate-600 px-2 py-1 text-xs">Limpar</button>
          <button type="button" onClick={() => setAberto((value) => !value)} className="rounded border border-amber-400 px-2 py-1 text-xs font-bold text-amber-300">{aberto ? "Minimizar" : "Abrir"}</button>
        </div>
      </div>
      {aberto && (
        <div className="max-h-[42vh] overflow-y-auto border-t border-slate-700 p-3 font-mono text-[11px] leading-5">
          {entries.length === 0 ? <p className="text-slate-400">Aguardando eventos...</p> : entries.map((entry) => (
            <details key={entry.id} open className="mb-2 rounded bg-slate-900 p-2">
              <summary className="cursor-pointer font-bold text-cyan-300">[{entry.horario}] {entry.titulo}</summary>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-slate-300">{JSON.stringify(entry.dados, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </aside>
  );
}
