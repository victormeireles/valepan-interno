'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apagarPlanoSaudeFaixa, gravarPlanoSaudeFaixa, type PlanoSaudeFaixaForm } from '@/app/actions/plano-saude-faixa-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RemuneracaoCentavos } from '@/domain/pessoas/remuneracao-centavos';
import { PlanoSaudeFaixaRotulo, type PlanoSaudeFaixa } from '@/domain/pessoas/plano-saude-faixa';

const VAZIO: PlanoSaudeFaixaForm = { idadeMin: '', idadeMax: '', valor: '' };
const centavos = new RemuneracaoCentavos();
const rotulo = new PlanoSaudeFaixaRotulo();

export function PlanoSaudeFaixasClient({ faixas }: { faixas: PlanoSaudeFaixa[] }) {
  const router = useRouter();
  const [form, setForm] = useState<PlanoSaudeFaixaForm>(VAZIO);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function gravar() {
    setOcupado(true);
    setErro('');
    setAviso('');
    const resultado = await gravarPlanoSaudeFaixa(form);
    setOcupado(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setForm(VAZIO);
    setAviso('Faixa gravada.');
    router.refresh();
  }

  async function apagar(faixa: PlanoSaudeFaixa) {
    if (!window.confirm(`Apagar a faixa de ${rotulo.exibir(faixa)}?`)) return;
    setOcupado(true);
    const resultado = await apagarPlanoSaudeFaixa(faixa.id);
    setOcupado(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    if (form.id === faixa.id) setForm(VAZIO);
    setAviso('Faixa apagada.');
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ConfigPageHeader
        title="Plano de saúde"
        icon="health_and_safety"
        description="Valor mensal por pessoa, conforme a faixa etária. A folha usa a idade de quem está marcado com plano."
      />
      <FaixaForm form={form} erro={erro} aviso={aviso} ocupado={ocupado} onChange={setForm} onSubmit={gravar} />
      <FaixaLista faixas={faixas} onEditar={(faixa) => editar(faixa, setForm)} onApagar={apagar} />
    </div>
  );
}

function editar(faixa: PlanoSaudeFaixa, definir: (form: PlanoSaudeFaixaForm) => void): void {
  definir({
    id: faixa.id,
    idadeMin: String(faixa.idadeMin),
    idadeMax: faixa.idadeMax === null ? '' : String(faixa.idadeMax),
    valor: centavos.digitar(faixa.valorCentavos),
  });
}

function FaixaForm({
  form,
  erro,
  aviso,
  ocupado,
  onChange,
  onSubmit,
}: {
  form: PlanoSaudeFaixaForm;
  erro: string;
  aviso: string;
  ocupado: boolean;
  onChange: (form: PlanoSaudeFaixaForm) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Idade inicial" inputMode="numeric" value={form.idadeMin} onChange={(event) => onChange({ ...form, idadeMin: event.target.value })} required />
        <Input label="Idade final" inputMode="numeric" hint="Vazio significa ou mais." value={form.idadeMax} onChange={(event) => onChange({ ...form, idadeMax: event.target.value })} />
        <Input label="Valor mensal" numeric value={form.valor} onChange={(event) => onChange({ ...form, valor: event.target.value })} required />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={ocupado}>{form.id ? 'Salvar faixa' : 'Nova faixa'}</Button>
        {form.id ? (
          <Button type="button" variant="secondary" size="lg" disabled={ocupado} onClick={() => onChange(VAZIO)}>
            Cancelar
          </Button>
        ) : null}
        {erro ? <p className="text-sm text-red-700">{erro}</p> : null}
        {aviso ? <p className="text-sm text-emerald-800">{aviso}</p> : null}
      </div>
    </form>
  );
}

function FaixaLista({
  faixas,
  onEditar,
  onApagar,
}: {
  faixas: PlanoSaudeFaixa[];
  onEditar: (faixa: PlanoSaudeFaixa) => void;
  onApagar: (faixa: PlanoSaudeFaixa) => void;
}) {
  if (faixas.length === 0) return <p className="text-sm text-stone-600">Nenhuma faixa cadastrada.</p>;
  return (
    <ul className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {faixas.map((faixa) => (
        <li key={faixa.id} className="flex min-h-11 items-center justify-between gap-3 border-b border-stone-100 px-4 py-2 last:border-0">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-stone-900">{rotulo.exibir(faixa)}</span>
            <span className="block font-mono text-sm tabular-nums text-stone-700">{centavos.formatar(faixa.valorCentavos)}</span>
          </span>
          <span className="flex shrink-0 gap-2">
            <Button type="button" variant="secondary" size="lg" onClick={() => onEditar(faixa)}>Editar</Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => onApagar(faixa)}>Apagar</Button>
          </span>
        </li>
      ))}
    </ul>
  );
}
