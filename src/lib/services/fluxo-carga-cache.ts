import type { CargaFluxoProcessoResponse } from '@/domain/fluxo-processo/fluxo-processo-types';
import { fluxoProcessoService } from '@/lib/services/fluxo-processo-service';

const TTL_MS = 8_000;

type CacheEntry = {
  expiresAt: number;
  response: CargaFluxoProcessoResponse;
};

/**
 * Uma carga em voo por data, reaproveitada por alguns segundos.
 * Troca de data e duas abas deixam de refazer o mesmo trabalho.
 */
export class FluxoCargaCache {
  private readonly values = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<CargaFluxoProcessoResponse>>();

  load(date: string, preferUltima: boolean): Promise<CargaFluxoProcessoResponse> {
    const key = cacheKey(date, preferUltima);
    const cached = this.read(key);
    if (cached) return Promise.resolve(cached);
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = fluxoProcessoService
      .getCargaCompleta(date, { preferUltima })
      .then((response) => {
        this.write(key, response);
        this.write(cacheKey(response.date, false), response);
        return response;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    this.inflight.set(key, promise);
    return promise;
  }

  private read(key: string): CargaFluxoProcessoResponse | null {
    const entry = this.values.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    return entry.response;
  }

  private write(key: string, response: CargaFluxoProcessoResponse): void {
    this.values.set(key, { expiresAt: Date.now() + TTL_MS, response });
  }
}

function cacheKey(date: string, preferUltima: boolean): string {
  return `${date}:${preferUltima ? 'ultima' : 'dia'}`;
}

export const fluxoCargaCache = new FluxoCargaCache();
