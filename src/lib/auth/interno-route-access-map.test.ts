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
  });

  it('hub exige só porta do app', () => {
    expect(map.resolve('/')).toEqual({ kind: 'app' });
  });

  it('rotas de UI não mapeadas exigem só porta do app', () => {
    expect(map.resolve('/pagina-nova')).toEqual({ kind: 'app' });
  });
});
