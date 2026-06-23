import type { EtapaCadeiaBarra } from '@/components/Realizado/etapa/etapa-cadeia-progresso-types';
import { converterLtParaCaixasEmbalagem } from '@/domain/producao-etapa/etapa-cascata-display';
import type { AssadeiraMetaContext } from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';

export type EtapaCadeiaContexto = {
  etapa: 'fermentacao' | 'forno';
};

function barraLt(
  slug: EtapaCadeiaBarra['slug'],
  label: string,
  icon: string,
  produzido: number,
  meta: number,
  finalizada: boolean,
  destaque: boolean,
  metaOp?: number,
  estimativaAoVivo?: number | null,
): EtapaCadeiaBarra {
  return {
    slug,
    label,
    icon,
    produzido,
    meta,
    unidade: 'LT',
    finalizada,
    destaque,
    metaOp,
    estimativaAoVivo: estimativaAoVivo ?? undefined,
  };
}

export function buildEtapaCadeiaBarras(
  ordem: PainelOrdemEtapa,
  contexto: EtapaCadeiaContexto,
): EtapaCadeiaBarra[] {
  const cascata = ordem.cascata;
  if (!cascata) return [];
  const metaOpLt = ordem.metaPlanejada;

  if (contexto.etapa === 'fermentacao') {
    const { fermentacao } = cascata;
    return [
      barraLt(
        'fermentacao',
        'Fermentação',
        'bakery_dining',
        fermentacao.produzido,
        fermentacao.meta,
        fermentacao.finalizada,
        true,
        metaOpLt,
      ),
    ];
  }

  const { fermentacao, forno } = cascata;
  const fermentacaoEstimativa =
    !fermentacao.finalizada && fermentacao.produzido > 0 ? fermentacao.produzido : null;

  return [
    barraLt(
      'fermentacao',
      'Fermentação',
      'bakery_dining',
      fermentacao.produzido,
      fermentacao.meta,
      fermentacao.finalizada,
      false,
      metaOpLt,
      fermentacaoEstimativa,
    ),
    barraLt(
      'forno',
      'Forno',
      'local_fire_department',
      forno.produzido,
      forno.meta,
      forno.finalizada,
      true,
      metaOpLt,
    ),
  ];
}

export function buildEmbalagemCadeiaBarras(
  pedido: PainelPedidoEmbalagem,
  assadeiraCtx?: AssadeiraMetaContext,
): EtapaCadeiaBarra[] {
  const cascata = pedido.cascata;
  const unidade = pedido.unidade === 'pct' ? 'PCT' : pedido.unidade.toUpperCase();
  const metaEmb = pedido.aProduzir;
  const metaOp = pedido.metaPlanejada;

  const toCx = (lt: number) =>
    assadeiraCtx ? converterLtParaCaixasEmbalagem(lt, assadeiraCtx) : lt;

  const ferm = cascata?.fermentacao;
  const forno = cascata?.forno;

  const fermProduzido = ferm ? toCx(ferm.produzido) : 0;
  const fermMeta = ferm ? toCx(ferm.meta) : 0;
  const fornoProduzido = forno ? toCx(forno.produzido) : 0;
  const fornoMeta = forno ? toCx(forno.meta) : 0;

  return [
    {
      slug: 'fermentacao',
      label: 'Fermentação',
      icon: 'bakery_dining',
      produzido: fermProduzido,
      meta: fermMeta,
      unidade,
      finalizada: ferm?.finalizada ?? false,
      destaque: false,
      metaOp,
      estimativaAoVivo:
        ferm && !ferm.finalizada && ferm.produzido > 0 ? fermProduzido : undefined,
    },
    {
      slug: 'forno',
      label: 'Forno',
      icon: 'local_fire_department',
      produzido: fornoProduzido,
      meta: fornoMeta,
      unidade,
      finalizada: forno?.finalizada ?? false,
      destaque: false,
      metaOp,
      estimativaAoVivo:
        forno && !forno.finalizada && forno.produzido > 0 ? fornoProduzido : undefined,
    },
    {
      slug: 'embalagem',
      label: 'Embalagem',
      icon: 'inventory_2',
      produzido: pedido.produzidoScalar,
      meta: metaEmb,
      unidade,
      finalizada: pedido.finalizada,
      destaque: true,
      metaOp,
    },
  ];
}
