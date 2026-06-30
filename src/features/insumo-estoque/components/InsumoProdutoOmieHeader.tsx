'use client';

type Props = {
  categoriaTitulo: string | null;
  categoriaSubtitulo?: string | null;
};

export default function InsumoProdutoOmieHeader({
  categoriaTitulo,
  categoriaSubtitulo,
}: Props) {
  if (!categoriaTitulo) return null;

  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-stone-500" title={categoriaTitulo}>
        {categoriaTitulo}
      </p>
      {categoriaSubtitulo ? (
        <p className="mt-0.5 truncate text-xs text-stone-400" title={categoriaSubtitulo}>
          {categoriaSubtitulo}
        </p>
      ) : null}
    </div>
  );
}
