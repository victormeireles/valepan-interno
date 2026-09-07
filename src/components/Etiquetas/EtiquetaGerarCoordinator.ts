import type { LegacyEtiquetaGerarBody } from '@/domain/etiquetas/etiqueta-legacy-payload';

export type EtiquetaRegistroInput = {
  ordemProducaoId?: string;
  produtoId: string;
  tipoEstoqueId: string;
  dataFabricacao: string;
  modo: 'manual' | 'pedido';
};

export class EtiquetaGerarCoordinator {
  constructor(
    private readonly request: typeof fetch = (...args) => fetch(...args),
    private readonly openHtml: (html: string) => void = (html) => {
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    },
  ) {}

  async gerar(body: LegacyEtiquetaGerarBody, registro?: EtiquetaRegistroInput): Promise<void> {
    const resposta = await this.request('/api/etiqueta/gerar', this.post(body));
    const etiqueta = await resposta.json();
    if (!resposta.ok) throw new Error(etiqueta.error || 'Erro ao gerar etiqueta');
    this.openHtml(etiqueta.html);
    if (registro) await this.registrar(registro);
  }

  private async registrar(registro: EtiquetaRegistroInput): Promise<void> {
    const resposta = await this.request('/api/etiquetas/registrar', this.post(registro));
    if (resposta.ok) return;
    const resultado = await resposta.json();
    throw new Error(resultado.error || 'Erro ao registrar etiqueta');
  }

  private post(body: object): RequestInit {
    return {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
  }
}
