type OrdemProducaoQtyValueProps = {
  value: number | null;
  emphasize?: boolean;
};

export default function OrdemProducaoQtyValue({
  value,
  emphasize = false,
}: OrdemProducaoQtyValueProps) {
  if (value === null || value <= 0) {
    return (
      <span className="text-[13px] tabular-nums text-stone-300" aria-hidden="true">
        —
      </span>
    );
  }

  return (
    <span
      className={`text-[13px] tabular-nums text-stone-800 ${
        emphasize ? 'font-semibold' : 'font-medium'
      }`}
    >
      {value.toLocaleString('pt-BR')}
    </span>
  );
}
