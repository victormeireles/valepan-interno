'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { salvarRegra } from '@/app/actions/insumo-compra-regra-actions';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import type { InsumoCompraJanelaTipo } from '@/domain/insumos/insumo-compra-janela';
import type { InsumoCompraRegraConfig } from '@/lib/services/insumo-compra-regra-manager';

type DistribuidorForm = {
  nome: string;
  preferencial: boolean;
};

type Props = {
  open: boolean;
  regra: InsumoCompraRegraConfig | null;
  onClose: () => void;
  onSaved: () => void;
};

const DIAS_SEMANA = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
] as const;

function numeroOpcional(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

export default function InsumoRegraCompraFormModal({
  open,
  regra,
  onClose,
  onSaved,
}: Props) {
  const [leadTimeDias, setLeadTimeDias] = useState('7');
  const [janelaTipo, setJanelaTipo] = useState<InsumoCompraJanelaTipo>('qualquer');
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [quantidadeMinima, setQuantidadeMinima] = useState('');
  const [quantidadeMaxima, setQuantidadeMaxima] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [distribuidores, setDistribuidores] = useState<DistribuidorForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !regra) return;
    setLeadTimeDias(String(regra.regra?.lead_time_dias ?? 7));
    setJanelaTipo(regra.regra?.janela_tipo ?? 'qualquer');
    setDiasSemana(regra.regra?.dias_semana ?? []);
    setQuantidadeMinima(regra.regra?.quantidade_minima?.toString() ?? '');
    setQuantidadeMaxima(regra.regra?.quantidade_maxima?.toString() ?? '');
    setAtivo(regra.regra?.ativo ?? true);
    setDistribuidores(
      [...regra.distribuidores]
        .sort((a, b) => a.ordem - b.ordem)
        .map(({ nome, preferencial }) => ({ nome, preferencial })),
    );
    setError('');
  }, [open, regra]);

  if (!open || !regra) return null;

  const fechar = () => {
    if (!loading) onClose();
  };

  const alternarDia = (dia: number) => {
    setDiasSemana((atuais) =>
      atuais.includes(dia) ? atuais.filter((item) => item !== dia) : [...atuais, dia],
    );
  };

  const atualizarDistribuidor = (
    index: number,
    patch: Partial<DistribuidorForm>,
  ) => {
    setDistribuidores((atuais) =>
      atuais.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const marcarPreferencial = (index: number) => {
    setDistribuidores((atuais) =>
      atuais.map((item, itemIndex) => ({
        ...item,
        preferencial: itemIndex === index,
      })),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await salvarRegra({
        insumoId: regra.insumoId,
        leadTimeDias: Number(leadTimeDias),
        janelaTipo,
        diasSemana: janelaTipo === 'dias_semana' ? diasSemana : null,
        quantidadeMinima: numeroOpcional(quantidadeMinima),
        quantidadeMaxima: numeroOpcional(quantidadeMaxima),
        ativo,
        distribuidores,
      });
      onSaved();
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Erro ao salvar regra de compra.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/35 backdrop-blur-sm"
        aria-label="Fechar modal"
        onClick={fechar}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="regra-compra-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
              {regra.regra ? 'Editar regra de compra' : 'Nova regra de compra'}
            </p>
            <h2
              id="regra-compra-modal-title"
              className="truncate text-xl font-bold tracking-tight text-stone-900"
            >
              {regra.nome}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Configure prazo, janela e distribuidores.
            </p>
          </div>
          <IconButton
            icon="close"
            label="Fechar"
            size="lg"
            onClick={fechar}
            disabled={loading}
          />
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Lead time (dias)"
                type="number"
                min="0"
                step="1"
                required
                numeric
                value={leadTimeDias}
                onChange={(event) => setLeadTimeDias(event.target.value)}
              />
              <Select
                label="Janela de compra"
                value={janelaTipo}
                onChange={(event) =>
                  setJanelaTipo(event.target.value as InsumoCompraJanelaTipo)
                }
              >
                <option value="qualquer">Qualquer dia</option>
                <option value="dias_semana">Dias da semana</option>
              </Select>
            </div>

            {janelaTipo === 'dias_semana' ? (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-stone-700">
                  Dias permitidos
                </legend>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {DIAS_SEMANA.map((dia) => (
                    <label
                      key={dia.value}
                      className={[
                        'flex min-h-11 cursor-pointer items-center justify-center rounded-[9px] border text-sm font-medium',
                        diasSemana.includes(dia.value)
                          ? 'border-amber-500 bg-amber-100 text-amber-900'
                          : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={diasSemana.includes(dia.value)}
                        onChange={() => alternarDia(dia.value)}
                      />
                      {dia.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Quantidade mínima"
                hint={`Opcional, em ${regra.unidade || 'unidade do insumo'}.`}
                type="number"
                min="0"
                step="any"
                numeric
                value={quantidadeMinima}
                onChange={(event) => setQuantidadeMinima(event.target.value)}
              />
              <Input
                label="Quantidade máxima"
                hint={`Opcional, em ${regra.unidade || 'unidade do insumo'}.`}
                type="number"
                min="0"
                step="any"
                numeric
                value={quantidadeMaxima}
                onChange={(event) => setQuantidadeMaxima(event.target.value)}
              />
            </div>

            <Switch checked={ativo} onChange={setAtivo} label="Regra ativa" />

            <fieldset className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <legend className="text-sm font-semibold text-stone-900">
                  Distribuidores
                </legend>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  icon="add"
                  onClick={() =>
                    setDistribuidores((atuais) => [
                      ...atuais,
                      { nome: '', preferencial: atuais.length === 0 },
                    ])
                  }
                >
                  Adicionar
                </Button>
              </div>

              {distribuidores.length === 0 ? (
                <p className="rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
                  Nenhum distribuidor cadastrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {distribuidores.map((distribuidor, index) => (
                    <div
                      key={index}
                      className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                    >
                      <Input
                        label={`Distribuidor ${index + 1}`}
                        required
                        value={distribuidor.nome}
                        onChange={(event) =>
                          atualizarDistribuidor(index, { nome: event.target.value })
                        }
                        placeholder="Nome do distribuidor"
                      />
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 px-1 text-sm text-stone-700">
                        <input
                          type="radio"
                          name="distribuidor-preferencial"
                          checked={distribuidor.preferencial}
                          onChange={() => marcarPreferencial(index)}
                          className="h-4 w-4 accent-amber-600"
                        />
                        Preferencial
                      </label>
                      <IconButton
                        icon="delete"
                        label={`Remover ${distribuidor.nome || `distribuidor ${index + 1}`}`}
                        size="lg"
                        onClick={() =>
                          setDistribuidores((atuais) =>
                            atuais.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </fieldset>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-stone-100 bg-stone-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={fechar}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" size="lg" icon="save" disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar regra'}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}
