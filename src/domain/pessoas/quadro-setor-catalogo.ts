import type { QuadroSetor } from './quadro-agrupamento';

export type SetorCatalogoItem = {
  codigo: string;
  nome: string;
  ordem: number;
};

export class QuadroSetorCatalogo {
  completar(agrupados: QuadroSetor[], catalogo: SetorCatalogoItem[]): QuadroSetor[] {
    const porNome = new Map(agrupados.map((setor) => [setor.setorNome, setor]));
    return [...catalogo]
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((item) => {
        const atual = porNome.get(item.nome);
        if (atual) {
          return { ...atual, setorCodigo: item.codigo, ordem: item.ordem };
        }
        return {
          setorNome: item.nome,
          setorCodigo: item.codigo,
          ordem: item.ordem,
          turnos: [],
          apoio: [],
          liderNome: null,
        };
      });
  }

  mover(codigos: string[], de: number, para: number): string[] {
    if (de < 0 || para < 0 || de >= codigos.length || para >= codigos.length || de === para) {
      return [...codigos];
    }
    const proxima = [...codigos];
    const [item] = proxima.splice(de, 1);
    proxima.splice(para, 0, item);
    return proxima;
  }
}
