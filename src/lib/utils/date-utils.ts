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

/**
 * Formata data para exibição DD/MM/AAAA (aceita ISO date, datetime ou dd/mm/aaaa).
 */
export function formatIsoDateToDDMMYYYY(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') {
    return '';
  }
  const str = String(iso).trim();
  const head = str.slice(0, 10);
  const isoMatch = head.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[1]}/${brMatch[2]}/${brMatch[3]}`;
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed);
  }
  return '';
}

/**
 * Interpreta texto digitado (dd/mm/aaaa ou yyyy-mm-dd) como ISO yyyy-mm-dd.
 */
export function parseDateInputToIsoBR(raw: string): string | null {
  const str = raw.trim();
  if (!str) {
    return null;
  }
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const dd = parseInt(br[1], 10);
    const mm = parseInt(br[2], 10);
    const yyyy = parseInt(br[3], 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
      return null;
    }
    const dt = new Date(yyyy, mm - 1, dd);
    if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) {
      return null;
    }
    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return iso[0];
  }
  return null;
}

