import { diaAnteriorLabelFromDia } from './fluxo-processo-format';

/** Copy do gráfico/card: janela, nunca “no dia”. */
export class FluxoJanelaGraficoCopy {
  static readonly TITULO = 'Por hora nesta janela';
  static readonly PREVISTO = 'previsto nesta janela';

  static caption(totalFmt: string, unit: string, outraOpSuffix: string): string {
    const base = `${totalFmt} ${unit} nesta janela · empilhado por assadeira`;
    return outraOpSuffix ? `${base}${outraOpSuffix}` : base;
  }

  static outraOpCaption(qtyFmt: string, outraOpData: string | null | undefined): string {
    return ` · ${qtyFmt} de ${this.outraOpLabel(outraOpData)}`;
  }

  static outraOpLabel(outraOpData: string | null | undefined): string {
    const ddMm = this.ddMmFromIso(outraOpData);
    return ddMm ? `OP ${ddMm}` : 'outra OP';
  }

  static cardOpLabel(
    outraOpData: string | null | undefined,
    fallbackDia: string,
  ): string {
    const ddMm = this.ddMmFromIso(outraOpData) ?? diaAnteriorLabelFromDia(fallbackDia);
    return `OP ${ddMm}`;
  }

  static hachura(outraOpData: string | null | undefined): string {
    return `hachurado = ${this.outraOpLabel(outraOpData)}`;
  }

  private static ddMmFromIso(dataOp: string | null | undefined): string | null {
    if (!dataOp) return null;
    const match = dataOp.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return `${match[3]}/${match[2]}`;
  }
}
