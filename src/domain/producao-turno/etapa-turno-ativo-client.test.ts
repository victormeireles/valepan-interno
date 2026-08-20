import { describe, expect, it, vi } from 'vitest';
import {
  TURNO_TROCA_ERRO,
  confirmEtapaTurnoAtivo,
} from './etapa-turno-ativo-client';

describe('confirmEtapaTurnoAtivo', () => {
  it('PUT /api/producao/{etapa}/turno-ativo com { numero }', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ numero: 2, confirmadoEm: '2026-08-18T18:00:00.000Z' }),
    });

    await confirmEtapaTurnoAtivo('forno', 2, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith('/api/producao/forno/turno-ativo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: 2 }),
    });
  });

  it('falha do PUT → erro com copy fixa', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(confirmEtapaTurnoAtivo('fermentacao', 1, fetchFn)).rejects.toThrow(
      TURNO_TROCA_ERRO,
    );
  });
});
