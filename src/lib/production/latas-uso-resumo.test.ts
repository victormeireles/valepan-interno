import { describe, expect, it } from 'vitest';
import {
  avaliarLataSplit,
  montarLatasUsoResumo,
  totaisLatasUso,
  type AssadeiraEstoqueInfo,
} from './latas-uso-resumo';

const estoque = new Map<string, AssadeiraEstoqueInfo>([
  ['novas', { nome: 'Latas novas', quantidadeLatas: 100 }],
  ['65g', { nome: 'Latas 65g', quantidadeLatas: 200 }],
]);

describe('montarLatasUsoResumo', () => {
  it('calcula razão por tipo (cenário do usuário)', () => {
    const resumo = montarLatasUsoResumo(
      [
        { tipoLata: 'novas', latasPlanejadas: 150 },
        { tipoLata: '65g', latasPlanejadas: 100 },
      ],
      estoque,
    );
    const novas = resumo.find((r) => r.assadeiraId === 'novas')!;
    const g65 = resumo.find((r) => r.assadeiraId === '65g')!;
    expect(novas.emUso).toBe(150);
    expect(novas.disponivel).toBe(100);
    expect(novas.razao).toBeCloseTo(1.5);
    expect(g65.emUso).toBe(100);
    expect(g65.disponivel).toBe(200);
    expect(g65.razao).toBeCloseTo(0.5);
  });

  it('soma latas do mesmo tipo em itens diferentes', () => {
    const resumo = montarLatasUsoResumo(
      [
        { tipoLata: 'novas', latasPlanejadas: 60 },
        { tipoLata: 'novas', latasPlanejadas: 40 },
      ],
      estoque,
    );
    expect(resumo).toHaveLength(1);
    expect(resumo[0].emUso).toBe(100);
    expect(resumo[0].razao).toBeCloseTo(1);
  });

  it('razão null quando sem estoque cadastrado e ordena no topo', () => {
    const resumo = montarLatasUsoResumo(
      [
        { tipoLata: 'desconhecida', latasPlanejadas: 50 },
        { tipoLata: '65g', latasPlanejadas: 100 },
      ],
      estoque,
    );
    expect(resumo[0].assadeiraId).toBe('desconhecida');
    expect(resumo[0].razao).toBeNull();
    expect(resumo[0].nome).toBe('Lata sem nome');
  });

  it('ignora tipoLata vazio', () => {
    const resumo = montarLatasUsoResumo(
      [{ tipoLata: '  ', latasPlanejadas: 10 }],
      estoque,
    );
    expect(resumo).toHaveLength(0);
  });

  it('avaliarLataSplit: 1000 planejadas, 500 disponíveis → 2 lotes', () => {
    const r = avaliarLataSplit(1000, 500);
    expect(r.excede).toBe(true);
    expect(r.lotesSugeridos).toBe(2);
  });

  it('avaliarLataSplit: arredonda lotes para cima', () => {
    expect(avaliarLataSplit(1200, 500).lotesSugeridos).toBe(3);
  });

  it('avaliarLataSplit: dentro do estoque não excede', () => {
    const r = avaliarLataSplit(500, 500);
    expect(r.excede).toBe(false);
    expect(r.lotesSugeridos).toBe(1);
  });

  it('avaliarLataSplit: sem estoque cadastrado não emite aviso', () => {
    expect(avaliarLataSplit(100, 0).excede).toBe(false);
  });

  it('totaisLatasUso agrega em uso e disponível', () => {
    const resumo = montarLatasUsoResumo(
      [
        { tipoLata: 'novas', latasPlanejadas: 150 },
        { tipoLata: '65g', latasPlanejadas: 100 },
      ],
      estoque,
    );
    const t = totaisLatasUso(resumo);
    expect(t.emUso).toBe(250);
    expect(t.disponivel).toBe(300);
    expect(t.razao).toBeCloseTo(250 / 300);
  });
});
