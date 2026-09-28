export const PAINEL_FETCH_INIT: RequestInit = {
  cache: 'no-store',
};

/**
 * GET de painel sem cache de browser/CDN. O `_` evita GET idêntico em TV antiga.
 */
export class PainelCargaRequest {
  static url(
    path: string,
    date: string,
    nowMs = Date.now(),
    options?: { preferUltima?: boolean },
  ): string {
    const params = new URLSearchParams({ date, _: String(nowMs) });
    if (options?.preferUltima) params.set('preferUltima', '1');
    return `${path}?${params.toString()}`;
  }
}
