import { describe, expect, it } from 'vitest';
import { resolveEtiquetaConfig } from './etiqueta-resolver';

const produto = {
  nome: 'HB Brioche 50g 10cm',
  nomeEtiqueta: 'HB Smash Brioche 50g 10cm',
  diasValidadeAmbiente: 21,
  diasValidadeCongelado: 90,
  unitBarcode: '789',
  unitWeight: 0.05,
  boxUnits: 100,
  packageUnits: 10,
};

const tipo = {
  congelado: true,
  mostrarTextoCongelado: true,
};

describe('resolveEtiquetaConfig', () => {
  it('prioriza a família e permite sobrescrever para esta impressão', () => {
    const comFamilia = { ...produto, familiaNome: 'Brioche' };
    expect(resolveEtiquetaConfig({ produto: comFamilia, tipo, dataFabricacao: '2026-09-03' }).nomeEtiqueta).toBe('Brioche');
    expect(resolveEtiquetaConfig({
      produto: comFamilia, tipo, dataFabricacao: '2026-09-03',
      overrides: { nomeEtiqueta: 'Smash Brioche' },
    }).nomeEtiqueta).toBe('Smash Brioche');
  });
  it('usa nome_etiqueta do produto', () => {
    const result = resolveEtiquetaConfig({ produto, tipo, dataFabricacao: '2026-06-11' });
    expect(result.nomeEtiqueta).toBe('HB Smash Brioche 50g 10cm');
  });

  it('aplica overrides do modal', () => {
    const result = resolveEtiquetaConfig({
      produto,
      tipo,
      dataFabricacao: '2026-06-11',
      overrides: { diasValidade: 14 },
    });
    expect(result.diasValidade).toBe(14);
  });

  it('calcula lote do dia do ano', () => {
    const result = resolveEtiquetaConfig({ produto, tipo, dataFabricacao: '2026-06-11' });
    expect(result.lote).toBeGreaterThan(0);
  });
});
