import { describe, expect, it } from 'vitest';
import { InternoRouteAccessMap } from './interno-route-access-map';

describe('InternoRouteAccessMap', () => {
  const map = new InternoRouteAccessMap();

  it('mapeia fermentação e config', () => {
    expect(map.resolve('/realizado/fermentacao')).toEqual({
      kind: 'modulo',
      modulo: 'interno_fermentacao',
      minimo: 'editar',
    });
    expect(map.resolve('/config/produtos')).toEqual({
      kind: 'modulo',
      modulo: 'interno_config',
      minimo: 'administrar',
    });
  });

  it('libera login e APIs máquina', () => {
    expect(map.resolve('/login').kind).toBe('public');
    expect(map.resolve('/api/public/saidas').kind).toBe('public');
    expect(map.resolve('/api/cron/processar-recebimentos-omie').kind).toBe(
      'public',
    );
    expect(map.resolve('/api/webhooks/omie/recebimento').kind).toBe('public');
    expect(map.resolve('/api/health').kind).toBe('public');
  });

  it('mapeia APIs de produção por módulo (mais específico primeiro)', () => {
    expect(map.resolve('/api/producao/fermentacao/ordem/1/lote')).toEqual({
      kind: 'modulo',
      modulo: 'interno_fermentacao',
      minimo: 'editar',
    });
    expect(map.resolve('/api/producao/forno/ordem/1/lote')).toEqual({
      kind: 'modulo',
      modulo: 'interno_forno',
      minimo: 'editar',
    });
    expect(map.resolve('/api/painel/fermentacao')).toEqual({
      kind: 'modulo',
      modulo: 'interno_fermentacao',
      minimo: 'ler',
    });
    expect(map.resolve('/api/ordens-producao')).toEqual({
      kind: 'modulo',
      modulo: 'interno_ordens',
      minimo: 'editar',
    });
    expect(map.resolve('/api/etiquetas/fila')).toEqual({
      kind: 'modulo',
      modulo: 'interno_etiquetas',
      minimo: 'editar',
    });
  });

  it('hub exige só porta do app', () => {
    expect(map.resolve('/')).toEqual({ kind: 'app' });
  });

  it('rotas de UI não mapeadas exigem só porta do app', () => {
    expect(map.resolve('/pagina-nova')).toEqual({ kind: 'app' });
  });

  it('APIs de foto exigem anyModulo das áreas de produção', () => {
    const expected = {
      kind: 'anyModulo',
      modulos: [
        'interno_fermentacao',
        'interno_forno',
        'interno_embalagem',
        'interno_saidas',
      ],
      minimo: 'editar',
    };
    expect(map.resolve('/api/upload/photo')).toEqual(expected);
    expect(map.resolve('/api/upload/producao-photo')).toEqual(expected);
    expect(map.resolve('/api/photo/raw/1')).toEqual(expected);
  });
});
