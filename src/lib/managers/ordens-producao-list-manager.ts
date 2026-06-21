import type { OrdensProducaoListResponse } from '@/domain/types/ordens-producao-painel';

export type OrdemProducaoCreateBody = {
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  observacao?: string;
  modoQuantidade: 'latas' | 'unidades';
  latas?: number;
  unidades?: number;
  assadeiraNome?: string;
};

type ApiErrorResponse = {
  error?: string;
};

export class OrdensProducaoListManager {
  async fetchList(date: string): Promise<OrdensProducaoListResponse> {
    const res = await fetch(`/api/ordens-producao?date=${encodeURIComponent(date)}`);
    const data = (await res.json()) as OrdensProducaoListResponse & ApiErrorResponse;
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao carregar ordens');
    }
    return data;
  }

  async reorder(dataProducao: string, orderedIds: string[]): Promise<void> {
    const res = await fetch('/api/ordens-producao/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataProducao, orderedIds }),
    });
    if (!res.ok) {
      const data = (await res.json()) as ApiErrorResponse;
      throw new Error(data.error || 'Falha ao reordenar');
    }
  }

  async create(body: OrdemProducaoCreateBody): Promise<string> {
    const res = await fetch('/api/ordens-producao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { id?: string } & ApiErrorResponse;
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao criar ordem');
    }
    if (!data.id) {
      throw new Error('Resposta inválida ao criar ordem');
    }
    return data.id;
  }

  async update(id: string, body: OrdemProducaoCreateBody): Promise<void> {
    const res = await fetch(`/api/ordens-producao/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json()) as ApiErrorResponse;
      throw new Error(data.error || 'Falha ao atualizar ordem');
    }
  }

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/ordens-producao/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = (await res.json()) as ApiErrorResponse;
      throw new Error(data.error || 'Falha ao excluir ordem');
    }
  }

  async removeMany(ids: string[]): Promise<{
    deleted: string[];
    failed: { id: string; error: string }[];
  }> {
    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        await this.remove(id);
        deleted.push(id);
      } catch (err) {
        failed.push({
          id,
          error: err instanceof Error ? err.message : 'Falha ao excluir ordem',
        });
      }
    }

    return { deleted, failed };
  }
}

export const ordensProducaoListManager = new OrdensProducaoListManager();
