import { describe, expect, it } from 'vitest';
import { InsumoCompraSugestaoStatusTone } from './insumo-compra-sugestao-status-tone';

describe('InsumoCompraSugestaoStatusTone', () => {
  const tone = new InsumoCompraSugestaoStatusTone();

  it('destaca urgência em rose', () => {
    expect(tone.resolve('urgente')).toMatchObject({
      label: 'Urgente',
      icon: 'error',
      badgeTone: 'danger',
      rowClassName: 'bg-rose-50/70',
    });
  });

  it('diferencia pedidos e adiamento', () => {
    expect(tone.resolve('pedir_hoje')).toMatchObject({
      label: 'Pedir hoje',
      badgeTone: 'warning',
    });
    expect(tone.resolve('pedir_fora_janela')).toMatchObject({
      label: 'Pedir fora da janela',
      badgeTone: 'warning',
    });
    expect(tone.resolve('adiar_lote_minimo')).toMatchObject({
      label: 'Aguardar lote mínimo',
      badgeTone: 'neutral',
    });
  });
});
