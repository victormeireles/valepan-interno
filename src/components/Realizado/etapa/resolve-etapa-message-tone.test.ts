import { describe, expect, it } from 'vitest';

import { resolveEtapaMessageTone } from './resolve-etapa-message-tone';

describe('resolveEtapaMessageTone', () => {
  it('usa success para mensagens de sucesso', () => {
    expect(resolveEtapaMessageTone('Produção de fermentação atualizada com sucesso!')).toBe(
      'success',
    );
  });

  it('usa warning para avisos de estoque de insumos', () => {
    expect(
      resolveEtapaMessageTone(
        'Lote salvo. Estoque não atualizado: produto sem receita de massa vinculada',
      ),
    ).toBe('warning');
  });

  it('usa error para falhas reais', () => {
    expect(resolveEtapaMessageTone('Erro ao salvar produção de fermentação')).toBe('error');
  });
});
