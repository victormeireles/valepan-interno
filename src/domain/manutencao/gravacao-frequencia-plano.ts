import type { FrequenciaInformada } from './edicao-descricao-plano';
import {
  ProximaDataPreventiva,
  type FrequenciaPlano,
} from './proxima-data-preventiva';

export type PlanoFrequenciaGravada = {
  frequencia_tipo: FrequenciaInformada['tipo'];
  intervalo_dias: number | null;
  dia_semana: number | null;
  dia_mes: number | null;
  ancora_em: string | null;
  proxima_em: string;
};

export type ColunasFrequenciaPlano = {
  frequencia_tipo: FrequenciaInformada['tipo'];
  intervalo_dias: number | null;
  dia_semana: number | null;
  dia_mes: number | null;
  ancora_em: string | null;
  proxima_em: string;
};

type FrequenciaCalculada = {
  frequencia: FrequenciaPlano;
  proximaEm: string;
};

export class GravacaoFrequenciaPlano {
  constructor(private readonly datas = new ProximaDataPreventiva()) {}

  hojeSp(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  }

  nova(frequencia: FrequenciaInformada, primeiraData: string): FrequenciaPlano {
    if (frequencia.tipo !== 'a_cada_n_dias') return frequencia;
    return {
      tipo: 'a_cada_n_dias',
      intervalo: frequencia.intervalo,
      ancora: primeiraData,
    };
  }

  doPlano(atual: PlanoFrequenciaGravada): FrequenciaPlano {
    if (atual.frequencia_tipo === 'a_cada_n_dias') return this.intervaloGravado(atual);
    if (atual.frequencia_tipo === 'semanal') {
      return { tipo: 'semanal', diaSemana: atual.dia_semana ?? 0 };
    }
    return { tipo: 'mensal', diaMes: atual.dia_mes ?? 0 };
  }

  recalcular(
    atual: PlanoFrequenciaGravada,
    nova: FrequenciaInformada,
    hoje: string,
  ): FrequenciaCalculada {
    const frequencia = this.frequenciaRecalculada(atual, nova, hoje);
    return { frequencia, proximaEm: this.datas.depoisDeHoje(frequencia, hoje) };
  }

  dataParaValidar(
    atual: PlanoFrequenciaGravada,
    frequencia: FrequenciaPlano,
    hoje: string,
  ): string {
    const proxima = this.dataCurta(atual.proxima_em);
    if (proxima >= hoje && this.datas.encaixa(frequencia, proxima)) return proxima;
    return this.datas.depoisDeHoje(frequencia, hoje);
  }

  colunas(frequencia: FrequenciaPlano, proximaEm: string): ColunasFrequenciaPlano {
    const base = this.colunasVazias(frequencia.tipo, proximaEm);
    if (frequencia.tipo === 'a_cada_n_dias') {
      return { ...base, intervalo_dias: frequencia.intervalo, ancora_em: frequencia.ancora };
    }
    if (frequencia.tipo === 'semanal') return { ...base, dia_semana: frequencia.diaSemana };
    return { ...base, dia_mes: frequencia.diaMes };
  }

  private intervaloGravado(atual: PlanoFrequenciaGravada): FrequenciaPlano {
    return {
      tipo: 'a_cada_n_dias',
      intervalo: atual.intervalo_dias ?? 0,
      ancora: this.dataCurta(atual.ancora_em ?? atual.proxima_em),
    };
  }

  private frequenciaRecalculada(
    atual: PlanoFrequenciaGravada,
    nova: FrequenciaInformada,
    hoje: string,
  ): FrequenciaPlano {
    if (nova.tipo === 'semanal') return { tipo: 'semanal', diaSemana: nova.diaSemana };
    if (nova.tipo === 'mensal') return { tipo: 'mensal', diaMes: nova.diaMes };
    const ancora = this.datas.depoisDeHoje(this.intervalo(atual, nova.intervalo, hoje), hoje);
    return { tipo: 'a_cada_n_dias', intervalo: nova.intervalo, ancora };
  }

  private intervalo(
    atual: PlanoFrequenciaGravada,
    intervalo: number,
    hoje: string,
  ): FrequenciaPlano {
    return { tipo: 'a_cada_n_dias', intervalo, ancora: this.ancora(atual, hoje) };
  }

  private ancora(atual: PlanoFrequenciaGravada, hoje: string): string {
    if (atual.frequencia_tipo !== 'a_cada_n_dias' || !atual.ancora_em) return hoje;
    return this.dataCurta(atual.ancora_em);
  }

  private colunasVazias(
    tipo: FrequenciaInformada['tipo'],
    proximaEm: string,
  ): ColunasFrequenciaPlano {
    return {
      frequencia_tipo: tipo,
      intervalo_dias: null,
      dia_semana: null,
      dia_mes: null,
      ancora_em: null,
      proxima_em: proximaEm,
    };
  }

  private dataCurta(valor: string): string {
    return valor.slice(0, 10);
  }
}
