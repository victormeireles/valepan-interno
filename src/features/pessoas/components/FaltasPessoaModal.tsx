'use client';

import { useEffect, useState } from 'react';
import { cancelarFalta, editarFalta, type FaltaListaItem } from '@/app/actions/pessoas-faltas-actions';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FaltaCampos } from '@/domain/pessoas/falta-campos';
import type { ClassificacaoFalta } from '@/domain/pessoas/falta-lancamento';
import { formatISODateBr } from '@/lib/utils/date-utils';
import FaltaAnexoCampo from './FaltaAnexoCampo';
import { CLASSIFICACOES, MEDIDAS } from './falta-opcoes';

const campos = new FaltaCampos();

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

  useEffect(() => {
    const fechar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFechar();
    };
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', fechar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', fechar);
    };
  }, [onFechar]);

  async function salvar(id: string, form: FormData) {
    setPendente(true);
    const resultado = await editarFalta(id, {
      classificacao: String(form.get('classificacao') ?? ''),
      justificativa: String(form.get('justificativa') ?? ''),
      medida: String(form.get('medida') ?? ''),
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="faltas-pessoa-titulo"
        className={[
          'flex w-full max-w-2xl flex-col overflow-hidden border-stone-200 bg-white shadow-lg',
          'max-h-[100dvh] rounded-t-2xl border sm:max-h-[min(85dvh,40rem)] sm:rounded-2xl',
          'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] sm:pt-0',
        ].join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2
              id="faltas-pessoa-titulo"
              className="truncate text-lg font-semibold tracking-tight text-stone-900 sm:text-xl"
            >
              {nome}
            </h2>
            <p className="font-mono text-sm tabular-nums text-stone-500">{codigo}</p>
          </div>
          <IconButton icon="close" label="Fechar" size="lg" variant="ghost" onClick={onFechar} />
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {faltas.length === 0 ? <p className="text-sm text-stone-500">Nenhuma falta neste filtro.</p> : null}
          {faltas.map((falta) => (
            <FaltaEditor
              key={`${falta.id}-${falta.classificacao}-${falta.justificativa ?? ''}`}
              falta={falta}
              onMudou={onMudou}
              pendente={pendente}
              cancelando={cancelarId === falta.id}
              onSalvar={(form) => salvar(falta.id, form)}
              onCancelar={cancelar}
              onPedirCancelamento={() => setCancelarId(falta.id)}
              onDesistir={() => setCancelarId(null)}
            />
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
  onMudou,
  onSalvar,
  onCancelar,
  onPedirCancelamento,
  onDesistir,
}: {
  falta: FaltaListaItem;
  pendente: boolean;
  onMudou: () => void;
  cancelando: boolean;
  onSalvar: (form: FormData) => void;
  onCancelar: (form: FormData) => void;
  onPedirCancelamento: () => void;
  onDesistir: () => void;
}) {
  const [classificacao, setClassificacao] = useState(falta.classificacao);
  const original = classificacao === falta.classificacao;

  return (
    <article className="rounded-xl border border-stone-200 p-3">
      <p className="mb-2 font-mono text-sm tabular-nums text-stone-700">{formatISODateBr(falta.data)}</p>
      <form className="flex flex-col gap-2" action={onSalvar}>
        <Select
          name="classificacao"
          label="Classificação"
          value={classificacao}
          onChange={(event) => setClassificacao(event.target.value)}
          options={CLASSIFICACOES}
        />
        {campos.mostraJustificativa(classificacao as ClassificacaoFalta) ? (
          <Input
            key={`justificativa-${classificacao}`}
            name="justificativa"
            label="Justificativa"
            defaultValue={original ? (falta.justificativa ?? '') : ''}
          />
        ) : null}
        {campos.mostraMedida(classificacao as ClassificacaoFalta) ? (
          <Select
            key={`medida-${classificacao}`}
            name="medida"
            label="Medida"
            defaultValue={original ? (falta.medida ?? '') : ''}
            options={MEDIDAS}
          />
        ) : null}
        <FaltaAnexoCampo
          faltaId={falta.id}
          temAnexo={falta.temAnexo}
          arquivoLocal={null}
          onArquivo={() => undefined}
          onEnviouRemoto={onMudou}
          onRemoveuRemoto={onMudou}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="submit" size="lg" fullWidth disabled={pendente}>
            Salvar
          </Button>
          <Button type="button" size="lg" variant="secondary" fullWidth onClick={onPedirCancelamento}>
            Remover
          </Button>
        </div>
      </form>
      {cancelando ? (
        <form className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3" action={onCancelar}>
          <Input name="motivo" label="Motivo do cancelamento" required />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="submit" size="lg" variant="danger" fullWidth disabled={pendente}>
              Confirmar
            </Button>
            <Button type="button" size="lg" variant="secondary" fullWidth onClick={onDesistir}>
              Voltar
            </Button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
