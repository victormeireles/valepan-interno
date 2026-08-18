import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';

export type FluxoFilasEmbSemOpLinha = {
  produtoNome: string;
  assadeiraNome: string;
  volumeUn: number;
  ultimoLoteEm: string | null;
};

export type FluxoFilasEmbAlocacao = {
  unPorOp: Map<string, number>;
  ultimoLoteEmPorOp: Map<string, string>;
  produtoNomePorOp: Map<string, string>;
  assadeiraNomePorOp: Map<string, string>;
  semOpPorProduto: Map<string, FluxoFilasEmbSemOpLinha>;
};

function emptyAlocacao(): FluxoFilasEmbAlocacao {
  return {
    unPorOp: new Map(),
    ultimoLoteEmPorOp: new Map(),
    produtoNomePorOp: new Map(),
    assadeiraNomePorOp: new Map(),
    semOpPorProduto: new Map(),
  };
}

function maisRecente(atual: string | undefined, candidato: string): string {
  if (!atual) return candidato;
  return Date.parse(candidato) >= Date.parse(atual) ? candidato : atual;
}

export class FluxoFilasEmbPorOp {
  alocar(eventos: FluxoControleEventoInput[]): FluxoFilasEmbAlocacao {
    const aloc = emptyAlocacao();
    for (const ev of eventos) {
      if (ev.ordemProducaoId) this.somarOp(aloc, ev, ev.ordemProducaoId);
      else this.somarSemOp(aloc, ev);
    }
    return aloc;
  }

  private somarOp(
    aloc: FluxoFilasEmbAlocacao,
    ev: FluxoControleEventoInput,
    opId: string,
  ): void {
    aloc.unPorOp.set(opId, (aloc.unPorOp.get(opId) ?? 0) + ev.unidades);
    aloc.ultimoLoteEmPorOp.set(
      opId,
      maisRecente(aloc.ultimoLoteEmPorOp.get(opId), ev.produzidoEm),
    );
    if (!aloc.produtoNomePorOp.has(opId)) {
      aloc.produtoNomePorOp.set(opId, ev.produtoNome);
      aloc.assadeiraNomePorOp.set(opId, ev.assadeiraNome);
    }
  }

  private somarSemOp(aloc: FluxoFilasEmbAlocacao, ev: FluxoControleEventoInput): void {
    const prev = aloc.semOpPorProduto.get(ev.produtoNome);
    aloc.semOpPorProduto.set(ev.produtoNome, {
      produtoNome: ev.produtoNome,
      assadeiraNome: prev?.assadeiraNome ?? ev.assadeiraNome,
      volumeUn: (prev?.volumeUn ?? 0) + ev.unidades,
      ultimoLoteEm: maisRecente(prev?.ultimoLoteEm ?? undefined, ev.produzidoEm),
    });
  }
}
