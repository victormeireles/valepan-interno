import { RemuneracaoCentavos } from './remuneracao-centavos';

export type PlanoSaudeFaixa = {
  id: string;
  idadeMin: number;
  idadeMax: number | null;
  valorCentavos: number;
  ordem: number;
};

export type PlanoSaudeFaixaEntrada = {
  idadeMin: number;
  idadeMax: number | null;
  valorCentavos: number;
};

export type PlanoNaFolha = {
  centavos: number;
  semFaixa: boolean;
  motivo: 'sem_nascimento' | 'sem_faixa' | null;
};

const SEM_PLANO: PlanoNaFolha = { centavos: 0, semFaixa: false, motivo: null };

export class IdadeCivil {
  anos(nascimento: string | null, hoje: string): number | null {
    if (!nascimento || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento) || !/^\d{4}-\d{2}-\d{2}$/.test(hoje)) return null;
    const [anoN, mesN, diaN] = nascimento.split('-').map(Number);
    const [anoH, mesH, diaH] = hoje.split('-').map(Number);
    let idade = anoH - anoN;
    if (mesH < mesN || (mesH === mesN && diaH < diaN)) idade -= 1;
    return idade >= 0 ? idade : null;
  }
}

export class PlanoSaudeFaixaConsulta {
  valor(faixas: Pick<PlanoSaudeFaixa, 'idadeMin' | 'idadeMax' | 'valorCentavos'>[], idade: number): number | null {
    const faixa = faixas.find((item) => idade >= item.idadeMin && (item.idadeMax === null || idade <= item.idadeMax));
    return faixa ? faixa.valorCentavos : null;
  }
}

export class PlanoSaudeNaFolha {
  private readonly idade = new IdadeCivil();
  private readonly faixas = new PlanoSaudeFaixaConsulta();

  resolver(marcado: boolean, nascimento: string | null, lista: PlanoSaudeFaixa[], hoje: string): PlanoNaFolha {
    if (!marcado) return SEM_PLANO;
    const anos = this.idade.anos(nascimento, hoje);
    if (anos === null) return { centavos: 0, semFaixa: true, motivo: nascimento ? 'sem_faixa' : 'sem_nascimento' };
    const valor = this.faixas.valor(lista, anos);
    if (valor === null) return { centavos: 0, semFaixa: true, motivo: 'sem_faixa' };
    return { centavos: valor, semFaixa: false, motivo: null };
  }
}

export class PlanoSaudeFaixaNormalizador {
  private readonly centavos = new RemuneracaoCentavos();

  normalizar(entrada: { idadeMin: string; idadeMax: string; valor: string }): PlanoSaudeFaixaEntrada {
    const idadeMin = this.inteiro(entrada.idadeMin, 'Informe a idade inicial.', 'Idade inicial inválida.');
    const idadeMax = this.maximo(entrada.idadeMax);
    if (idadeMax !== null && idadeMax < idadeMin) throw new Error('A idade final fica antes da inicial.');
    return {
      idadeMin,
      idadeMax,
      valorCentavos: this.centavos.interpretar(entrada.valor, 'Informe o valor mensal.', 'Valor mensal alto demais.'),
    };
  }

  private maximo(valor: string): number | null {
    if (!valor.trim()) return null;
    return this.inteiro(valor, 'Informe a idade final.', 'Idade final inválida.');
  }

  private inteiro(valor: string, vazio: string, invalido: string): number {
    const texto = valor.trim();
    if (!texto) throw new Error(vazio);
    if (!/^\d+$/.test(texto)) throw new Error(invalido);
    return Number(texto);
  }
}

export class PlanoSaudeFaixaConflito {
  cruza(faixas: Pick<PlanoSaudeFaixa, 'id' | 'idadeMin' | 'idadeMax'>[], candidata: PlanoSaudeFaixaEntrada, ignorarId?: string): boolean {
    return faixas.some((faixa) => faixa.id !== ignorarId && this.sobrepoe(faixa, candidata));
  }

  private sobrepoe(
    faixa: Pick<PlanoSaudeFaixa, 'idadeMin' | 'idadeMax'>,
    candidata: PlanoSaudeFaixaEntrada,
  ): boolean {
    const fimAtual = faixa.idadeMax ?? Number.POSITIVE_INFINITY;
    const fimNova = candidata.idadeMax ?? Number.POSITIVE_INFINITY;
    return candidata.idadeMin <= fimAtual && faixa.idadeMin <= fimNova;
  }
}

export class PlanoSaudeFaixaRotulo {
  exibir(faixa: Pick<PlanoSaudeFaixa, 'idadeMin' | 'idadeMax'>): string {
    if (faixa.idadeMax === null) return `${faixa.idadeMin.toLocaleString('pt-BR')} anos ou mais`;
    return `${faixa.idadeMin.toLocaleString('pt-BR')} a ${faixa.idadeMax.toLocaleString('pt-BR')} anos`;
  }
}

export class PlanoSaudeFaixaLeitura {
  parseAll(rows: unknown): PlanoSaudeFaixa[] {
    if (!Array.isArray(rows)) throw new Error('Erro ao ler as faixas do plano de saúde.');
    return rows.map((row, index) => this.parse(row, index));
  }

  private parse(row: unknown, index: number): PlanoSaudeFaixa {
    if (!row || typeof row !== 'object') throw new Error(`Erro ao ler a faixa ${index}.`);
    const linha = row as Record<string, unknown>;
    const id = typeof linha.id === 'string' ? linha.id : '';
    if (!id || typeof linha.idade_min !== 'number' || typeof linha.valor_centavos !== 'number') {
      throw new Error(`Erro ao ler a faixa ${index}.`);
    }
    return {
      id,
      idadeMin: linha.idade_min,
      idadeMax: typeof linha.idade_max === 'number' ? linha.idade_max : null,
      valorCentavos: linha.valor_centavos,
      ordem: typeof linha.ordem === 'number' ? linha.ordem : linha.idade_min,
    };
  }
}
