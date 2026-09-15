'use client';

type Props = {
  visible: boolean;
  label?: string;
};

/** Barra no topo para o usuário perceber refresh/navegação lenta. */
export default function InsumoMapeamentoLoadingBar({
  visible,
  label = 'Carregando…',
}: Props) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-1 w-full overflow-hidden bg-amber-100">
        <div className="h-full w-full animate-pulse bg-amber-600" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
