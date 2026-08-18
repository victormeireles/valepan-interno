import { describe, expect, it } from 'vitest';

import { FluxoControleDisplayQtysBuilder } from '@/components/FluxoProcesso/fluxo-controle-display-qtys';
import { FluxoDisplayScale } from '@/components/FluxoProcesso/fluxo-display-scale';
import type { FluxoControleDia, FluxoControleEtapaNumeros } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import { emptyMatrizEtapas } from '@/domain/fluxo-processo/fluxo-matriz-horaria';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

const builder = new FluxoControleDisplayQtysBuilder();

function zeros24(): number[] {
  return Array(24).fill(0);
}

function nums(
  over: Partial<FluxoControleEtapaNumeros> = {},
): FluxoControleEtapaNumeros {
  return {
    objetivoUn: 0,
    deveriaUn: 0,
    estaUn: 0,
    deltaUn: 0,
    status: 'no plano',
    objetivoLt: 0,
    deveriaLt: 0,
    objetivoCx: 0,
    deveriaCx: 0,
    ...over,
  };
}

/** Duas assadeiras com unPorLata distintos — média do dia ≠ fator por ass. */
function fluxoDuasAssadeiras(): VpFluxoPayload {
  const ordemAss = ['65g verde', '50g'];
  const matriz = emptyMatrizEtapas(ordemAss);
  // 960 un ÷ 24 = 40 LT; 2000 un ÷ 20 = 100 LT
  matriz.ferm['65g verde'][1] = 960;
  matriz.ferm['50g'][2] = 2000;
  matriz.emb['65g verde'][0] = 480;
  matriz.emb['50g'][0] = 400;

  const matrizAnt = emptyMatrizEtapas(ordemAss);
  matrizAnt.emb['65g verde'][0] = 240;
  matrizAnt.emb['50g'][0] = 200;

  const matrizPrevisto = emptyMatrizEtapas(ordemAss);
  matrizPrevisto.ferm['65g verde'][1] = 960;
  matrizPrevisto.ferm['50g'][2] = 2000;
  matrizPrevisto.emb['65g verde'][0] = 480;
  matrizPrevisto.emb['50g'][0] = 400;

  const numerosFerm = nums({
    objetivoUn: 140,
    deveriaUn: 70,
    estaUn: 140,
    deltaUn: 70,
    status: 'adiantado',
    objetivoLt: 140,
    deveriaLt: 70,
    objetivoCx: 70,
    deveriaCx: 35,
  });
  const numerosEmb = nums({
    objetivoUn: 40,
    deveriaUn: 20,
    estaUn: 20,
    deltaUn: 0,
    status: 'no plano',
    objetivoLt: 140,
    deveriaLt: 70,
    objetivoCx: 40,
    deveriaCx: 20,
  });
  const zero = nums();

  const controle: FluxoControleDia = {
    disponivel: true,
    etapas: { ferm: numerosFerm, forno: zero, emb: numerosEmb },
    matrizPrevisto,
    relogio: { ferm: [], forno: [], emb: [] },
    embalagemFifo: false,
  };

  return {
    dia: '17/08/2026',
    diaLabel: 'seg 17/08',
    planoUn: 2960,
    etapas: [
      {
        key: 'ferm',
        nome: 'Fermentação',
        un: 2960,
        ini: 60,
        fim: 120,
        span: 60,
        gaps: [],
        gapTot: 0,
        ativo: 60,
        eventos: 2,
        blocoPct: 0,
        blocoLancamentos: [],
        volOperacional: 140,
      },
      {
        key: 'forno',
        nome: 'Forno',
        un: 0,
        volOperacional: 0,
        ini: 0,
        fim: 0,
        span: 0,
        gaps: [],
        gapTot: 0,
        ativo: 0,
        eventos: 0,
        blocoPct: 0,
        blocoLancamentos: [],
      },
      {
        key: 'emb',
        nome: 'Embalagem',
        un: 880,
        ini: 0,
        fim: 0,
        span: 0,
        gaps: [],
        gapTot: 0,
        ativo: 0,
        eventos: 0,
        blocoPct: 0,
        blocoLancamentos: [],
        volOperacional: 40,
      },
    ],
    padrao: { camaraMin: 180, resfrioMin: 60 },
    ordemAss,
    cores: { '65g verde': '#6B7233', '50g': '#8B5A2B' },
    matriz,
    matrizAnt,
    assadeiras: [
      {
        nome: '65g verde',
        ferm: 960,
        forno: 0,
        emb: 480,
        embAnt: 240,
        unPorLata: 24,
        produtos: [],
        ondas: [],
      },
      {
        nome: '50g',
        ferm: 2000,
        forno: 0,
        emb: 400,
        embAnt: 200,
        unPorLata: 20,
        produtos: [],
        ondas: [],
      },
    ],
    lead: {
      fermForno: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: Array(12).fill(0) },
      fornoEmb: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: Array(12).fill(0) },
    },
    opAnterior: { un: 440, eventos: 2, volOperacional: 20 },
    trocas: { forno: 0 },
    unPorCaixaByProduto: {},
    produtividade: null,
    ritmoPorEtapa: null,
    controle,
    filas: null,
  };
}

describe('FluxoControleDisplayQtysBuilder', () => {
  it('esta e objetivo usam volume nativo em LT (assadeiras)', () => {
    const fluxo = fluxoDuasAssadeiras();
    const scale = new FluxoDisplayScale(fluxo, 'lt');
    const numeros = fluxo.controle!.etapas.ferm;

    const qtys = builder.build(scale, fluxo, 'ferm', numeros);
    expect(qtys.estaDisplay).toBe(140);
    expect(qtys.objetivoDisplay).toBe(140);
    expect(qtys.deveriaDisplay).toBe(70);
    expect(qtys.deltaDisplay).toBe(70);
    expect(qtys.barraOpPct).toBe(100);
    expect(qtys.barraPct).toBe(100);
  });

  it('objetivo soma assadeiras do previsto em LT', () => {
    const fluxo = fluxoDuasAssadeiras();
    const scale = new FluxoDisplayScale(fluxo, 'lt');
    const numeros = fluxo.controle!.etapas.ferm;
    fluxo.controle!.matrizPrevisto.ferm['65g verde'] = zeros24();
    fluxo.controle!.matrizPrevisto.ferm['65g verde'][1] = 480;
    fluxo.controle!.matrizPrevisto.ferm['50g'] = zeros24();
    fluxo.controle!.matrizPrevisto.ferm['50g'][2] = 2000;
    const qtys = builder.build(scale, fluxo, 'ferm', {
      ...numeros,
      objetivoUn: 120,
      deveriaUn: 120,
      objetivoLt: 120,
      deveriaLt: 120,
    });
    expect(qtys.objetivoDisplay).toBe(120);
  });

  it('emb em LT usa assadeiras da OP, não converte CX com média do dia', () => {
    const fluxo = fluxoDuasAssadeiras();
    const scale = new FluxoDisplayScale(fluxo, 'lt');
    const qtys = builder.build(scale, fluxo, 'emb', fluxo.controle!.etapas.emb);
    expect(qtys.objetivoDisplay).toBe(140);
    expect(qtys.deveriaDisplay).toBe(70);
  });

  it('esta emb = volOperacional − opAnterior em CX', () => {
    const fluxo = fluxoDuasAssadeiras();
    const scale = new FluxoDisplayScale(fluxo, 'cx');
    const numeros = fluxo.controle!.etapas.emb;

    const qtys = builder.build(scale, fluxo, 'emb', numeros);
    expect(qtys.estaDisplay).toBe(20);
    expect(qtys.objetivoDisplay).toBe(40);
    expect(qtys.deveriaDisplay).toBe(20);
  });

  it('objetivo 0 e sem controle → objetivo/deveria 0', () => {
    const fluxo = fluxoDuasAssadeiras();
    const scale = new FluxoDisplayScale(fluxo, 'lt');
    const qtysZero = builder.build(scale, fluxo, 'ferm', nums({ estaUn: 100 }));
    expect(qtysZero.objetivoDisplay).toBe(0);
    expect(qtysZero.deveriaDisplay).toBe(0);

    fluxo.controle = null;
    const qtysNull = builder.build(scale, fluxo, 'ferm', nums({
      objetivoUn: 2960,
      deveriaUn: 1480,
      estaUn: 2960,
      deltaUn: 1480,
      status: 'adiantado',
      objetivoLt: 2960,
      deveriaLt: 1480,
    }));
    expect(qtysNull.objetivoDisplay).toBe(0);
  });

  it('barraOpPct é esta/objetivo; barraPct é esta/deveria', () => {
    const fluxo = fluxoDuasAssadeiras();
    const scale = new FluxoDisplayScale(fluxo, 'lt');
    const qtys = builder.build(scale, fluxo, 'ferm', nums({
      objetivoUn: 100,
      deveriaUn: 50,
      estaUn: 25,
      deltaUn: -25,
      status: 'atrasado',
      objetivoLt: 100,
      deveriaLt: 50,
    }));
    expect(qtys.barraOpPct).toBe(25);
    expect(qtys.barraPct).toBe(50);
  });
});
