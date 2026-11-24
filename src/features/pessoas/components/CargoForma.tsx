import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CargoForm } from '@/app/actions/pessoas-cargo-actions';

export function CargoForma({
  form,
  erro,
  aviso,
  ocupado,
  onChange,
  onSubmit,
  onCancelar,
}: {
  form: CargoForm;
  erro: string;
  aviso: string;
  ocupado: boolean;
  onChange: (form: CargoForm) => void;
  onSubmit: () => void;
  onCancelar: () => void;
}) {
  return (
    <form
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Nome" value={form.nome} onChange={(event) => onChange({ ...form, nome: event.target.value })} required />
        </div>
        <Input label="De" numeric value={form.de} onChange={(event) => onChange({ ...form, de: event.target.value })} required />
        <Input label="Até" numeric value={form.ate} onChange={(event) => onChange({ ...form, ate: event.target.value })} required />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={ocupado}>{form.id ? 'Salvar cargo' : 'Novo cargo'}</Button>
        {form.id ? (
          <Button type="button" variant="secondary" size="lg" disabled={ocupado} onClick={onCancelar}>
            Cancelar
          </Button>
        ) : null}
        {erro ? <p className="text-sm text-red-700">{erro}</p> : null}
        {aviso ? <p className="text-sm text-emerald-800">{aviso}</p> : null}
      </div>
    </form>
  );
}
