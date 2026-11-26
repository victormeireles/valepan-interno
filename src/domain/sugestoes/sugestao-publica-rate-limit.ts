import { SugestaoIpHash } from './sugestao-ip';

export type SugestaoAcessoTipo = 'identificar' | 'enviar';

export interface SugestaoAcessoStore {
  apagarAnterioresA(instante: Date): Promise<void>;
  contar(ipHash: string, tipo: SugestaoAcessoTipo, desde: Date): Promise<number>;
  registrar(ipHash: string, tipo: SugestaoAcessoTipo): Promise<void>;
}

const JANELA_MS = 10 * 60 * 1000;
const RETENCAO_MS = 24 * 60 * 60 * 1000;
const TETO: Record<SugestaoAcessoTipo, number> = { identificar: 10, enviar: 5 };

export class SugestaoPublicaRateLimit {
  private readonly hash = new SugestaoIpHash();

  constructor(
    private readonly store: SugestaoAcessoStore,
    private readonly secret: string,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async consumir(ip: string | null, tipo: SugestaoAcessoTipo): Promise<'ok' | 'limite'> {
    const momento = this.agora();
    await this.store.apagarAnterioresA(new Date(momento.getTime() - RETENCAO_MS));
    const ipHash = this.hash.calcular(this.secret, ip);
    const total = await this.store.contar(ipHash, tipo, new Date(momento.getTime() - JANELA_MS));
    if (total >= TETO[tipo]) return 'limite';
    await this.store.registrar(ipHash, tipo);
    return 'ok';
  }
}
