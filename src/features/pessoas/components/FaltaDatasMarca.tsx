export function FaltaDatasMarca({ periodos }: { periodos: string[] }) {
  if (periodos.length === 0) return null;
  const texto = periodos.join(' · ');
  return (
    <span title={texto}>
      <span className="text-stone-300" aria-hidden="true"> · </span>
      <span className="font-mono tabular-nums text-stone-800">{texto}</span>
    </span>
  );
}
