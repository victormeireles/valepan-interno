import { describe, expect, it } from 'vitest';
import { EtiquetaModeloManager } from './etiqueta-modelo-manager';
import { etiquetaProdutoFixture as produto, etiquetaRequestFixture as request } from './etiqueta-test-fixtures';

describe('EtiquetaModeloManager', () => {
  const manager = new EtiquetaModeloManager();

  it.each([[65], [60, 65], [50, 60, 65, 70, 75]])('monta régua %j', (...pesos) => {
    const categoria = pesos.map((peso) => ({ nome: 'Pão', unit_weight: peso }));
    expect(manager.build(request, produto, categoria).gramaturasCategoria).toEqual(pesos);
  });

  it('normaliza kg, remove duplicatas, ordena e usa o nome quando necessário', () => {
    const categoria = [
      { nome: 'Pão', unit_weight: 75 }, { nome: 'Pão', unit_weight: .065 },
      { nome: 'Pão 50g', unit_weight: null }, { nome: 'Pão', unit_weight: 65 },
      { nome: 'Pão', unit_weight: null }, { nome: 'Pão', unit_weight: -1 },
    ];
    const modelo = manager.build(request, produto, categoria);
    expect(modelo.gramaturasCategoria).toEqual([50, 65, 75]);
    expect(modelo.gramatura).toBe(65);
    expect(modelo.pesoLiquidoKg).toBe(3.12);
    expect(modelo.pacotesPorCaixa).toBe(8);
  });

  it.each([65, .065, null])('calcula peso líquido com peso %s', (peso) => {
    expect(manager.build(request, { ...produto, unit_weight: peso }, []).pesoLiquidoKg).toBe(3.12);
  });

  it('não inventa gramatura quando peso e nome não a informam', () => {
    const modelo = manager.build(request, { ...produto, nome: 'Pão', unit_weight: null }, [produto]);
    expect(modelo.gramatura).toBeNull();
    expect(modelo.gramaturasCategoria).toEqual([65]);
  });

  it('aplica prazo ambiente e não usa as opções antigas de congelamento', () => {
    const modelo = manager.build({
      ...request, diasValidade: 14, congelado: true,
      diasValidadeCongelado: 120, mostrarTextoCongelado: true,
    }, produto, []);
    expect(modelo.diasValidadeAmbiente).toBe(14);
    expect(modelo).not.toHaveProperty('dataValidade');
    expect(modelo).not.toHaveProperty('congelado');
  });

  it('mantém divisões seguras com quantidades ausentes', () => {
    const modelo = manager.build(request, {
      ...produto, unidadesPorCaixa: null, unidadesPorPacote: null,
    }, []);
    expect(modelo.pacotesPorCaixa).toBe(0);
    expect(modelo.pesoLiquidoKg).toBe(0);
  });
});
