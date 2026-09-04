export const PAINEL_FETCH_INIT: RequestInit = {
  cache: 'no-store',
};

/**
 * GET de painel sem cache de browser/CDN. O `_` evita GET idêntico em TV antiga.
 */
export class PainelCargaRequest {
  static url(path: string, date: string, nowMs = Date.now()): string {
    const params = new URLSearchParams({ date, _: String(nowMs) });
    return `${path}?${params.toString()}`;
  }
}
