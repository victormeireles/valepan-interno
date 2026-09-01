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
    expect(map.resolve('/config/operacao')).toEqual({
      kind: 'modulo',
      modulo: 'interno_config',
      minimo: 'administrar',
    });
    expect(map.resolve('/api/config/operacao')).toEqual({
      kind: 'modulo',
      modulo: 'interno_config',
      minimo: 'administrar',
    });
  });

  it('protege sugestão de compras com leitura de insumos', () => {
    expect(map.resolve('/sugestao-compras')).toEqual({
      kind: 'modulo',
      modulo: 'interno_insumos',
      minimo: 'ler',
    });
    expect(map.resolve('/sugestao-compras/detalhe')).toEqual({
      kind: 'modulo',
      modulo: 'interno_insumos',
      minimo: 'ler',
    });
  });

  it('protege pedidos de compra de insumos', () => {
    expect(map.resolve('/compras-insumos')).toEqual({
      kind: 'modulo',
      modulo: 'interno_insumos',
      minimo: 'ler',
    });
  });

  it('protege reclamações', () => {
    expect(map.resolve('/reclamacoes')).toEqual({
      kind: 'modulo',
      modulo: 'interno_reclamacoes',
      minimo: 'ler',
    });
    expect(map.resolve('/api/reclamacoes/foto')).toEqual({
      kind: 'modulo',
      modulo: 'interno_reclamacoes',
      minimo: 'editar',
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
      kind: 'anyModulo',
      modulos: ['interno_fermentacao', 'interno_painel'],
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

  it('photo/cleanup exige administrar em config (não chão)', () => {
    expect(map.resolve('/api/photo/cleanup')).toEqual({
      kind: 'modulo',
      modulo: 'interno_config',
      minimo: 'administrar',
    });
  });

  it('options/generic exige anyModulo dos consumidores de catálogo', () => {
    expect(map.resolve('/api/options/generic')).toEqual({
      kind: 'anyModulo',
      modulos: ['interno_config', 'interno_etiquetas', 'interno_insumos'],
      minimo: 'ler',
    });
  });

  it('api/produtos é leitura para ordens e config (não só administrar)', () => {
    expect(map.resolve('/api/produtos/Bolinho/assadeiras')).toEqual({
      kind: 'anyModulo',
      modulos: ['interno_ordens', 'interno_config'],
      minimo: 'ler',
    });
  });

  it('options/embalagem também serve o formulário de ordens', () => {
    expect(map.resolve('/api/options/embalagem')).toEqual({
      kind: 'anyModulo',
      modulos: ['interno_embalagem', 'interno_ordens'],
      minimo: 'ler',
    });
  });

  it('quadros de etapa TV: área ou painel, leitura', () => {
    const ferm = {
      kind: 'anyModulo' as const,
      modulos: ['interno_fermentacao', 'interno_painel'],
      minimo: 'ler' as const,
    };
    expect(map.resolve('/painel/fermentacao')).toEqual(ferm);
    expect(map.resolve('/painel/fermentacao/x')).toEqual(ferm);
    expect(map.resolve('/painel/forno')).toEqual({
      kind: 'anyModulo',
      modulos: ['interno_forno', 'interno_painel'],
      minimo: 'ler',
    });
    expect(map.resolve('/painel/embalagem')).toEqual({
      kind: 'anyModulo',
      modulos: ['interno_embalagem', 'interno_painel'],
      minimo: 'ler',
    });
  });

  it('APIs de carga do quadro: área ou painel; fluxo JSON para as 4 leituras', () => {
    expect(map.resolve('/api/painel/fermentacao/carga')).toEqual({
      kind: 'anyModulo',
      modulos: ['interno_fermentacao', 'interno_painel'],
      minimo: 'ler',
    });
    expect(map.resolve('/api/painel/fluxo-processo/carga')).toEqual({
      kind: 'anyModulo',
      modulos: [
        'interno_painel',
        'interno_fermentacao',
        'interno_forno',
        'interno_embalagem',
      ],
      minimo: 'ler',
    });
  });

  it('página Fluxo continua só interno_painel', () => {
    expect(map.resolve('/realizado/fluxo-processo')).toEqual({
      kind: 'modulo',
      modulo: 'interno_painel',
      minimo: 'ler',
    });
  });
});
