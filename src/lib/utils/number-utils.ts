/**
 * Utilitários para formatação de números
 */

/**
 * Formata um número com separador de milhar no padrão brasileiro (pt-BR)
 * 
 * @param value - Número a ser formatado
 * @param options - Opções de formatação:
 *   - decimals: Número de casas decimais (padrão: 0 para inteiros, 2 para decimais)
 *   - minimumFractionDigits: Número mínimo de casas decimais
 *   - maximumFractionDigits: Número máximo de casas decimais
 * 
 * @example
 * formatNumberWithThousands(1234) // "1.234"
 * formatNumberWithThousands(1234.56) // "1.234,56"
 * formatNumberWithThousands(1234.5, { decimals: 2 }) // "1.234,50"
 */
export function formatNumberWithThousands(
  value: number,
  options?: {
    decimals?: number;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  if (isNaN(value) || !isFinite(value)) {
    return '0';
  }

  // Se for inteiro, não mostrar decimais por padrão
  const isInteger = Number.isInteger(value);
  
  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: options?.minimumFractionDigits ?? (isInteger ? 0 : 2),
    maximumFractionDigits: options?.maximumFractionDigits ?? (options?.decimals ?? (isInteger ? 0 : 2)),
  };

  return new Intl.NumberFormat('pt-BR', formatOptions).format(value);
}

/**
 * Formata um número inteiro com separador de milhar (sem decimais)
 * 
 * @param value - Número a ser formatado
 * 
 * @example
 * formatIntegerWithThousands(1234) // "1.234"
 * formatIntegerWithThousands(1234567) // "1.234.567"
 */
export function formatIntegerWithThousands(value: number): string {
  return formatNumberWithThousands(Math.floor(value), { decimals: 0 });
}

/**
 * Formata um número decimal com separador de milhar (2 casas decimais)
 * 
 * @param value - Número a ser formatado
 * 
 * @example
 * formatDecimalWithThousands(1234.56) // "1.234,56"
 * formatDecimalWithThousands(1234.5) // "1.234,50"
 */
export function formatDecimalWithThousands(value: number): string {
  return formatNumberWithThousands(value, { decimals: 2 });
}


