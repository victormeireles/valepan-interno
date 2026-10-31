import { CnpjVerificador } from './cnpj-verificador';

export type Regime = 'clt' | 'pj';

export type RegimeCadastro = {
  regime: Regime;
  cnpj: string | null;
  razaoSocial: string | null;
};

const LIMITE_RAZAO_SOCIAL = 200;

export class RegimeCadastroNormalizador {
  private readonly cnpjs = new CnpjVerificador();

  normalizar(entrada: Record<string, string>): RegimeCadastro {
    const regime = this.regime(entrada.regime);
    if (regime === 'clt') return { regime, cnpj: null, razaoSocial: null };
    return {
      regime,
      cnpj: this.cnpj(entrada.cnpj),
      razaoSocial: this.razaoSocial(entrada.razaoSocial),
    };
  }

  private regime(valor: string | undefined): Regime {
    const texto = (valor ?? '').trim();
    if (!texto || texto === 'clt') return 'clt';
    if (texto === 'pj') return 'pj';
    throw new Error('Regime inválido.');
  }

  private cnpj(valor: string | undefined): string | null {
    const digitos = (valor ?? '').replace(/\D/g, '');
    if (!digitos) return null;
    if (!this.cnpjs.verificar(digitos)) throw new Error('CNPJ inválido.');
    return digitos;
  }

  private razaoSocial(valor: string | undefined): string | null {
    const texto = (valor ?? '').trim();
    if (!texto) return null;
    if (texto.length > LIMITE_RAZAO_SOCIAL) throw new Error('Razão social longa demais.');
    return texto;
  }
}
