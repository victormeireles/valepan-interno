import { RemuneracaoCentavos } from './remuneracao-centavos';

export type RemuneracaoPacote = {
  inicio: string;
  salarioCentavos: number;
  valeTransporteCentavos: number;
  valeAlimentacaoCentavos: number;
  planoSaude: boolean;
};

export class RemuneracaoPacoteNormalizador {
  constructor(private readonly centavos = new RemuneracaoCentavos()) {}

  normalizar(entrada: Record<string, string>): RemuneracaoPacote {
    return {
      inicio: this.inicio(entrada.inicio),
      salarioCentavos: this.centavos.interpretar(entrada.salario, 'Informe o salário.', 'Salário alto demais.'),
      valeTransporteCentavos: this.centavos.interpretar(
        entrada.valeTransporteValor,
        'Informe o valor do vale transporte.',
        'Valor do vale transporte alto demais.',
      ),
      valeAlimentacaoCentavos: this.centavos.interpretar(
        entrada.valeAlimentacao,
        'Informe o vale alimentação/refeição.',
        'Vale alimentação/refeição alto demais.',
      ),
      planoSaude: this.plano(entrada.planoSaude),
    };
  }

  private inicio(valor: string | undefined): string {
    const texto = (valor ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw new Error('Informe a data de início.');
    const [ano, mes, dia] = texto.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    const real = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
    if (!real) throw new Error('Informe a data de início.');
    return texto;
  }

  private plano(valor: string | undefined): boolean {
    if (valor !== '0' && valor !== '1') throw new Error('Informe o plano de saúde.');
    return valor === '1';
  }
}
