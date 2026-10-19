import { describe, expect, it } from 'vitest';
import { ExamePrazo } from './exame-prazo';

describe('ExamePrazo', () => {
  const prazo = new ExamePrazo();

  it('soma um ano ao último exame e avisa nos 30 dias anteriores', () => {
    const emDia = prazo.calcular('2025-01-15', '2025-12-15');
    expect(emDia.proximo).toBe('2026-01-15');
    expect(emDia.alerta).toBe('ok');
    expect(emDia.dias).toBe(31);

    const perto = prazo.calcular('2025-01-15', '2025-12-16');
    expect(perto.alerta).toBe('proximo');
    expect(perto.dias).toBe(30);
    expect(prazo.legenda(perto)).toBe('Vence em 30 dias');
    expect(prazo.legenda(prazo.calcular('2025-01-15', '2026-01-15'))).toBe('Vence hoje');
  });

  it('marca vencido no dia seguinte ao prazo e ajusta 29 de fevereiro', () => {
    const vencido = prazo.calcular('2025-01-15', '2026-01-16');
    expect(vencido.alerta).toBe('vencido');
    expect(prazo.legenda(vencido)).toBe('Vencido há 1 dia');
    expect(prazo.calcular('2024-02-29', '2025-02-28').proximo).toBe('2025-02-28');
    expect(prazo.exibir('2026-01-15')).toBe('15/01/2026');
  });

  it('trata ausência de exame e rejeita data inválida ou futura', () => {
    const vazio = prazo.calcular(null, '2026-10-19');
    expect(vazio.alerta).toBe('sem_exame');
    expect(prazo.legenda(vazio)).toBe('Nenhum exame registrado');
    expect(prazo.validar('2026-10-19', '2026-10-19')).toBe('2026-10-19');
    expect(() => prazo.validar('2026-13-01', '2026-10-19')).toThrow('Informe a data do exame.');
    expect(() => prazo.validar('2026-10-20', '2026-10-19')).toThrow('A data do exame não pode ser futura.');
  });

  it('fica com a data mais recente de cada colaborador', () => {
    const mapa = prazo.ultimos([
      { codigo: 'VP-1', data: '2024-03-01' },
      { codigo: 'VP-1', data: '2025-03-01' },
      { codigo: 'VP-2', data: '2026-01-10' },
      { codigo: '', data: '2026-01-01' },
    ]);
    expect(mapa.get('VP-1')).toBe('2025-03-01');
    expect(mapa.get('VP-2')).toBe('2026-01-10');
    expect(mapa.size).toBe(2);
  });
});
