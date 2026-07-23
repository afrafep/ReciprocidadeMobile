import Reciprocidade from "./reciprocidade/page";
import { DebugWrapper, type DebugConfig } from "@/components/debug-console";

export default function Home() {
  const debugAtivo = process.env.DEBUG === "true";
  const modoLocal = process.env.RECIPROCIDADE_DEV_AUTH_ENABLED === "true";
  const debugConfig: DebugConfig | null = debugAtivo ? {
    apiBaseUrl: process.env.API_BASE_URL?.trim().replace(/\/$/, "") ?? "NÃO CONFIGURADA",
    sessionEndpoint: modoLocal ? "/api/auth/desenvolvimento/sessoes" : "/api/auth/mosia/sessoes",
    chaveFuncionalidade: process.env.RECIPROCIDADE_CHAVE_FUNCIONALIDADE?.trim() || "NÃO CONFIGURADA",
    tokenTecnicoConfigurado: Boolean(process.env.RECIPROCIDADE_FRONT_TOKEN?.trim()),
  } : null;

  return <DebugWrapper config={debugConfig}><Reciprocidade /></DebugWrapper>;
}
