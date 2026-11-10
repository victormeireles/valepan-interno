'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import type { PecaItem } from '@/app/manutencao/manutencao-peca-consulta';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import ModalPortal from '@/components/ui/ModalPortal';
import type { PedidoEntrada, PedidoSaida } from './movimento-pedido';

export type TipoMovimentoPeca = 'entrada' | 'saida';

type ResultadoMovimento = { ok: boolean; mensagem: string };

type PecaMovimentoModalProps = {
  aberto: boolean;
  tipo: TipoMovimentoPeca | null;
  peca: PecaItem | null;
  onFechar: () => void;
  onEntrada: (pedido: PedidoEntrada) => Promise<ResultadoMovimento>;
  onSaida: (pedido: PedidoSaida) => Promise<ResultadoMovimento>;
};

export function PecaMovimentoModal({
  aberto,
  tipo,
  peca,
  onFechar,
  onEntrada,
  onSaida,
}: PecaMovimentoModalProps) {
  const tituloId = useId();
  const [quantidade, setQuantidade] = useState('');
  const [preco, setPreco] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setQuantidade('');
    setPreco('');
    setMotivo('');
    setErro(null);
    setSalvando(false);
  }, [aberto, tipo, peca?.id]);

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

  if (!aberto || !tipo || !peca) return null;

  const pecaAtual = peca;
  const entrada = tipo === 'entrada';
  const titulo = entrada ? 'Entrada de peça' : 'Saída de peça';

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const resultado = entrada
        ? await onEntrada({ pecaId: pecaAtual.id, quantidade, preco })
        : await onSaida({ pecaId: pecaAtual.id, quantidade, motivo });
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      onFechar();
    } catch {
      setErro('Não foi possível movimentar.');
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
            'flex w-full max-w-md flex-col overflow-hidden border-stone-200 bg-white shadow-lg',
            'max-h-[100dvh] rounded-t-2xl border sm:max-h-[min(85dvh,32rem)] sm:rounded-2xl',
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
                {titulo}
              </h2>
              <p className="mt-0.5 truncate text-sm text-stone-500">
                <span className="font-mono tabular-nums">{peca.codigo}</span>
                <span className="mx-1.5 text-stone-300">·</span>
                {peca.nome}
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
          <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {erro ? (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
                >
                  <span className="material-icons text-base" aria-hidden="true">
                    error
                  </span>
                  {erro}
                </p>
              ) : null}
              <Input
                label="Quantidade"
                numeric
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                value={quantidade}
                onChange={(evento) => setQuantidade(evento.target.value)}
              />
              {entrada ? (
                <Input
                  label="Preço"
                  numeric
                  inputMode="decimal"
                  autoComplete="off"
                  value={preco}
                  onChange={(evento) => setPreco(evento.target.value)}
                />
              ) : (
                <Input
                  label="Motivo"
                  autoComplete="off"
                  value={motivo}
                  onChange={(evento) => setMotivo(evento.target.value)}
                />
              )}
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-100 px-4 py-4 sm:flex-row sm:px-5">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={salvando}
                className="flex-1"
                onClick={tentarFechar}
              >
                Cancelar
              </Button>
              <Button type="submit" size="lg" disabled={salvando} className="flex-1">
                {salvando
                  ? 'Registrando…'
                  : entrada
                    ? 'Registrar entrada'
                    : 'Registrar saída'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </ModalPortal>
  );
}
