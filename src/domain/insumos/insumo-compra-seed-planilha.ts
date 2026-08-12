import type { InsumoCompraJanelaTipo } from './insumo-compra-janela';

export type InsumoCompraSeedDistribuidor = {
  nome: string;
  preferencial: boolean;
};

export type InsumoCompraSeedRegra = {
  nome: string;
  nomeNormalizado: string;
  leadTimeDias: number;
  janelaTipo: InsumoCompraJanelaTipo;
  diasSemana: number[] | null;
  quantidadeMinima: number | null;
  quantidadeMaxima: number | null;
  distribuidores: InsumoCompraSeedDistribuidor[];
};

export class InsumoCompraNomeNormalizer {
  normalize(nome: string): string {
    return nome
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}

export const insumoCompraNomeNormalizer = new InsumoCompraNomeNormalizer();

type SeedInput = Omit<InsumoCompraSeedRegra, 'nomeNormalizado'>;

class InsumoCompraSeedPlanilhaBuilder {
  build(items: SeedInput[]): InsumoCompraSeedRegra[] {
    return items.map((item) => ({
      ...item,
      nomeNormalizado: insumoCompraNomeNormalizer.normalize(item.nome),
    }));
  }

  qualquer(
    nome: string,
    leadTimeDias: number,
    distribuidores: string[] = [],
    quantidadeMinima: number | null = null,
    quantidadeMaxima: number | null = null,
  ): SeedInput {
    return this.create(
      nome, leadTimeDias, 'qualquer', null, distribuidores,
      quantidadeMinima, quantidadeMaxima,
    );
  }

  diasSemana(
    nome: string,
    leadTimeDias: number,
    dias: number[],
    distribuidores: string[] = [],
    quantidadeMinima: number | null = null,
    quantidadeMaxima: number | null = null,
  ): SeedInput {
    return this.create(
      nome, leadTimeDias, 'dias_semana', dias, distribuidores,
      quantidadeMinima, quantidadeMaxima,
    );
  }

  private create(
    nome: string,
    leadTimeDias: number,
    janelaTipo: InsumoCompraJanelaTipo,
    diasSemana: number[] | null,
    distribuidores: string[],
    quantidadeMinima: number | null,
    quantidadeMaxima: number | null,
  ): SeedInput {
    return {
      nome,
      leadTimeDias,
      janelaTipo,
      diasSemana,
      quantidadeMinima,
      quantidadeMaxima,
      distribuidores: distribuidores.map((distribuidor, index) => ({
        nome: distribuidor,
        preferencial: index === 0,
      })),
    };
  }
}

const builder = new InsumoCompraSeedPlanilhaBuilder();

export const INSUMO_COMPRA_SEED_PLANILHA = builder.build([
  builder.diasSemana('Farinha de trigo', 7, [1], ['DOUGLAS'], 30_000, 30_000),
  builder.qualquer('Glúten', 3, ['DAXIA', 'PANTEC']),
  builder.qualquer('Profina', 3, ['DAXIA', 'PANTEC']),
  builder.diasSemana('Sal', 7, [1, 2, 3], ['RONALDO']),
  builder.qualquer('Fermento', 20, ['LESAFRE']),
  builder.qualquer('Farinha de soja', 15),
  builder.qualquer('Mono 90', 3, ['PANTEC']),
  builder.qualquer('Spring 2020', 28),
  builder.qualquer('Ultra fresh', 7),
  builder.qualquer('Proteina de soja', 14),
  builder.qualquer('Dextrose', 3, ['PANTEC']),
  builder.qualquer('Ácido ascórbico', 3, ['PANTEC']),
  builder.qualquer('Ácido sórbico', 3, ['PANTEC']),
  builder.qualquer('Ácido cítrico', 3, ['PANTEC']),
  builder.qualquer('Açúcar cristal', 3, ['PANTEC'], 3_000),
  builder.qualquer('Gergelim branco', 20),
  builder.qualquer('Gergelim preto', 3, ['PANTEC']),
  builder.qualquer('Álcool', 1, ['ALZIRA'], null, 300),
  builder.qualquer('Creme de confeiteiro', 15, ['VALEFOODS']),
  builder.qualquer('Melhorador de massa', 15, ['VALEFOODS']),
  builder.qualquer('Polisorbato', 3, ['PANTEC']),
  builder.qualquer('Óleo mineral', 3, ['PANTEC']),
  builder.qualquer('Gema pasteurizada', 1, ['TOP ALTO'], 15),
  builder.diasSemana('Pão congelado', 1, [3], ['PAN MIX']),
  builder.diasSemana('Fubá', 7, [1, 2, 3], ['RONALDO']),
  builder.diasSemana('Ovos', 1, [3], ['Guilherme']),
  builder.qualquer('Embalagem plástica 520', 21),
  builder.qualquer('Embalagem plástica 560', 21),
  builder.qualquer('Ribon', 15),
  builder.diasSemana('Caixa de papelao', 7, [1]),
]);
