'use client';

import { useEffect, useId } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, type SelectOption } from '@/components/ui/Select';
import { ConversorSaldo } from '@/domain/manutencao/conversor-saldo';
import { QuantidadeEstoque } from '@/domain/manutencao/quantidade-estoque';
import {
  useFinalizacao,
  type AjudanteEscolha,
  type LinhaPeca,
  type ModoFinalizacao,
  type PecaEscolha,
  type ValoresIniciaisFinalizacao,
} from './ordem-finalizar-estado';

type OrdemFinalizarFormularioProps = {
  aberto: boolean;
  numero: number;
  modo: ModoFinalizacao;
  pecas: PecaEscolha[];
  ajudantes: AjudanteEscolha[];
  inicioPadrao: string;
  fimPadrao: string;
  inicioIsoPadrao: string;
  fimIsoPadrao: string;
  iniciais: ValoresIniciaisFinalizacao | null;
  onFechar: () => void;
  onConcluir: (mensagem: string) => void;
};

export function OrdemFinalizarFormulario({
  aberto,
  numero,
  modo,
  pecas,
  ajudantes,
  inicioPadrao,
  fimPadrao,
  inicioIsoPadrao,
  fimIsoPadrao,
  iniciais,
  onFechar,
  onConcluir,
}: OrdemFinalizarFormularioProps) {
  const tituloId = useId();
  const formulario = useFinalizacao(
    numero,
    pecas,
    { inicio: inicioPadrao, fim: fimPadrao, inicioIso: inicioIsoPadrao, fimIso: fimIsoPadrao },
    modo,
    iniciais,
    (mensagem) => {
      onConcluir(mensagem);
      onFechar();
    },
  );

  useEffect(() => {
    if (!aberto) return;
    const fecharTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !formulario.enviando) onFechar();
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', fecharTecla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', fecharTecla);
    };
  }, [aberto, formulario.enviando, onFechar]);

  if (!aberto) return null;

  const titulo = modo === 'editar' ? 'Editar finalização' : 'Finalizar ordem';
  const rotuloBotao = modo === 'editar' ? 'Salvar finalização' : 'Finalizar ordem';

  function tentarFechar() {
    if (!formulario.enviando) onFechar();
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
            'flex w-full max-w-xl flex-col overflow-hidden border-stone-200 bg-white shadow-lg',
            'max-h-[100dvh] rounded-t-2xl border sm:max-h-[min(90dvh,44rem)] sm:rounded-2xl',
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
              <p className="mt-0.5 text-sm text-stone-500">Horários, serviços, peças e ajudantes</p>
            </div>
            <IconButton
              icon="close"
              label="Fechar"
              size="lg"
              variant="ghost"
              disabled={formulario.enviando}
              onClick={tentarFechar}
            />
          </header>
          <form onSubmit={formulario.enviar} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <Horarios
                inicio={formulario.inicio}
                fim={formulario.fim}
                onInicio={formulario.definirInicio}
                onFim={formulario.definirFim}
              />
              <CampoServicos servicos={formulario.servicos} onAlterar={formulario.definirServicos} />
              <SeletorPecas
                pecas={pecas}
                pecaId={formulario.pecaId}
                quantidade={formulario.quantidade}
                onPeca={formulario.definirPecaId}
                onQuantidade={formulario.definirQuantidade}
                onAdicionar={formulario.adicionar}
              />
              <LinhasPeca linhas={formulario.linhas} onRemover={formulario.remover} />
              <AjudantesOpcao
                ajudantes={ajudantes}
                marcados={formulario.ajudanteIds}
                onAlternar={formulario.alternarAjudante}
              />
              {formulario.erro ? (
                <p role="alert" className="text-sm text-red-700">
                  {formulario.erro}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-100 px-4 py-4 sm:flex-row sm:px-5">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={formulario.enviando}
                className="flex-1"
                onClick={tentarFechar}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={formulario.enviando}
                icon="check_circle"
                className="flex-1"
              >
                {formulario.enviando ? 'Salvando…' : rotuloBotao}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </ModalPortal>
  );
}

function Horarios({
  inicio,
  fim,
  onInicio,
  onFim,
}: {
  inicio: string;
  fim: string;
  onInicio: (valor: string) => void;
  onFim: (valor: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        type="datetime-local"
        label="Início"
        required
        value={inicio}
        onChange={(evento) => onInicio(evento.target.value)}
      />
      <Input
        type="datetime-local"
        label="Fim"
        required
        value={fim}
        onChange={(evento) => onFim(evento.target.value)}
      />
    </div>
  );
}

function CampoServicos({
  servicos,
  onAlterar,
}: {
  servicos: string;
  onAlterar: (servicos: string) => void;
}) {
  const campoId = useId();

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={campoId} className="text-sm font-medium tracking-[-0.004em] text-stone-700">
        Serviços
        <span className="text-danger"> *</span>
      </label>
      <textarea
        id={campoId}
        value={servicos}
        required
        onChange={(evento) => onAlterar(evento.target.value)}
        className="min-h-28 w-full rounded-[9px] border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/35"
      />
    </div>
  );
}

function SeletorPecas({
  pecas,
  pecaId,
  quantidade,
  onPeca,
  onQuantidade,
  onAdicionar,
}: {
  pecas: PecaEscolha[];
  pecaId: string;
  quantidade: string;
  onPeca: (id: string) => void;
  onQuantidade: (quantidade: string) => void;
  onAdicionar: () => void;
}) {
  return (
    <div className="space-y-3">
      <Select
        label="Peça"
        value={pecaId}
        options={opcoesPeca(pecas)}
        hint={pecas.length === 0 ? 'Nenhuma peça ativa.' : undefined}
        onChange={(evento) => onPeca(evento.target.value)}
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-36 flex-1">
          <Input
            label="Quantidade"
            inputMode="decimal"
            numeric
            value={quantidade}
            placeholder="0,000"
            onChange={(evento) => onQuantidade(evento.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" size="lg" onClick={onAdicionar}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function LinhasPeca({
  linhas,
  onRemover,
}: {
  linhas: LinhaPeca[];
  onRemover: (pecaId: string) => void;
}) {
  if (linhas.length === 0) return null;

  return (
    <ul className="overflow-hidden rounded-xl border border-stone-200">
      {linhas.map((linha) => (
        <li
          key={linha.pecaId}
          className="flex min-h-11 items-center justify-between gap-3 border-b border-stone-100 px-3 py-2 last:border-b-0 even:bg-stone-50/60"
        >
          <span className="min-w-0 text-sm text-stone-900">
            <span className="block truncate">{linha.rotulo}</span>
            <span className="font-mono text-xs tabular-nums text-stone-600">
              {linha.quantidadeTexto} {linha.unidade}
            </span>
          </span>
          <Button type="button" variant="ghost" size="lg" onClick={() => onRemover(linha.pecaId)}>
            Remover
          </Button>
        </li>
      ))}
    </ul>
  );
}

function AjudantesOpcao({
  ajudantes,
  marcados,
  onAlternar,
}: {
  ajudantes: AjudanteEscolha[];
  marcados: string[];
  onAlternar: (id: string) => void;
}) {
  if (ajudantes.length === 0) return null;

  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium text-stone-700">Ajudantes</legend>
      <ul>
        {ajudantes.map((ajudante) => (
          <li key={ajudante.id}>
            <label className="flex min-h-11 items-center gap-3 text-sm text-stone-800">
              <input
                type="checkbox"
                className="size-5 accent-amber-600"
                checked={marcados.includes(ajudante.id)}
                onChange={() => onAlternar(ajudante.id)}
              />
              {ajudante.nome}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

const quantidades = new QuantidadeEstoque();
const saldos = new ConversorSaldo();

function opcoesPeca(pecas: PecaEscolha[]): SelectOption[] {
  return [
    { value: '', label: 'Selecione a peça' },
    ...pecas.map((peca) => ({
      value: peca.id,
      label: `${peca.codigo} · ${peca.nome} · estoque ${quantidades.formatar(saldos.emMilesimos(peca.saldo))} ${peca.unidade}`,
    })),
  ];
}
