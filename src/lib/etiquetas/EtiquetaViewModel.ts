import type { EtiquetaModelo } from '@/domain/etiquetas/etiqueta-geracao-types';
import { EtiquetaTituloManager } from '@/domain/etiquetas/etiqueta-titulo-manager';

export class EtiquetaViewModel {
  readonly titulo: string;
  readonly prefixo: string;
  readonly destaque: string;
  readonly categoria: string;
  readonly dataFabricacao: string;
  readonly lote: string;
  readonly diasValidadeAmbiente: string;
  readonly pesoLiquido: string;
  readonly unidadesPorCaixa: string;
  readonly pacotesPorCaixa: string;
  readonly codigoBarras: string;
  readonly gramaturaInformada: boolean;
  readonly gramaturas: Array<{ texto: string; selecionada: boolean }>;

  constructor(modelo: EtiquetaModelo) {
    const titulo = new EtiquetaTituloManager().split(modelo.titulo);
    this.titulo = modelo.titulo;
    this.prefixo = titulo.prefixo;
    this.destaque = titulo.destaque;
    this.categoria = modelo.categoria;
    this.dataFabricacao = modelo.dataFabricacao.split('-').reverse().join('/');
    this.lote = String(modelo.lote);
    this.diasValidadeAmbiente = String(modelo.diasValidadeAmbiente);
    this.pesoLiquido = modelo.pesoLiquidoKg.toLocaleString('pt-BR', {
      minimumFractionDigits: 3, maximumFractionDigits: 3,
    });
    this.unidadesPorCaixa = String(modelo.unidadesPorCaixa);
    this.pacotesPorCaixa = modelo.pacotesPorCaixa.toFixed(0);
    this.codigoBarras = modelo.codigoBarras;
    this.gramaturaInformada = modelo.gramatura !== null;
    this.gramaturas = modelo.gramaturasCategoria.map((gramatura) => ({
      texto: `${gramatura.toLocaleString('pt-BR')}g`,
      selecionada: gramatura === modelo.gramatura,
    }));
  }
}
