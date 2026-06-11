import { describe, expect, it } from 'vitest';
import { parseCategoriaAssadeiraRegraForm } from './categoria-assadeira-regra-validation';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OTHER_UUID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

describe('parseCategoriaAssadeiraRegraForm', () => {
  it('aceita peso exato com padrão da assadeira', () => {
    const result = parseCategoriaAssadeiraRegraForm({
      categoria_id: VALID_UUID,
      peso_g: 65,
      assadeira_id: OTHER_UUID,
      usar_padrao: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.peso_g).toBe(65);
      expect(result.data.unidades_por_assadeira).toBeNull();
    }
  });

  it('rejeita peso menor que 1', () => {
    const result = parseCategoriaAssadeiraRegraForm({
      categoria_id: VALID_UUID,
      peso_g: 0,
      assadeira_id: OTHER_UUID,
      usar_padrao: true,
    });
    expect(result.success).toBe(false);
  });

  it('preserva override de pães por assadeira', () => {
    const result = parseCategoriaAssadeiraRegraForm({
      categoria_id: VALID_UUID,
      peso_g: 80,
      assadeira_id: OTHER_UUID,
      usar_padrao: false,
      unidades_por_assadeira: 12,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unidades_por_assadeira).toBe(12);
    }
  });
});
