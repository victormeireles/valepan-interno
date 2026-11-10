type FilaVaziaProps = {
  mensagem: string;
  comTitulo?: boolean;
};

export function FilaVazia({ mensagem, comTitulo = true }: FilaVaziaProps) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      {comTitulo ? (
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Fila</h1>
      ) : null}
      <p className={comTitulo ? 'mt-2 text-sm text-stone-600' : 'text-sm text-stone-600'}>
        {mensagem}
      </p>
    </section>
  );
}
