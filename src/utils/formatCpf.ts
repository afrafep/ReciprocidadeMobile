/**
 * Formata um CPF para o padrão 000.000.000-00
 */
export function formatCpf(cpf?: string | number | null): string {
  if (!cpf) return "";

  const numeros = String(cpf).replace(/\D/g, "");

  if (numeros.length !== 11) {
    return String(cpf);
  }

  return numeros.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}
