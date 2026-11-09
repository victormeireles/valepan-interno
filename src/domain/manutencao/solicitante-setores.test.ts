import { describe, expect, it } from 'vitest';
import { SolicitanteSetores } from './solicitante-setores';
import type { SetorLinha } from './setor-operacional';

const operacional: SetorLinha = {
  id: 'setor-forno',
  nome: 'Forno',
  tipo: 'operacional',
  ativo: true,
};

const outroOperacional: SetorLinha = {
  id: 'setor-massa',
  nome: 'Massa',
  tipo: 'operacional',
  ativo: true,
};

const apoio: SetorLinha = {
  id: 'setor-apoio',
  nome: 'Almoxarifado',
  tipo: 'apoio',
  ativo: true,
};

const inativo: SetorLinha = {
  id: 'setor-inativo',
  nome: 'Forno antigo',
  tipo: 'operacional',
  ativo: false,
};

const setores = [operacional, outroOperacional, apoio, inativo];

describe('SolicitanteSetores', () => {
  const regra = new SolicitanteSetores();

  it('aceita lista vazia', () => {
    expect(regra.filtrar([], setores)).toEqual({ ok: true, ids: [] });
  });

  it('mantém o setor operacional ativo', () => {
    expect(regra.filtrar([operacional.id], setores)).toEqual({
      ok: true,
      ids: [operacional.id],
    });
  });

  it('recusa setor de apoio', () => {
    expect(regra.filtrar([apoio.id], setores)).toEqual({
      ok: false,
      mensagem: 'Escolha apenas setores operacionais ativos.',
    });
  });

  it('recusa id ausente', () => {
    expect(regra.filtrar(['setor-inexistente'], setores)).toEqual({
      ok: false,
      mensagem: 'Escolha apenas setores operacionais ativos.',
    });
  });

  it('recusa setor operacional inativo', () => {
    expect(regra.filtrar([inativo.id], setores)).toEqual({
      ok: false,
      mensagem: 'Escolha apenas setores operacionais ativos.',
    });
  });

  it('entra com a duplicata uma vez', () => {
    expect(
      regra.filtrar(
        [outroOperacional.id, operacional.id, outroOperacional.id],
        setores,
      ),
    ).toEqual({
      ok: true,
      ids: [outroOperacional.id, operacional.id],
    });
  });
});
