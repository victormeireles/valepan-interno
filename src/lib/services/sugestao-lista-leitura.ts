import { SugestaoDataHora } from '@/domain/sugestoes/sugestao-data-hora';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';

export type SugestaoListaBruta = {
  id: string; tema: string; texto: string; fotoPath: string | null; criadoEm: string; nome: string;
};

export type SugestaoListaItem = {
  id: string; quando: string; nome: string; rotulo: string; texto: string; fotoUrl: string | null;
};

export interface SugestaoListaFonte {
  buscar(tema: string | null): Promise<SugestaoListaBruta[]>;
}

export class SugestaoListaLeitura {
  constructor(
    private readonly fonte: SugestaoListaFonte,
    private readonly fotos: { signedUrls(paths: string[]): Promise<Map<string, string>> },
    private readonly datas = new SugestaoDataHora(),
    private readonly temas = new SugestaoTemaCatalogo(),
  ) {}

  async listar(tema: string | null): Promise<SugestaoListaItem[]> {
    const filtro = tema && this.temas.aceita(tema) ? tema : null;
    const linhas = await this.fonte.buscar(filtro);
    const urls = await this.urls(linhas);
    return linhas.map((linha) => this.item(linha, urls));
  }

  private async urls(linhas: SugestaoListaBruta[]): Promise<Map<string, string>> {
    try {
      return await this.fotos.signedUrls(linhas.flatMap((linha) => linha.fotoPath ? [linha.fotoPath] : []));
    } catch {
      return new Map();
    }
  }

  private item(linha: SugestaoListaBruta, urls: Map<string, string>): SugestaoListaItem {
    return {
      id: linha.id,
      quando: this.datas.formatar(linha.criadoEm),
      nome: linha.nome,
      rotulo: this.temas.rotulo(linha.tema),
      texto: linha.texto,
      fotoUrl: linha.fotoPath ? urls.get(linha.fotoPath) ?? null : null,
    };
  }
}
