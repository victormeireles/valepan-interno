import { MaquinaCodigo } from './maquina-codigo';
import { SetorOperacional, type SetorLinha } from './setor-operacional';

export type MaquinaEntrada = {
  codigo: string;
  nome: string;
  setorId: string;
  observacao: string;
  ativo: boolean;
};

export type MaquinaLinhaValidada = {
  codigo: string;
  nome: string;
  setorId: string;
  observacao: string | null;
  ativo: boolean;
};

export type ResultadoMaquinaCadastro =
  | { ok: true; linha: MaquinaLinhaValidada }
  | { ok: false; mensagem: string };

type MaquinaUsada = { id: string; codigo: string };

export class MaquinaCadastro {
  constructor(
    private readonly maquinaCodigo = new MaquinaCodigo(),
    private readonly setorOperacional = new SetorOperacional(),
  ) {}

  validar(
    entrada: MaquinaEntrada,
    setores: SetorLinha[],
    usadas: MaquinaUsada[],
    proprioId?: string,
  ): ResultadoMaquinaCadastro {
    const codigo = this.maquinaCodigo.normalizar(entrada.codigo);
    if (!codigo) return { ok: false, mensagem: 'Informe o código.' };

    const nome = entrada.nome.trim();
    if (!nome) return { ok: false, mensagem: 'Informe o nome.' };

    if (!this.setorLiberado(entrada.setorId, setores)) {
      return { ok: false, mensagem: 'Escolha um setor operacional ativo.' };
    }

    if (this.codigoEmUso(codigo, usadas, proprioId)) {
      return { ok: false, mensagem: 'Já existe uma máquina com esse código.' };
    }

    return { ok: true, linha: this.montarLinha(entrada, codigo, nome) };
  }

  private setorLiberado(setorId: string, setores: SetorLinha[]): boolean {
    const setor = setores.find((item) => item.id === setorId);
    return setor !== undefined && this.setorOperacional.elegivel(setor);
  }

  private codigoEmUso(
    codigo: string,
    usadas: MaquinaUsada[],
    proprioId?: string,
  ): boolean {
    const chave = this.maquinaCodigo.chave(codigo);
    return usadas.some(
      (usada) =>
        usada.id !== proprioId && this.maquinaCodigo.chave(usada.codigo) === chave,
    );
  }

  private montarLinha(
    entrada: MaquinaEntrada,
    codigo: string,
    nome: string,
  ): MaquinaLinhaValidada {
    const observacao = entrada.observacao.trim();
    return {
      codigo,
      nome,
      setorId: entrada.setorId,
      observacao: observacao || null,
      ativo: entrada.ativo,
    };
  }
}
