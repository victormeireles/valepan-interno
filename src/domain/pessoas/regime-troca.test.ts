import { describe, expect, it } from 'vitest';
import { RegimeTroca } from './regime-troca';

describe('RegimeTroca', () => {
  const troca = new RegimeTroca();

  it('recusa PJ com aviso e CLT com saída prevista', () => {
    expect(() => troca.avaliar('pj', true, 'ativo', null)).toThrow('Cancele o aviso antes de mudar o regime para PJ.');
    expect(() => troca.avaliar('clt', false, 'ativo', '2026-11-02')).toThrow(
      'Cancele a saída prevista antes de mudar o regime para CLT.',
    );
  });

  it('permite desligado e PJ sem aviso', () => {
    expect(() => troca.avaliar('clt', false, 'desligado', '2026-10-01')).not.toThrow();
    expect(() => troca.avaliar('pj', false, 'ativo', null)).not.toThrow();
  });

  it('recusa exame ocupacional de PJ', () => {
    expect(() => troca.recusarExame('pj')).toThrow('Exame ocupacional vale só para CLT.');
    expect(() => troca.recusarExame('clt')).not.toThrow();
  });

  it('reconhece saída prevista só no PJ ainda ligado', () => {
    expect(troca.saidaPrevista('pj', 'ativo', '2026-11-02')).toBe(true);
    expect(troca.saidaPrevista('pj', 'desligado', '2026-11-02')).toBe(false);
    expect(troca.saidaPrevista('clt', 'ativo', '2026-11-02')).toBe(false);
    expect(troca.saidaPrevista('pj', 'ativo', null)).toBe(false);
  });
});
