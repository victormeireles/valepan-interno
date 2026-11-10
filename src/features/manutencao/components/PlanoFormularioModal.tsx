'use client';

import { useEffect, useId, useState } from 'react';
import type { EntradaSalvarPlano } from '@/app/actions/manutencao-plano-actions';
import { IconButton } from '@/components/ui/IconButton';
import ModalPortal from '@/components/ui/ModalPortal';
import {
  FORMULARIO_PLANO_VAZIO,
  PlanoFormulario,
  type MaquinaPlanoOpcao,
  type PlanoFormularioValor,
} from './PlanoFormulario';

type ResultadoSalvar = { ok: boolean; mensagem: string };

type PlanoFormularioModalProps = {
  aberto: boolean;
  valorInicial: PlanoFormularioValor | null;
  maquinas: MaquinaPlanoOpcao[];
  onFechar: () => void;
  onSalvar: (entrada: EntradaSalvarPlano) => Promise<ResultadoSalvar>;
};

export function PlanoFormularioModal({
  aberto,
  valorInicial,
  maquinas,
  onFechar,
  onSalvar,
}: PlanoFormularioModalProps) {
  const tituloId = useId();
  const [valor, setValor] = useState(FORMULARIO_PLANO_VAZIO);
  const [origem, setOrigem] = useState(FORMULARIO_PLANO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const editando = Boolean(valorInicial?.id);

  useEffect(() => {
    if (!aberto) return;
    const inicial = valorInicial ?? FORMULARIO_PLANO_VAZIO;
    setValor(inicial);
    setOrigem(inicial);
    setErro(null);
    setSalvando(false);
  }, [aberto, valorInicial]);

  useEffect(() => {
    if (!aberto) return;
    const fecharTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !salvando) onFechar();
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', fecharTecla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', fecharTecla);
    };
  }, [aberto, onFechar, salvando]);

  if (!aberto) return null;

  async function gravar(entrada: EntradaSalvarPlano) {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const resultado = await onSalvar(entrada);
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      onFechar();
    } catch {
      setErro('Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  function tentarFechar() {
    if (!salvando) onFechar();
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-4"
        onClick={tentarFechar}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          className={[
            'flex w-full max-w-lg flex-col overflow-hidden border-stone-200 bg-white shadow-lg',
            'max-h-[100dvh] rounded-t-2xl border sm:max-h-[min(85dvh,42rem)] sm:rounded-2xl',
            'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] sm:pt-0',
          ].join(' ')}
          onClick={(evento) => evento.stopPropagation()}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h2
                id={tituloId}
                className="text-lg font-semibold tracking-tight text-stone-900 sm:text-xl"
              >
                {editando ? 'Editar plano' : 'Novo plano'}
              </h2>
              <p className="mt-0.5 text-sm text-stone-500">
                {editando ? 'Preventiva da máquina' : 'Cadastro de plano preventivo'}
              </p>
            </div>
            <IconButton
              icon="close"
              label="Fechar"
              size="lg"
              variant="ghost"
              disabled={salvando}
              onClick={tentarFechar}
            />
          </header>
          <PlanoFormulario
            maquinas={maquinas}
            valor={valor}
            origem={origem}
            salvando={salvando}
            erro={erro}
            onChange={setValor}
            onSubmit={gravar}
            onCancelar={tentarFechar}
          />
        </section>
      </div>
    </ModalPortal>
  );
}
