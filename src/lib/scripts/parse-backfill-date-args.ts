const DATA_BR_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function formatarDataBr(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = String(date.getFullYear());
  return `${dia}/${mes}/${ano}`;
}

export function parseDataBr(valor: string, rotulo: string): string {
  const trimmed = valor.trim();
  const match = DATA_BR_REGEX.exec(trimmed);
  if (!match) {
    throw new Error(`${rotulo} inválida: use DD/MM/AAAA (ex.: 01/05/2026)`);
  }

  const [, dia, mes, ano] = match;
  const date = new Date(Number(ano), Number(mes) - 1, Number(dia));
  if (
    date.getFullYear() !== Number(ano) ||
    date.getMonth() !== Number(mes) - 1 ||
    date.getDate() !== Number(dia)
  ) {
    throw new Error(`${rotulo} inválida: ${trimmed}`);
  }

  return trimmed;
}

export function parseArgValor(prefixo: string): string | undefined {
  const arg = process.argv.find((item) => item.startsWith(`${prefixo}=`));
  return arg?.split('=').slice(1).join('=').trim() || undefined;
}
