import { describe, expect, it } from 'vitest';
import {
  configOperacaoMapper,
  DEFAULT_CONFIG_OPERACAO,
} from '@/domain/config-operacao/config-operacao-mapper';
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
    const windows = windowsFromConfig(
      configOperacaoMapper.mergeSnapshot(DEFAULT_CONFIG_OPERACAO, {
        turnos: [
          { etapa: 'fermentacao', numero: 1, inicio: '06:00', fim: '18:00' },
          { etapa: 'forno', numero: 1, inicio: '07:30', fim: '18:00' },
          { etapa: 'embalagem', numero: 1, inicio: '08:00', fim: '22:00' },
        ],
      }),
    );
    expect(windows.ferm.janelaIni).toBe('06:00');
    expect(windows.forno.janela).toBe('7h30 → 18h');
    expect(windows.emb.janela).toBe('8h → 22h');
  });
});
