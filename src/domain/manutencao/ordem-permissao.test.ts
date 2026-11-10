import { describe, expect, it } from 'vitest';
import { OrdemPermissao } from './ordem-permissao';

describe('OrdemPermissao', () => {
  const permissao = new OrdemPermissao();

  it('esconde o detalhe quando o setor está fora da lista e a pessoa não vê todas', () => {
    expect(permissao.veDetalhe(false, ['setor-embalagem'], 'setor-forno')).toBe(false);
    expect(permissao.veDetalhe(false, [], 'setor-forno')).toBe(false);
  });

  it('mostra o detalhe de qualquer setor para quem vê todas', () => {
    expect(permissao.veDetalhe(true, [], 'setor-forno')).toBe(true);
  });

  it('mostra o detalhe do setor que está na lista', () => {
    expect(permissao.veDetalhe(false, ['setor-forno', 'setor-embalagem'], 'setor-forno')).toBe(
      true,
    );
  });

  it('devolve ou finaliza para quem recebeu ou para quem administra', () => {
    expect(
      permissao.devolveOuFinaliza({
        status: 'recebida',
        recebidoPor: 'user-1',
        usuarioId: 'user-1',
        administra: false,
      }),
    ).toBe(true);
    expect(
      permissao.devolveOuFinaliza({
        status: 'recebida',
        recebidoPor: 'user-1',
        usuarioId: 'user-2',
        administra: true,
      }),
    ).toBe(true);
  });

  it('nega devolver ou finalizar para outra pessoa sem administrar', () => {
    expect(
      permissao.devolveOuFinaliza({
        status: 'recebida',
        recebidoPor: 'user-1',
        usuarioId: 'user-2',
        administra: false,
      }),
    ).toBe(false);
  });

  it('edita finalização para quem recebeu ou para quem administra', () => {
    expect(
      permissao.editaFinalizacao({
        status: 'finalizada',
        recebidoPor: 'user-1',
        usuarioId: 'user-1',
        administra: false,
      }),
    ).toBe(true);
    expect(
      permissao.editaFinalizacao({
        status: 'finalizada',
        recebidoPor: 'user-1',
        usuarioId: 'user-2',
        administra: true,
      }),
    ).toBe(true);
  });

  it('nega editar finalização para outra pessoa sem administrar', () => {
    expect(
      permissao.editaFinalizacao({
        status: 'finalizada',
        recebidoPor: 'user-1',
        usuarioId: 'user-2',
        administra: false,
      }),
    ).toBe(false);
  });
});
