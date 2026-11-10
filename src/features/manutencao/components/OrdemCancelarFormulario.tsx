'use client';

import { useId, useState, type FormEvent } from 'react';
import { cancelarOrdem } from '@/app/actions/manutencao-ordem-actions';
import { Button } from '@/components/ui/Button';

type OrdemCancelarFormularioProps = {
  numero: number;
  exigeMotivo: boolean;
  onConcluir: (mensagem: string) => void;
};

const CARTAO = 'max-w-xl space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm';

export function OrdemCancelarFormulario({
  numero,
  exigeMotivo,
  onConcluir,
}: OrdemCancelarFormularioProps) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    if (exigeMotivo && !motivo.trim()) {
      setErro('Informe o motivo.');
      return;
    }
    await gravar(numero, exigeMotivo ? motivo : '', setErro, setEnviando, onConcluir);
  }

  return (
    <form onSubmit={enviar} className={CARTAO}>
      <h2 className="text-base font-semibold text-stone-900">Cancelar ordem</h2>
      {exigeMotivo ? (
        <CampoMotivo motivo={motivo} onAlterar={setMotivo} />
      ) : (
        <p className="text-sm text-stone-700">Confirmar o cancelamento desta ordem.</p>
      )}
      {erro ? (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      ) : null}
      <Button type="submit" variant="danger" size="lg" disabled={enviando} icon="cancel">
        {exigeMotivo ? 'Cancelar ordem' : 'Confirmar cancelamento'}
      </Button>
    </form>
  );
}

async function gravar(
  numero: number,
  motivo: string,
  definirErro: (mensagem: string | null) => void,
  definirEnviando: (enviando: boolean) => void,
  aoCancelar: (mensagem: string) => void,
) {
  definirEnviando(true);
  definirErro(null);
  try {
    const resultado = await cancelarOrdem(numero, motivo);
    if (!resultado.ok) {
      definirErro(resultado.mensagem);
      return;
    }
    aoCancelar(resultado.mensagem);
  } finally {
    definirEnviando(false);
  }
}

function CampoMotivo({
  motivo,
  onAlterar,
}: {
  motivo: string;
  onAlterar: (motivo: string) => void;
}) {
  const campoId = useId();

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={campoId} className="text-sm font-medium tracking-[-0.004em] text-stone-700">
        Motivo
        <span className="text-danger"> *</span>
      </label>
      <textarea
        id={campoId}
        value={motivo}
        required
        onChange={(evento) => onAlterar(evento.target.value)}
        className="min-h-28 w-full rounded-[9px] border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/35"
      />
    </div>
  );
}
