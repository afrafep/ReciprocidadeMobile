/**
 * Converte uma data string para Date preservando o dia (sem efeito de fuso)
 * Aceita:
 *  - yyyy-MM-dd
 *  - yyyy-MM-ddTHH:mm:ss
 *  - ISO
 */
export function parseDateLocal(
  dateInput?: string | Date | null
): Date | null {
  if (!dateInput) return null;

  // Já é Date
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  const dateString = String(dateInput);

  // yyyy-MM-dd (forma mais segura)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // ISO / yyyy-MM-ddTHH:mm:ss
  const parsed = new Date(dateString);

  if (isNaN(parsed.getTime())) {
    console.warn("parseDateLocal: data inválida:", dateString);
    return null;
  }

  // Normaliza para meia-noite local
  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
}
