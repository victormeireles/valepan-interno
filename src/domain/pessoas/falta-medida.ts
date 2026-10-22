export type MedidaFalta = 'advertencia' | 'suspensao' | 'justa_causa';

const MEDIDAS = new Set<string>(['advertencia', 'suspensao', 'justa_causa']);

export function parseMedidaFalta(valor: string | null | undefined): MedidaFalta | null {
  const texto = (valor ?? '').trim();
  if (!texto) return null;
  if (!MEDIDAS.has(texto)) throw new Error('Medida inválida.');
  return texto as MedidaFalta;
}
