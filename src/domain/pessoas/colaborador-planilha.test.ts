import { describe, expect, it } from 'vitest';
import {
  ColaboradorPlanilha,
  type ColaboradorPlanilhaOrigem,
} from './colaborador-planilha';

const hoje = '2026-11-24';

function pessoa(parcial: Partial<ColaboradorPlanilhaOrigem> = {}): ColaboradorPlanilhaOrigem {
  return {
    codigo: 'VP-0001',
    nome: 'Ana',
    setorNome: 'Forno',
    turnoNome: 'Manhã',
    dataAdmissao: '2026-01-01',
    situacao: 'ativo',
    afastamento: null,
    avisoAtivo: false,
    liderSetor: false,
    ...parcial,
  };
}

describe('ColaboradorPlanilha', () => {
  const planilha = new ColaboradorPlanilha();

  it('lista todos menos desligados, com líder do setor e admissão recente como experiência', () => {
    const linhas = planilha.montar(
      [
        pessoa({ codigo: 'VP-0002', nome: 'Bruno', liderSetor: true }),
        pessoa({ codigo: 'VP-0001', nome: 'Ana', dataAdmissao: '2026-11-01' }),
        pessoa({ codigo: 'VP-0003', nome: 'Carla', situacao: 'desligado', liderSetor: true }),
      ],
      hoje,
    );

    expect(linhas.map((linha) => linha.id)).toEqual(['VP-0001', 'VP-0002']);
    expect(linhas[0]).toEqual({
      id: 'VP-0001',
      nome: 'Ana',
      lider: 'Bruno',
      setor: 'Forno',
      turno: 'Manhã',
      dataAdmissao: '01/11/2026',
      situacao: 'Período de experiência',
    });
  });

  it('mantém a situação quando a admissão completa 30 dias', () => {
    const [linha] = planilha.montar([pessoa({ dataAdmissao: '2026-10-25' })], hoje);
    expect(linha?.situacao).toBe('Ativo');
    expect(linha?.dataAdmissao).toBe('25/10/2026');
  });

  it('não trata admissão futura nem data vazia como experiência', () => {
    const linhas = planilha.montar(
      [
        pessoa({ codigo: 'VP-0001', nome: 'Ana', dataAdmissao: '2026-12-01', situacao: 'admissao_prevista' }),
        pessoa({ codigo: 'VP-0002', nome: 'Bruno', dataAdmissao: null, setorNome: null, turnoNome: null }),
      ],
      hoje,
    );
    expect(linhas[0]?.situacao).toBe('Admissão prevista');
    expect(linhas[1]).toMatchObject({ lider: '', setor: '', turno: '', dataAdmissao: '', situacao: 'Ativo' });
  });

  it('marca experiência mesmo fora do posto e preserva INSS depois dos 30 dias', () => {
    const linhas = planilha.montar(
      [
        pessoa({
          codigo: 'VP-0001',
          nome: 'Ana',
          dataAdmissao: '2026-11-20',
          situacao: 'afastado',
          afastamento: 'inss',
        }),
        pessoa({
          codigo: 'VP-0002',
          nome: 'Bruno',
          dataAdmissao: '2026-01-01',
          situacao: 'afastado',
          afastamento: 'inss',
          avisoAtivo: true,
        }),
      ],
      hoje,
    );
    expect(linhas[0]?.situacao).toBe('Período de experiência');
    expect(linhas[1]?.situacao).toBe('INSS');
  });

  it('mostra em aviso fora do período de experiência', () => {
    const [linha] = planilha.montar(
      [pessoa({ avisoAtivo: true, dataAdmissao: '2025-01-01' })],
      hoje,
    );
    expect(linha?.situacao).toBe('Em aviso');
  });
});
