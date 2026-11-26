import { describe, expect, it } from 'vitest';
import { SugestaoIpHash, SugestaoIpOrigem } from './sugestao-ip';
import { SugestaoPublicaRateLimit, type SugestaoAcessoStore, type SugestaoAcessoTipo } from './sugestao-publica-rate-limit';

class Memoria implements SugestaoAcessoStore {
  linhas: { ipHash: string; tipo: SugestaoAcessoTipo; em: Date }[] = [];
  constructor(private readonly agora: Date) {}
  async apagarAnterioresA(instante: Date) {
    this.linhas = this.linhas.filter((linha) => linha.em >= instante);
  }
  async contar(ipHash: string, tipo: SugestaoAcessoTipo, desde: Date) {
    return this.linhas.filter((linha) => linha.ipHash === ipHash && linha.tipo === tipo && linha.em >= desde).length;
  }
  async registrar(ipHash: string, tipo: SugestaoAcessoTipo) {
    this.linhas.push({ ipHash, tipo, em: this.agora });
  }
}

describe('limite público', () => {
  it('lê o primeiro IP e junta o vazio no balde desconhecido', () => {
    const headers = new Headers({ 'x-forwarded-for': ' 203.0.113.5 , 10.0.0.1' });
    expect(new SugestaoIpOrigem().extrair(headers)).toBe('203.0.113.5');
    expect(new SugestaoIpOrigem().extrair(new Headers())).toBeNull();
    const hash = new SugestaoIpHash();
    expect(hash.calcular('segredo', null)).toBe(hash.calcular('segredo', '   '));
    expect(hash.calcular('segredo', null)).not.toBe(hash.calcular('segredo', '203.0.113.5'));
  });

  it('libera 10 identificar e 5 enviar e bloqueia o seguinte sem registrar', async () => {
    const agora = new Date('2026-11-24T12:00:00.000Z');
    const store = new Memoria(agora);
    const limite = new SugestaoPublicaRateLimit(store, 'segredo', () => agora);
    for (let i = 0; i < 10; i += 1) expect(await limite.consumir('1.1.1.1', 'identificar')).toBe('ok');
    expect(await limite.consumir('1.1.1.1', 'identificar')).toBe('limite');
    for (let i = 0; i < 5; i += 1) expect(await limite.consumir('1.1.1.1', 'enviar')).toBe('ok');
    expect(await limite.consumir('1.1.1.1', 'enviar')).toBe('limite');
    expect(store.linhas.filter((linha) => linha.tipo === 'identificar')).toHaveLength(10);
    expect(store.linhas.filter((linha) => linha.tipo === 'enviar')).toHaveLength(5);
  });
});
