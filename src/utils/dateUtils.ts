import { parseDateLocal } from "./parseDataLocal";

/**
 * Retorna true se a consulta estiver próxima do vencimento
 */
export function estaQuaseVencendo(
  dataConsulta?: string | Date | null,
  prazoDias: number = 0,
  diasAviso: number = 0
): boolean {
  const data = parseDateLocal(dataConsulta);
  if (!data) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataLimite = new Date(data);
  dataLimite.setDate(dataLimite.getDate() + prazoDias);
  dataLimite.setHours(0, 0, 0, 0);

  const dataAviso = new Date(dataLimite);
  dataAviso.setDate(dataAviso.getDate() - diasAviso);

  return hoje >= dataAviso && hoje <= dataLimite;
}

/**
 * Retorna true se a consulta estiver vencida
 */
export function estaVencido(
  dataConsulta?: string | Date | null,
  prazoDias: number = 0
): boolean {
  const data = parseDateLocal(dataConsulta);
  if (!data) return true;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataLimite = new Date(data);
  dataLimite.setDate(dataLimite.getDate() + prazoDias);
  dataLimite.setHours(0, 0, 0, 0);

  return hoje > dataLimite;
}

