import { describe, expect, it } from 'vitest';
import { resolveAssadeiraIdFromLataSelecao, type AssadeiraCandidato } from './ordem-producao-assadeira';

const meta = {
  unidades_assadeira: 12,
  unidades_lata_antiga: 12,
  unidades_lata_nova: 14,
};

const candidatos: AssadeiraCandidato[] = [
  { assadeira_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', unidades_por_assadeira: 12 },
  { assadeira_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', unidades_por_assadeira: 14 },
  { assadeira_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', unidades_por_assadeira: 16 },
];

describe('resolveAssadeiraIdFromLataSelecao', () => {
  it('UUID presente nos candidatos: devolve o mesmo id', () => {
    expect(resolveAssadeiraIdFromLataSelecao('cccccccc-cccc-cccc-cccc-cccccccccccc', meta, candidatos)).toBe(
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
    );
  });

  it('vazio ou desconhecido: primeira candidata', () => {
    expect(resolveAssadeiraIdFromLataSelecao('', meta, candidatos)).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(resolveAssadeiraIdFromLataSelecao('não-é-uuid-nem-candidato', meta, candidatos)).toBe(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    );
  });

  it('um único candidato', () => {
    const one = [candidatos[0]!];
    expect(resolveAssadeiraIdFromLataSelecao('', meta, one)).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(resolveAssadeiraIdFromLataSelecao('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', meta, one)).toBe(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    );
  });
});
