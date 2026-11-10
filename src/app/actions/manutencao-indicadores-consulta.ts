'use server';

import { ConversorSaldo } from '@/domain/manutencao/conversor-saldo';
import { IndicadoresManutencao, type OrdemIndicador, type SaidaManual } from '@/domain/manutencao/indicadores-manutencao';
import { PrecoCentavos } from '@/domain/manutencao/preco-centavos';
import { OrdemLeitura } from '@/app/actions/manutencao-ordem-leitura';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const FUSO = 'America/Sao_Paulo';
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export type LinhaIndicador = {
  maquinaId: string;
  nome: string;
  parada: string;
  execucao: string;
  pecas: string;
};

export type ParadaEmAndamento = {
  maquinaId: string;
  nome: string;
  parada: string;
};

export type IndicadoresCarregados = {
  inicio: string;
  fim: string;
  porMaquina: LinhaIndicador[];
  emAndamento: ParadaEmAndamento[];
  ajustes: string;
};

type Intervalo = { inicio: string; fim: string };
type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type Agregado = ReturnType<IndicadoresManutencao['agregar']>;
type OrdemLinha = {
  maquina_id: string;
  status: string;
  urgencia: string | null;
  aberta_em: string;
  inicio_em: string | null;
  fim_em: string | null;
  custo_pecas_centavos: number;
};
type SaidaLinha = {
  created_at: string;
  quantidade: string | number;
  preco_unitario_centavos: number;
};

export async function carregarIndicadores(inicio?: string, fim?: string): Promise<IndicadoresCarregados> {
  await requireInternoModulo('interno_manutencao', 'ler');
  const periodo = new PeriodoIndicadores().resolver(inicio, fim);
  const janela = new JanelaSaoPaulo(periodo);
  const leitura = new LeituraIndicadores(supabaseClientFactory.createServiceRoleClient());
  const [ordens, saidas] = await Promise.all([leitura.ordens(janela), leitura.saidas(janela)]);
  const agregado = new IndicadoresManutencao().agregar({
    inicioPeriodo: periodo.inicio,
    fimPeriodo: periodo.fim,
    agoraIso: new Date().toISOString(),
    ordens,
    saidas,
  });
  return new FormatoIndicadores().montar(periodo, agregado);
}

class PeriodoIndicadores {
  resolver(inicio?: string, fim?: string): Intervalo {
    if (this.dia(inicio) && this.dia(fim) && inicio <= fim) return { inicio, fim };
    return this.mesAtual();
  }

  private mesAtual(agora = new Date()): Intervalo {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(agora);
    const ano = Number(partes.find((parte) => parte.type === 'year')?.value);
    const mes = Number(partes.find((parte) => parte.type === 'month')?.value);
    const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const mm = String(mes).padStart(2, '0');
    return { inicio: `${ano}-${mm}-01`, fim: `${ano}-${mm}-${String(ultimo).padStart(2, '0')}` };
  }

  private dia(valor?: string): valor is string {
    if (!valor || !DATA.test(valor)) return false;
    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  }
}

class JanelaSaoPaulo {
  constructor(private readonly periodo: Intervalo) {}

  desde(): string {
    return `${this.periodo.inicio}T00:00:00.000-03:00`;
  }

  ate(): string {
    return `${this.seguinte(this.periodo.fim)}T00:00:00.000-03:00`;
  }

  private seguinte(iso: string): string {
    const [ano, mes, dia] = iso.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia + 1)).toISOString().slice(0, 10);
  }
}

class LeituraIndicadores {
  constructor(private readonly client: Cliente) {}

  async ordens(janela: JanelaSaoPaulo): Promise<OrdemIndicador[]> {
    const linhas = [...(await this.finalizadas(janela)), ...(await this.paradasAbertas())];
    const nomes = await new OrdemLeitura(this.client).nomesPorId(
      'manutencao_maquinas',
      linhas.map((linha) => linha.maquina_id),
    );
    return linhas.map((linha) => this.paraOrdem(linha, nomes));
  }

  async saidas(janela: JanelaSaoPaulo): Promise<SaidaManual[]> {
    const { data, error } = await this.client
      .from('manutencao_estoque_movimentos' as never)
      .select('created_at, quantidade, preco_unitario_centavos')
      .eq('tipo', 'saida_manual')
      .gte('created_at', janela.desde())
      .lt('created_at', janela.ate());
    if (error) throw new Error(error.message);
    return ((data ?? []) as SaidaLinha[]).map((linha) => this.paraSaida(linha));
  }

  private async finalizadas(janela: JanelaSaoPaulo): Promise<OrdemLinha[]> {
    const { data, error } = await this.client
      .from('manutencao_ordens' as never)
      .select('maquina_id, status, urgencia, aberta_em, inicio_em, fim_em, custo_pecas_centavos')
      .eq('status', 'finalizada')
      .gte('fim_em', janela.desde())
      .lt('fim_em', janela.ate());
    if (error) throw new Error(error.message);
    return (data ?? []) as OrdemLinha[];
  }

  private async paradasAbertas(): Promise<OrdemLinha[]> {
    const { data, error } = await this.client
      .from('manutencao_ordens' as never)
      .select('maquina_id, status, urgencia, aberta_em, inicio_em, fim_em, custo_pecas_centavos')
      .in('status', ['aberta', 'recebida'])
      .eq('urgencia', 'maquina_parou');
    if (error) throw new Error(error.message);
    return (data ?? []) as OrdemLinha[];
  }

  private paraOrdem(linha: OrdemLinha, nomes: Map<string, string>): OrdemIndicador {
    return {
      maquinaId: linha.maquina_id,
      maquinaNome: nomes.get(linha.maquina_id) || 'Máquina',
      status: linha.status,
      urgencia: linha.urgencia,
      abertaEm: linha.aberta_em,
      inicioEm: linha.inicio_em,
      fimEm: linha.fim_em,
      custoPecasCentavos: linha.custo_pecas_centavos,
    };
  }

  private paraSaida(linha: SaidaLinha): SaidaManual {
    return {
      createdAt: linha.created_at,
      quantidade: new ConversorSaldo().emMilesimos(linha.quantidade) / 1000,
      precoUnitarioCentavos: linha.preco_unitario_centavos,
    };
  }
}

class DuracaoMinutos {
  formatar(minutos: number): string {
    const total = Math.max(0, Math.trunc(minutos));
    const horas = Math.trunc(total / 60);
    const resto = String(total % 60).padStart(2, '0');
    return `${horas}h ${resto}min`;
  }
}

class ReaisCentavos {
  constructor(private readonly precos = new PrecoCentavos()) {}

  formatar(centavos: number): string {
    return `R$ ${this.precos.formatar(centavos)}`;
  }
}

class FormatoIndicadores {
  constructor(
    private readonly duracao = new DuracaoMinutos(),
    private readonly reais = new ReaisCentavos(),
  ) {}

  montar(periodo: Intervalo, agregado: Agregado): IndicadoresCarregados {
    return {
      inicio: periodo.inicio,
      fim: periodo.fim,
      porMaquina: this.porMaquina(agregado.porMaquina),
      emAndamento: this.andamento(agregado.emAndamento),
      ajustes: this.reais.formatar(agregado.ajustesCentavos),
    };
  }

  private porMaquina(linhas: Agregado['porMaquina']): LinhaIndicador[] {
    return [...linhas].sort(porNome).map((linha) => ({
      maquinaId: linha.maquinaId,
      nome: linha.nome,
      parada: this.duracao.formatar(linha.paradaMinutos),
      execucao: this.duracao.formatar(linha.execucaoMinutos),
      pecas: this.reais.formatar(linha.custoPecasCentavos),
    }));
  }

  private andamento(linhas: Agregado['emAndamento']): ParadaEmAndamento[] {
    return [...linhas].sort(porNome).map((linha) => ({
      maquinaId: linha.maquinaId,
      nome: linha.nome,
      parada: this.duracao.formatar(linha.paradaMinutos),
    }));
  }
}

function porNome(esquerda: { nome: string }, direita: { nome: string }): number {
  return esquerda.nome.localeCompare(direita.nome, 'pt-BR');
}
