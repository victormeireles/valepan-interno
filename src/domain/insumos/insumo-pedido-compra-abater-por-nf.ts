import { addDaysIso } from '@/domain/insumos/insumo-compra-data-offset';

export const JANELA_ABATIMENTO_PEDIDO_DIAS = 3;

export type InsumoPedidoAbaterCandidato = {
  id: string;
  dataChegadaPrevista: string;
  numero: number;
};

export function escolherPedidoParaAbaterPorNf(
  candidatos: InsumoPedidoAbaterCandidato[],
  hojeIso: string,
  janelaDias: number = JANELA_ABATIMENTO_PEDIDO_DIAS,
): string | null {
  const dataLimite = addDaysIso(hojeIso, janelaDias);
  const elegiveis = candidatos
    .filter((c) => c.dataChegadaPrevista <= dataLimite)
    .sort((a, b) => {
      if (a.dataChegadaPrevista !== b.dataChegadaPrevista) {
        return a.dataChegadaPrevista < b.dataChegadaPrevista ? -1 : 1;
      }
      return a.numero - b.numero;
    });
  return elegiveis[0]?.id ?? null;
}
