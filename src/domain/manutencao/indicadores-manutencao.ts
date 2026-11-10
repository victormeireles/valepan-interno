import { CustoMedio } from './custo-medio';
import { TempoOrdem } from './tempo-ordem';

const STATUS_FINALIZADA = 'finalizada';
const URGENCIA_PARADA = 'maquina_parou';
const STATUS_ANDAMENTO = new Set(['aberta', 'recebida']);
const FUSO_SAO_PAULO = 'America/Sao_Paulo';
const MILESIMOS_POR_UNIDADE = 1000;

export type OrdemIndicador = {
  maquinaId: string;
  maquinaNome: string;
  status: string;
  urgencia: string | null;
  abertaEm: string;
  inicioEm: string | null;
  fimEm: string | null;
  custoPecasCentavos: number;
};

export type SaidaManual = {
  createdAt: string;
  quantidade: number;
  precoUnitarioCentavos: number;
};

type PedidoIndicadores = {
  inicioPeriodo: string;
  fimPeriodo: string;
  agoraIso: string;
  ordens: OrdemIndicador[];
  saidas: SaidaManual[];
};

type LinhaMaquina = {
  maquinaId: string;
  nome: string;
  paradaMinutos: number;
  execucaoMinutos: number;
  custoPecasCentavos: number;
};

type ParadaAndamento = {
  maquinaId: string;
  nome: string;
  paradaMinutos: number;
};

type ResultadoIndicadores = {
  porMaquina: LinhaMaquina[];
  emAndamento: ParadaAndamento[];
  ajustesCentavos: number;
};

class DiaCivilSaoPaulo {
  contem(iso: string, inicio: string, fim: string): boolean {
    const dia = this.deIso(iso);
    return dia >= inicio && dia <= fim;
  }

  private deIso(iso: string): string {
    const instante = new Date(iso);
    if (Number.isNaN(instante.getTime())) return '';
    return this.juntar(this.partes(instante));
  }

  private partes(instante: Date): Intl.DateTimeFormatPart[] {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO_SAO_PAULO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instante);
  }

  private juntar(partes: Intl.DateTimeFormatPart[]): string {
    const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((parte) => parte.type === tipo)?.value ?? '';
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
  }
}

class AcumuladorMaquina {
  private readonly linhas = new Map<string, LinhaMaquina>();

  somar(ordem: OrdemIndicador, parada: number, execucao: number): void {
    const atual = this.linhas.get(ordem.maquinaId) ?? this.vazia(ordem);
    atual.paradaMinutos += parada;
    atual.execucaoMinutos += execucao;
    atual.custoPecasCentavos += ordem.custoPecasCentavos;
    this.linhas.set(ordem.maquinaId, atual);
  }

  listar(): LinhaMaquina[] {
    return [...this.linhas.values()];
  }

  private vazia(ordem: OrdemIndicador): LinhaMaquina {
    return {
      maquinaId: ordem.maquinaId,
      nome: ordem.maquinaNome,
      paradaMinutos: 0,
      execucaoMinutos: 0,
      custoPecasCentavos: 0,
    };
  }
}

export class IndicadoresManutencao {
  constructor(
    private readonly tempo = new TempoOrdem(),
    private readonly custo = new CustoMedio(),
    private readonly calendario = new DiaCivilSaoPaulo(),
  ) {}

  agregar(args: PedidoIndicadores): ResultadoIndicadores {
    return {
      porMaquina: this.porMaquina(args),
      emAndamento: this.emAndamento(args),
      ajustesCentavos: this.ajustes(args),
    };
  }

  private porMaquina(args: PedidoIndicadores): LinhaMaquina[] {
    const totais = new AcumuladorMaquina();
    for (const ordem of args.ordens) this.acumularFechada(totais, ordem, args);
    return totais.listar();
  }

  private acumularFechada(totais: AcumuladorMaquina, ordem: OrdemIndicador, args: PedidoIndicadores): void {
    if (!this.finalizadaNoPeriodo(ordem, args)) return;
    totais.somar(ordem, this.paradaFechada(ordem), this.execucaoFechada(ordem));
  }

  private finalizadaNoPeriodo(ordem: OrdemIndicador, args: PedidoIndicadores): boolean {
    if (ordem.status !== STATUS_FINALIZADA || !ordem.fimEm) return false;
    return this.calendario.contem(ordem.fimEm, args.inicioPeriodo, args.fimPeriodo);
  }

  private paradaFechada(ordem: OrdemIndicador): number {
    if (!ordem.fimEm) return 0;
    return this.tempo.paradaMinutos(ordem.urgencia ?? '', ordem.abertaEm, ordem.fimEm);
  }

  private execucaoFechada(ordem: OrdemIndicador): number {
    if (!ordem.inicioEm || !ordem.fimEm) return 0;
    return this.tempo.execucaoMinutos(ordem.inicioEm, ordem.fimEm);
  }

  private emAndamento(args: PedidoIndicadores): ParadaAndamento[] {
    return args.ordens.filter((ordem) => this.paradaAberta(ordem)).map((ordem) => this.linhaAndamento(ordem, args));
  }

  private paradaAberta(ordem: OrdemIndicador): boolean {
    return STATUS_ANDAMENTO.has(ordem.status) && ordem.urgencia === URGENCIA_PARADA;
  }

  private linhaAndamento(ordem: OrdemIndicador, args: PedidoIndicadores): ParadaAndamento {
    return {
      maquinaId: ordem.maquinaId,
      nome: ordem.maquinaNome,
      paradaMinutos: this.tempo.paradaMinutos(URGENCIA_PARADA, ordem.abertaEm, args.agoraIso),
    };
  }

  private ajustes(args: PedidoIndicadores): number {
    return args.saidas.reduce((total, saida) => total + this.custoSaida(saida, args), 0);
  }

  private custoSaida(saida: SaidaManual, args: PedidoIndicadores): number {
    if (!this.noPeriodo(saida.createdAt, args)) return 0;
    const milesimos = Math.round(saida.quantidade * MILESIMOS_POR_UNIDADE);
    return this.custo.valorCentavos(milesimos, saida.precoUnitarioCentavos);
  }

  private noPeriodo(iso: string, args: PedidoIndicadores): boolean {
    return this.calendario.contem(iso, args.inicioPeriodo, args.fimPeriodo);
  }
}
