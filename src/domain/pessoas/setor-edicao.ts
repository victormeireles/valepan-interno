export type SetorTipo = 'operacional' | 'apoio';

export type SetorEdicaoItem = {
  codigo: string;
  nome: string;
  tipo: SetorTipo;
};

export type SetorEdicaoContexto = {
  codigo: string;
  nome: string;
  tipo: string;
  ativo: boolean;
};

export type SetorEdicaoEntrada = {
  codigo: string;
  nome: string;
  tipo: string;
};

type SetorEdicaoValida = { ok: true; valor: SetorEdicaoItem };
type SetorEdicaoRecusada = { ok: false; mensagem: string };

export class SetorEdicao {
  listarAtivos(existentes: SetorEdicaoContexto[]): SetorEdicaoItem[] {
    return existentes.flatMap((item) => {
      if (!item.ativo || !this.tipoValido(item.tipo)) return [];
      return [{ codigo: item.codigo, nome: item.nome, tipo: item.tipo }];
    });
  }

  validar(entrada: SetorEdicaoEntrada, existentes: SetorEdicaoContexto[]): SetorEdicaoValida | SetorEdicaoRecusada {
    const codigo = entrada.codigo.trim();
    const nome = entrada.nome.trim();
    const atual = existentes.find((item) => item.codigo === codigo && item.ativo);
    if (!atual) return { ok: false, mensagem: 'Setor não encontrado.' };
    if (!nome) return { ok: false, mensagem: 'Informe o nome do setor.' };
    if (!this.tipoValido(entrada.tipo)) return { ok: false, mensagem: 'Tipo de setor inválido.' };
    if (this.nomeRepetido(nome, codigo, existentes)) {
      return { ok: false, mensagem: 'Já existe um setor com esse nome.' };
    }
    return { ok: true, valor: { codigo, nome, tipo: entrada.tipo } };
  }

  private tipoValido(tipo: string): tipo is SetorTipo {
    return tipo === 'operacional' || tipo === 'apoio';
  }

  private nomeRepetido(nome: string, codigo: string, existentes: SetorEdicaoContexto[]): boolean {
    const comparavel = nome.toLocaleLowerCase('pt-BR');
    return existentes.some(
      (item) => item.codigo !== codigo && item.nome.trim().toLocaleLowerCase('pt-BR') === comparavel,
    );
  }
}
