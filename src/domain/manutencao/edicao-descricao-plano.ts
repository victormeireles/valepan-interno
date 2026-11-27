import type { AlvoPlano, EscopoManutencao } from './escopo-manutencao';

export type FrequenciaInformada =
  | { tipo: 'a_cada_n_dias'; intervalo: number }
  | { tipo: 'semanal'; diaSemana: number }
  | { tipo: 'mensal'; diaMes: number };

export type PlanoEmEdicao = {
  escopo: EscopoManutencao;
  maquinaId: string | null;
  frequenciaTipo: FrequenciaInformada['tipo'];
  intervaloDias: number | null;
  diaSemana: number | null;
  diaMes: number | null;
};

export type DescricaoAceita =
  | { ok: true; descricao: string }
  | { ok: false; mensagem: string };

const DESCRICAO_VAZIA = 'Informe a descrição.';

export class EdicaoDescricaoPlano {
  soDescricao(atual: PlanoEmEdicao, alvo: AlvoPlano, frequencia: FrequenciaInformada): boolean {
    return this.mesmoAlvo(atual, alvo) && this.mesmaFrequencia(atual, frequencia);
  }

  mesmoAlvo(atual: PlanoEmEdicao, alvo: AlvoPlano): boolean {
    return atual.escopo === alvo.escopo && (atual.maquinaId ?? '') === (alvo.maquinaId ?? '');
  }

  aceitar(descricao: string): DescricaoAceita {
    const texto = descricao.trim();
    if (!texto) return { ok: false, mensagem: DESCRICAO_VAZIA };
    return { ok: true, descricao: texto };
  }

  mesmaFrequencia(atual: PlanoEmEdicao, frequencia: FrequenciaInformada): boolean {
    if (atual.frequenciaTipo !== frequencia.tipo) return false;
    if (frequencia.tipo === 'a_cada_n_dias') return atual.intervaloDias === frequencia.intervalo;
    if (frequencia.tipo === 'semanal') return atual.diaSemana === frequencia.diaSemana;
    return atual.diaMes === frequencia.diaMes;
  }
}
