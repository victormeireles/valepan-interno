/** Proporções das colunas — somam 100% do espaço flexível entre colunas fixas. */
export default function OrdensProducaoTableColGroup() {
  return (
    <colgroup>
      <col className="w-9" />
      <col className="w-9" />
      <col className="w-[9%]" />
      <col className="w-[20%]" />
      <col className="w-[13%]" />
      <col className="w-[8%]" />
      <col className="w-[8%]" />
      <col className="w-[9%]" />
      <col className="w-[7%]" />
      <col className="w-0 xl:w-[14%]" />
      <col className="w-11" />
    </colgroup>
  );
}
