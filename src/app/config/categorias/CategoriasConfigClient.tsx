'use client';

import { useMemo, useState } from 'react';
import {
  updateCategoriaVisivelEmbalagem,
  type CategoriaVisibilidadeConfig,
} from '@/app/actions/categoria-visibilidade-actions';
import { isCategoriaSempreVisivelEmbalagem } from '@/domain/categorias/categoria-embalagem-visibilidade-rules';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Toast } from '@/components/ui/Toast';

type Props = {
  initialCategorias: CategoriaVisibilidadeConfig[];
};

export default function CategoriasConfigClient({ initialCategorias }: Props) {
  const [categorias, setCategorias] = useState(initialCategorias);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const visiveisCount = useMemo(
    () => categorias.filter((categoria) => categoria.visivel_embalagem).length,
    [categorias],
  );

  const handleToggle = async (categoriaId: string, next: boolean) => {
    const prev = categorias;
    setCategorias((items) =>
      items.map((categoria) =>
        categoria.id === categoriaId
          ? { ...categoria, visivel_embalagem: next }
          : categoria,
      ),
    );
    setSavingId(categoriaId);
    setToast(null);

    const result = await updateCategoriaVisivelEmbalagem(categoriaId, next);
    setSavingId(null);

    if (!result.success) {
      setCategorias(prev);
      setToast({ type: 'err', text: result.error });
      return;
    }

    setToast({
      type: 'ok',
      text: next ? 'Categoria visível na embalagem' : 'Categoria oculta na embalagem',
    });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <ConfigPageHeader
        title="Categorias"
        icon="category"
        description="Escolha quais categorias de produto aparecem no painel Realizado / Embalagem."
      />

      <p className="text-sm text-stone-600">
        {visiveisCount} de {categorias.length} categorias visíveis na embalagem
      </p>

      {toast && (
        <Toast tone={toast.type === 'ok' ? 'success' : 'error'} onClose={() => setToast(null)}>
          {toast.text}
        </Toast>
      )}

      <Card className="divide-y divide-stone-100 p-0 overflow-hidden">
        {categorias.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">Nenhuma categoria ativa encontrada.</p>
        ) : (
          categorias.map((categoria) => {
            const sempreVisivel = isCategoriaSempreVisivelEmbalagem(categoria.nome);
            return (
            <div
              key={categoria.id}
              className="flex min-h-14 items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-stone-900">{categoria.nome}</p>
                <p className="text-xs text-stone-500">
                  {sempreVisivel ? 'Sempre visível na embalagem' : 'Visível na embalagem'}
                </p>
              </div>
              <Switch
                checked={categoria.visivel_embalagem}
                disabled={sempreVisivel || savingId === categoria.id}
                onChange={(next) => handleToggle(categoria.id, next)}
              />
            </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
