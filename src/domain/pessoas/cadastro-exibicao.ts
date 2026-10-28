export class CadastroExibicao {
  cpf(valor: string | null): string {
    const digitos = (valor ?? '').replace(/\D/g, '');
    if (digitos.length !== 11) return valor?.trim() || '—';
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  }

  telefone(valor: string | null): string {
    const digitos = (valor ?? '').replace(/\D/g, '');
    if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    return valor?.trim() || '—';
  }

  texto(valor: string | null): string {
    return valor?.trim() || '—';
  }

  data(valor: string | null): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor ?? '');
    if (!match) return '—';
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  poupanca(valor: boolean): string {
    return valor ? 'Poupança' : 'Conta corrente';
  }

  vale(valor: boolean | null): string {
    if (valor === true) return 'Precisa';
    if (valor === false) return 'Não precisa';
    return '—';
  }
}
