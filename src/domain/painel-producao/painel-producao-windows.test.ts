import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG_OPERACAO } from '@/domain/config-operacao/config-operacao-mapper';
import { windowsFromConfig } from './painel-producao-windows';

describe('windowsFromConfig', () => {
  it('monta janelas padrão iguais às constantes atuais', () => {
    expect(windowsFromConfig(DEFAULT_CONFIG_OPERACAO)).toEqual({
      ferm: { janelaIni: '07:00', janelaFim: '18:00', janela: '7h → 18h' },
      forno: { janelaIni: '07:00', janelaFim: '18:00', janela: '7h → 18h' },
      emb: { janelaIni: '07:00', janelaFim: '21:50', janela: '7h → 21h50' },
    });
  });

  it('usa horários cadastrados por etapa', () => {
    const windows = windowsFromConfig({
      ...DEFAULT_CONFIG_OPERACAO,
      horarioInicioProducao: '06:00',
      horarioInicioForno: '07:30',
      horarioInicioEmbalagem: '08:00',
      horarioFimEmbalagem: '22:00',
    });
    expect(windows.ferm.janelaIni).toBe('06:00');
    expect(windows.forno.janela).toBe('7h30 → 18h');
    expect(windows.emb.janela).toBe('8h → 22h');
  });
});
