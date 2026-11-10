import {
  ProximaDataPreventiva,
  type FrequenciaPlano,
} from './proxima-data-preventiva';

export type EntradaPlano = {
  maquinaId: string;
  descricao: string;
  frequencia: FrequenciaPlano;
  primeiraData: string;
  hojeSp: string;
};

export type MaquinaDoPlano = { id: string; ativo: boolean };

export type ResultadoPlano =
  | { ok: true; descricao: string; proximaEm: string; ancora?: string }
  | { ok: false; mensagem: string };

export class PlanoPreventivo {
  constructor(private readonly proxima = new ProximaDataPreventiva()) {}

  validar(entrada: EntradaPlano, maquina: MaquinaDoPlano | null): ResultadoPlano {
    const mensagem = this.recusa(entrada, maquina);
    if (mensagem) return { ok: false, mensagem };
    return this.aceitar(entrada);
  }

  private recusa(entrada: EntradaPlano, maquina: MaquinaDoPlano | null): string | null {
    return (
      this.recusaMaquina(entrada, maquina) ??
      this.recusaDescricao(entrada.descricao) ??
      this.recusaFrequencia(entrada.frequencia) ??
      this.recusaData(entrada) ??
      this.recusaEncaixe(entrada)
    );
  }

  private recusaMaquina(
    entrada: EntradaPlano,
    maquina: MaquinaDoPlano | null,
  ): string | null {
    if (!maquina || maquina.id !== entrada.maquinaId) return 'Máquina não encontrada.';
    if (!maquina.ativo) return 'Máquina inativa.';
    return null;
  }

  private recusaDescricao(descricao: string): string | null {
    if (descricao.trim()) return null;
    return 'Informe a descrição.';
  }

  private recusaFrequencia(freq: FrequenciaPlano): string | null {
    if (freq.tipo === 'a_cada_n_dias') return this.recusaIntervalo(freq.intervalo);
    if (freq.tipo === 'semanal') return this.recusaDiaSemana(freq.diaSemana);
    return this.recusaDiaMes(freq.diaMes);
  }

  private recusaIntervalo(intervalo: number): string | null {
    if (Number.isInteger(intervalo) && intervalo >= 1) return null;
    return 'Informe o intervalo em dias.';
  }

  private recusaDiaSemana(diaSemana: number): string | null {
    if (Number.isInteger(diaSemana) && diaSemana >= 1 && diaSemana <= 7) return null;
    return 'Informe o dia da semana.';
  }

  private recusaDiaMes(diaMes: number): string | null {
    if (Number.isInteger(diaMes) && diaMes >= 1 && diaMes <= 28) return null;
    return 'Informe o dia do mês.';
  }

  private recusaData(entrada: EntradaPlano): string | null {
    if (entrada.primeiraData < entrada.hojeSp) {
      return 'Informe uma data de hoje ou futura.';
    }
    return null;
  }

  private recusaEncaixe(entrada: EntradaPlano): string | null {
    if (this.proxima.encaixa(entrada.frequencia, entrada.primeiraData)) return null;
    return this.mensagemEncaixe(entrada.frequencia.tipo);
  }

  private mensagemEncaixe(tipo: FrequenciaPlano['tipo']): string {
    if (tipo === 'semanal') {
      return 'A primeira data deve cair no dia da semana escolhido.';
    }
    if (tipo === 'mensal') return 'A primeira data deve cair no dia do mês escolhido.';
    return 'A primeira data deve cair no intervalo escolhido.';
  }

  private aceitar(entrada: EntradaPlano): ResultadoPlano {
    const aceito = {
      ok: true as const,
      descricao: entrada.descricao.trim(),
      proximaEm: entrada.primeiraData,
    };
    if (entrada.frequencia.tipo !== 'a_cada_n_dias') return aceito;
    return { ...aceito, ancora: entrada.primeiraData };
  }
}
