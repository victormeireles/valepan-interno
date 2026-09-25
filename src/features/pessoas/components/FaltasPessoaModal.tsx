'use client';

import { useState } from 'react';
import { cancelarFalta, editarFalta, type FaltaListaItem } from '@/app/actions/pessoas-faltas-actions';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatISODateBr } from '@/lib/utils/date-utils';

const CLASSIFICACOES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'justificada', label: 'Justificada' },
  { value: 'injustificada', label: 'Injustificada' },
];

type Props = {
  nome: string;
  codigo: string;
  faltas: FaltaListaItem[];
  onFechar: () => void;
  onAviso: (texto: string, ok: boolean) => void;
  onMudou: () => void;
};

export function FaltasPessoaModal({ nome, codigo, faltas, onFechar, onAviso, onMudou }: Props) {
  const [cancelarId, setCancelarId] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);

  async function salvar(id: string, form: FormData) {
    setPendente(true);
    const resultado = await editarFalta(id, {
      classificacao: String(form.get('classificacao') ?? ''),
      justificativa: String(form.get('justificativa') ?? ''),
    });
    setPendente(false);
    onAviso(resultado.mensagem, resultado.ok);
    if (resultado.ok) onMudou();
  }

  async function cancelar(form: FormData) {
    if (!cancelarId) return;
    setPendente(true);
    const resultado = await cancelarFalta(cancelarId, String(form.get('motivo') ?? ''));
    setPendente(false);
    onAviso(resultado.mensagem, resultado.ok);
    if (resultado.ok) {
      setCancelarId(null);
      onMudou();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onFechar}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="faltas-pessoa-titulo"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-stone-200 bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <h2 id="faltas-pessoa-titulo" className="text-xl font-semibold tracking-tight text-stone-900">{nome}</h2>
            <p className="text-sm text-stone-500">{codigo}</p>
          </div>
          <IconButton icon="close" label="Fechar" size="lg" variant="ghost" onClick={onFechar} />
        </header>
        <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
          {faltas.length === 0 ? <p className="text-sm text-stone-500">Nenhuma falta neste filtro.</p> : null}
          {faltas.map((falta) => (
            <FaltaEditor key={`${falta.id}-${falta.classificacao}-${falta.justificativa ?? ''}`} falta={falta} pendente={pendente} cancelando={cancelarId === falta.id} onSalvar={(form) => salvar(falta.id, form)} onCancelar={cancelar} onPedirCancelamento={() => setCancelarId(falta.id)} onDesistir={() => setCancelarId(null)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function FaltaEditor({
  falta,
  pendente,
  cancelando,
  onSalvar,
  onCancelar,
  onPedirCancelamento,
  onDesistir,
}: {
  falta: FaltaListaItem;
  pendente: boolean;
  cancelando: boolean;
  onSalvar: (form: FormData) => void;
  onCancelar: (form: FormData) => void;
  onPedirCancelamento: () => void;
  onDesistir: () => void;
}) {
  return (
    <article className="rounded-xl border border-stone-200 p-3">
      <p className="mb-2 font-mono text-sm tabular-nums text-stone-700">{formatISODateBr(falta.data)}</p>
      <form className="flex flex-col gap-2" action={onSalvar}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <Select name="classificacao" label="Classificação" defaultValue={falta.classificacao} options={CLASSIFICACOES} />
          <div className="flex items-end gap-2">
            <Button type="submit" size="lg" disabled={pendente}>Salvar</Button>
            <Button type="button" size="lg" variant="secondary" onClick={onPedirCancelamento}>Remover</Button>
          </div>
        </div>
        <Input name="justificativa" label="Justificativa" defaultValue={falta.justificativa ?? ''} />
      </form>
      {cancelando ? (
        <form className="mt-3 flex flex-col gap-2" action={onCancelar}>
          <Input name="motivo" label="Motivo do cancelamento" required />
          <div className="flex gap-2">
            <Button type="submit" size="lg" variant="danger" disabled={pendente}>Confirmar</Button>
            <Button type="button" size="lg" variant="secondary" onClick={onDesistir}>Voltar</Button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
