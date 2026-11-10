import { CustoMedio } from './custo-medio';

export type PecaFinalizacao = { pecaId: string; quantidadeMilesimos: number };

export type PecaParaFinalizacao = {
  id: string;
  ativo: boolean;
  custoMedioCentavos: number | null;
  saldoMilesimos: number;
  codigo?: string;
};

export type LinhaFinalizada = {
  pecaId: string;
  quantidadeMilesimos: number;
  custoUnitarioCentavos: number;
  custoTotalCentavos: number;
};

type Recusa = { ok: false; mensagem: string };

type ResultadoHorario = { ok: true } | Recusa;

type ResultadoServicos = { ok: true; servicos: string } | Recusa;

type ResultadoPecas =
  | {
      ok: true;
      linhas: LinhaFinalizada[];
      custoPecasCentavos: number;
      faltando: string[];
    }
  | Recusa;

const MENSAGEM_QUANTIDADE = 'Informe uma quantidade maior que zero, com até 3 casas.';

export class OrdemFinalizacao {
  constructor(private readonly custoMedio = new CustoMedio()) {}

  validarHorarios(
    abertaEm: string,
    inicio: string,
    fim: string,
    agora: string,
  ): ResultadoHorario {
    const abertura = Date.parse(abertaEm);
    const inicioMs = Date.parse(inicio);
    const fimMs = Date.parse(fim);
    if (inicioMs < abertura) {
      return this.recusar('O início não pode ser antes da abertura.');
    }
    if (fimMs <= inicioMs) return this.recusar('O fim deve ser depois do início.');
    if (fimMs > Date.parse(agora)) return this.recusar('O fim não pode ficar no futuro.');
    return { ok: true };
  }

  validarServicos(servicos: string): ResultadoServicos {
    const texto = servicos.trim();
    if (!texto) return this.recusar('Informe os serviços executados.');
    return { ok: true, servicos: texto };
  }

  consolidarPecas(linhas: PecaFinalizacao[], pecas: PecaParaFinalizacao[]): ResultadoPecas {
    const bloqueio = this.bloqueioPecas(linhas, pecas);
    if (bloqueio) return bloqueio;

    const consolidadas = this.somarQuantidades(linhas).map((linha) => this.custear(linha, pecas));
    return {
      ok: true,
      linhas: consolidadas,
      custoPecasCentavos: this.somarCustos(consolidadas),
      faltando: this.pecasEmFalta(consolidadas, pecas),
    };
  }

  private bloqueioPecas(linhas: PecaFinalizacao[], pecas: PecaParaFinalizacao[]): Recusa | null {
    for (const linha of linhas) {
      const mensagem = this.mensagemLinha(linha, pecas);
      if (mensagem) return this.recusar(mensagem);
    }
    return null;
  }

  private mensagemLinha(linha: PecaFinalizacao, pecas: PecaParaFinalizacao[]): string | null {
    if (!this.quantidadeValida(linha.quantidadeMilesimos)) return MENSAGEM_QUANTIDADE;
    const encontrada = this.pecaDe(pecas, linha.pecaId);
    if (!encontrada) return 'Peça não encontrada.';
    if (!encontrada.ativo) return 'Peça inativa.';
    return null;
  }

  private quantidadeValida(quantidadeMilesimos: number): boolean {
    return Number.isInteger(quantidadeMilesimos) && quantidadeMilesimos > 0;
  }

  private somarQuantidades(linhas: PecaFinalizacao[]): PecaFinalizacao[] {
    const ordem: string[] = [];
    const totais = new Map<string, number>();
    for (const linha of linhas) {
      if (!totais.has(linha.pecaId)) ordem.push(linha.pecaId);
      const acumulado = totais.get(linha.pecaId) ?? 0;
      totais.set(linha.pecaId, acumulado + linha.quantidadeMilesimos);
    }
    return ordem.map((pecaId) => ({
      pecaId,
      quantidadeMilesimos: totais.get(pecaId) ?? 0,
    }));
  }

  private custear(linha: PecaFinalizacao, pecas: PecaParaFinalizacao[]): LinhaFinalizada {
    const unitario = this.pecaDe(pecas, linha.pecaId)?.custoMedioCentavos ?? 0;
    return {
      pecaId: linha.pecaId,
      quantidadeMilesimos: linha.quantidadeMilesimos,
      custoUnitarioCentavos: unitario,
      custoTotalCentavos: this.custoMedio.valorCentavos(linha.quantidadeMilesimos, unitario),
    };
  }

  private somarCustos(linhas: LinhaFinalizada[]): number {
    return linhas.reduce((soma, linha) => soma + linha.custoTotalCentavos, 0);
  }

  private pecasEmFalta(linhas: LinhaFinalizada[], pecas: PecaParaFinalizacao[]): string[] {
    return linhas.flatMap((linha) => this.rotuloSeFalta(linha, pecas));
  }

  private rotuloSeFalta(linha: LinhaFinalizada, pecas: PecaParaFinalizacao[]): string[] {
    const encontrada = this.pecaDe(pecas, linha.pecaId);
    if (!encontrada) return [];
    if (encontrada.saldoMilesimos - linha.quantidadeMilesimos >= 0) return [];
    return [this.rotuloFalta(encontrada)];
  }

  private rotuloFalta(peca: PecaParaFinalizacao): string {
    const codigo = peca.codigo?.trim() ?? '';
    return codigo || peca.id;
  }

  private pecaDe(pecas: PecaParaFinalizacao[], pecaId: string): PecaParaFinalizacao | undefined {
    return pecas.find((peca) => peca.id === pecaId);
  }

  private recusar(mensagem: string): Recusa {
    return { ok: false, mensagem };
  }
}
