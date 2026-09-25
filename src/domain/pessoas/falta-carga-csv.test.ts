import { describe, expect, it } from 'vitest';
import { FaltaCargaCsv } from './falta-carga-csv';

describe('FaltaCargaCsv', () => {
  it('converte o tipo da planilha e recusa tipo desconhecido', () => {
    const csv = [
      'colaborador_id,colaborador,nome,data,tipo,setor,observacao',
      'VP-9001,Pessoa,Pessoa,2026-06-09,Injustificada,,',
      'VP-9002,Pessoa,Pessoa,2026-06-10,Outro,,',
    ].join('\n');
    const resultado = new FaltaCargaCsv().ler(csv);
    expect(resultado.linhas).toEqual([
      {
        colaboradorCodigo: 'VP-9001',
        data: '2026-06-09',
        classificacao: 'injustificada',
        observacao: '',
      },
    ]);
    expect(resultado.erros).toEqual(['VP-9002']);
  });
});
