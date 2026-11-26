import { describe, expect, it } from 'vitest';
import { CpfVerificador } from '@/domain/pessoas/cpf-verificador';
import { SugestaoCpfConsulta, type SugestaoAtivosPorCpf } from './sugestao-cpf-consulta';

const ANA = { id: 'ana', nome: 'Ana' };

function porta(linhas: { id: string; nome: string }[]): SugestaoAtivosPorCpf & { chamadas: number } {
  return {
    chamadas: 0,
    async listar() {
      this.chamadas += 1;
      return linhas;
    },
  };
}

describe('SugestaoCpfConsulta', () => {
  it('não consulta CPF com dígito errado', async () => {
    const ativos = porta([ANA]);
    const resultado = await new SugestaoCpfConsulta(new CpfVerificador(), ativos).classificar('111.111.111-11');
    expect(resultado).toEqual({ tipo: 'invalido' });
    expect(ativos.chamadas).toBe(0);
  });

  it('identifica um ativo e manda o resto ao RH', async () => {
    const consulta = (linhas: { id: string; nome: string }[]) =>
      new SugestaoCpfConsulta(new CpfVerificador(), porta(linhas));
    const cpf = '390.533.447-05';
    expect(await consulta([ANA]).classificar(cpf)).toEqual({ tipo: 'identificado', colaborador: ANA });
    expect(await consulta([]).classificar(cpf)).toEqual({ tipo: 'rh' });
    expect(await consulta([ANA, { id: 'bia', nome: 'Bia' }]).classificar(cpf)).toEqual({ tipo: 'rh' });
  });
});
