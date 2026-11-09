type FilaVaziaProps = {
  mensagem: string;
};

export function FilaVazia({ mensagem }: FilaVaziaProps) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold tracking-tight text-stone-900">Ordens</h1>
      <p className="mt-2 text-sm text-stone-600">{mensagem}</p>
    </section>
  );
}
