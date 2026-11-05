import type { FolhaBalde, FolhaPacote } from './folha-balde';
import { FolhaBaldeSoma } from './folha-balde';
import type { FolhaSetorAprovado } from './folha-aprovados';
import type { PlanoSaudeFaixa } from './plano-saude-faixa';
import { PlanoSaudeNaFolha } from './plano-saude-faixa';
import type { Regime } from './regime-cadastro';

export type FolhaSituacao = 'ativo' | 'admissao_prevista' | 'afastado';
export type FolhaRegimeFiltro = '' | Regime;
export type FolhaGrupoFiltro = '' | 'ativos' | 'a_entrar';

export type FolhaPessoa = {
  nome: string;
  situacao: FolhaSituacao;
  setorNome: string | null;
  regime: Regime;
  nascimento: string | null;
  pacote: FolhaPacote | null;
};

export type FolhaSetorLinha = {
  nome: string;
  ordem: number;
  aprovado: number;
  contratados: FolhaBalde;
  aEntrar: FolhaBalde;
  atual: FolhaBalde;
};

export type FolhaLacuna = {
  nome: string;
  setorNome: string;
  situacao: FolhaSituacao;
};

export type FolhaPlanoLacuna = {
  nome: string;
  setorNome: string;
  motivo: 'sem_nascimento' | 'sem_faixa';
};

export type FolhaPlanoContexto = {
  faixas: PlanoSaudeFaixa[];
  hoje: string;
};

export type FolhaResumoVista = {
  contratados: FolhaBalde;
  aEntrar: FolhaBalde;
  atual: FolhaBalde;
  foraDoPosto: number;
  aprovado: number;
  setores: FolhaSetorLinha[];
  lacunas: FolhaLacuna[];
  planosSemFaixa: FolhaPlanoLacuna[];
};

const SEM_SETOR = 'Sem setor';
const SEM_PLANO_CONTEXTO: FolhaPlanoContexto = { faixas: [], hoje: '' };

export class FolhaGrupoRotulo {
  principal(grupo: FolhaGrupoFiltro): string {
    if (grupo === 'ativos') return 'Ativos';
    if (grupo === 'a_entrar') return 'A entrar';
    return 'Ativos e a entrar';
  }

  frase(grupo: FolhaGrupoFiltro): string {
    if (grupo === 'ativos') return 'Esta conta soma só os ativos. Quem está a entrar aparece ao lado e não entra no total.';
    if (grupo === 'a_entrar') return 'Esta conta soma só quem está a entrar. Os ativos aparecem ao lado e não entram no total.';
    return 'Esta conta soma ativos e quem está a entrar.';
  }
}

export class FolhaResumo {
  private readonly soma = new FolhaBaldeSoma();
  private readonly plano = new PlanoSaudeNaFolha();

  montar(
    pessoas: FolhaPessoa[],
    setores: FolhaSetorAprovado[],
    regime: FolhaRegimeFiltro = '',
    grupo: FolhaGrupoFiltro = '',
    contexto: FolhaPlanoContexto = SEM_PLANO_CONTEXTO,
  ): FolhaResumoVista {
    const linhas = this.linhas(setores);
    const lacunas: FolhaLacuna[] = [];
    const planosSemFaixa: FolhaPlanoLacuna[] = [];
    let foraDoPosto = 0;
    for (const pessoa of pessoas) {
      if (regime && pessoa.regime !== regime) continue;
      if (pessoa.situacao === 'afastado') {
        foraDoPosto += 1;
        continue;
      }
      this.aplicar(this.garantir(linhas, pessoa.setorNome), pessoa, lacunas, planosSemFaixa, contexto);
    }
    const lista = [...linhas.values()].filter((linha) => this.visivel(linha));
    lista.forEach((linha) => {
      linha.atual = this.escolhido(linha, grupo);
    });
    lista.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
    this.ordenar(lacunas);
    this.ordenar(planosSemFaixa);
    return this.vista(lista, lacunas, planosSemFaixa, foraDoPosto);
  }

  private linhas(setores: FolhaSetorAprovado[]): Map<string, FolhaSetorLinha> {
    const mapa = new Map<string, FolhaSetorLinha>();
    for (const setor of setores) mapa.set(setor.nome, this.linha(setor));
    return mapa;
  }

  private linha(setor: FolhaSetorAprovado): FolhaSetorLinha {
    return {
      nome: setor.nome,
      ordem: setor.ordem,
      aprovado: setor.aprovado,
      contratados: this.soma.vazio(),
      aEntrar: this.soma.vazio(),
      atual: this.soma.vazio(),
    };
  }

  private garantir(linhas: Map<string, FolhaSetorLinha>, setorNome: string | null): FolhaSetorLinha {
    const nome = setorNome?.trim() || SEM_SETOR;
    const existente = linhas.get(nome);
    if (existente) return existente;
    const criada = this.linha({ nome, ordem: 10_000, aprovado: 0 });
    linhas.set(nome, criada);
    return criada;
  }

  private aplicar(
    linha: FolhaSetorLinha,
    pessoa: FolhaPessoa,
    lacunas: FolhaLacuna[],
    planosSemFaixa: FolhaPlanoLacuna[],
    contexto: FolhaPlanoContexto,
  ): void {
    const plano = this.plano.resolver(pessoa.pacote?.planoSaude === true, pessoa.nascimento, contexto.faixas, contexto.hoje);
    if (pessoa.situacao === 'ativo') linha.contratados = this.soma.comPessoa(linha.contratados, pessoa.pacote, plano);
    else linha.aEntrar = this.soma.comPessoa(linha.aEntrar, pessoa.pacote, plano);
    if (!pessoa.pacote) lacunas.push({ nome: pessoa.nome, setorNome: linha.nome, situacao: pessoa.situacao });
    if (plano.semFaixa && plano.motivo) planosSemFaixa.push({ nome: pessoa.nome, setorNome: linha.nome, motivo: plano.motivo });
  }

  private escolhido(linha: FolhaSetorLinha, grupo: FolhaGrupoFiltro): FolhaBalde {
    if (grupo === 'ativos') return { ...linha.contratados };
    if (grupo === 'a_entrar') return { ...linha.aEntrar };
    return this.soma.juntar([linha.contratados, linha.aEntrar]);
  }

  private visivel(linha: FolhaSetorLinha): boolean {
    return linha.aprovado > 0 || linha.contratados.pessoas + linha.aEntrar.pessoas > 0;
  }

  private ordenar(lista: { nome: string; setorNome: string }[]): void {
    lista.sort((a, b) => a.setorNome.localeCompare(b.setorNome, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  private vista(
    lista: FolhaSetorLinha[],
    lacunas: FolhaLacuna[],
    planosSemFaixa: FolhaPlanoLacuna[],
    foraDoPosto: number,
  ): FolhaResumoVista {
    return {
      contratados: this.soma.juntar(lista.map((linha) => linha.contratados)),
      aEntrar: this.soma.juntar(lista.map((linha) => linha.aEntrar)),
      atual: this.soma.juntar(lista.map((linha) => linha.atual)),
      foraDoPosto,
      aprovado: lista.reduce((total, linha) => total + linha.aprovado, 0),
      setores: lista,
      lacunas,
      planosSemFaixa,
    };
  }
}
