import type {
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
} from './producao-turno-types';

export const TURNO_TROCA_ERRO = 'Não foi possível trocar o turno.';

export type ConfirmEtapaTurnoAtivoResult = {
  numero: ProducaoTurnoNumero;
  confirmadoEm: string;
};

export async function confirmEtapaTurnoAtivo(
  etapa: ProducaoTurnoEtapaId,
  numero: ProducaoTurnoNumero,
  fetchFn: typeof fetch = fetch,
): Promise<ConfirmEtapaTurnoAtivoResult> {
  const res = await fetchFn(`/api/producao/${etapa}/turno-ativo`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero }),
  });
  if (!res.ok) throw new Error(TURNO_TROCA_ERRO);
  return res.json() as Promise<ConfirmEtapaTurnoAtivoResult>;
}
