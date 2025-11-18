/**
 * Utilitários de data que sempre trabalham no timezone do Brasil (America/Sao_Paulo)
 * Garante que as datas sejam consistentes independente do timezone do servidor
 */

/**
 * Retorna a data atual no formato ISO (YYYY-MM-DD) no timezone do Brasil
 * @returns string no formato YYYY-MM-DD
 */
export function getTodayISOInBrazilTimezone(): string {
  const now = new Date();
  
  // Converter para o timezone do Brasil (America/Sao_Paulo)
  // Usar Intl.DateTimeFormat para garantir que sempre usamos o timezone correto
  const brazilDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  
  // Intl.DateTimeFormat com 'en-CA' retorna YYYY-MM-DD
  return brazilDate;
}

/**
 * Normaliza uma data para o formato ISO (YYYY-MM-DD) sem considerar timezone
 * Evita problemas de conversão de timezone ao parsear datas
 * 
 * @param value - Valor a ser normalizado (string, Date, etc)
 * @returns string no formato YYYY-MM-DD ou data atual do Brasil se inválido
 */
export function normalizeToISODate(value?: unknown): string {
  if (!value) return getTodayISOInBrazilTimezone();
  const str = value.toString().trim();
  if (!str) return getTodayISOInBrazilTimezone();

  // Se já está no formato ISO (YYYY-MM-DD), retornar diretamente
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return isoMatch[0];
  }

  // Formato brasileiro dd/mm/yyyy
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Para outros formatos (como Date objects ou strings com hora),
  // tentar parsear mas usar o timezone do Brasil para extrair a data
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    // Usar Intl.DateTimeFormat para extrair a data no timezone do Brasil
    const brazilDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(parsed);
    
    return brazilDate;
  }

  return getTodayISOInBrazilTimezone();
}

