'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

export type RemuneracaoFormaValores = {
  salario: string;
  valeTransporteValor: string;
  valeAlimentacao: string;
  planoSaude: boolean;
};

export function RemuneracaoForma({
  inicioFixo,
  valores,
  pendente,
  erro,
  semNascimento,
  onCancelar,
  onSalvar,
}: {
  inicioFixo: string | null;
  valores: RemuneracaoFormaValores;
  pendente: boolean;
  erro: string | null;
  semNascimento: boolean;
  onCancelar: () => void;
  onSalvar: (campos: Record<string, string>) => void;
}) {
  const [plano, setPlano] = useState(valores.planoSaude);

  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const campos = Object.fromEntries([...form.entries()].map(([chave, valor]) => [chave, String(valor)]));
    onSalvar({ ...campos, planoSaude: plano ? '1' : '0' });
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={salvar}>
      {inicioFixo ? <input type="hidden" name="inicio" value={inicioFixo} /> : null}
      <Input name={inicioFixo ? undefined : 'inicio'} label="Data de início" type="date" defaultValue={inicioFixo ?? ''} disabled={inicioFixo !== null} required />
      <Input name="salario" label="Salário" defaultValue={valores.salario} inputMode="decimal" required />
      <Input name="valeTransporteValor" label="Valor do vale transporte" defaultValue={valores.valeTransporteValor} inputMode="decimal" required />
      <Input name="valeAlimentacao" label="Vale alimentação/refeição" defaultValue={valores.valeAlimentacao} inputMode="decimal" required />
      <Switch label="Plano de saúde" checked={plano} onChange={setPlano} />
      {semNascimento ? (
        <p className="text-sm leading-relaxed text-stone-600">
          Para marcar o plano de saúde, informe a data de nascimento no cadastro, em Identificação.
        </p>
      ) : null}
      {erro ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="lg" fullWidth disabled={pendente}>{pendente ? 'Salvando…' : 'Gravar'}</Button>
        <Button type="button" size="lg" fullWidth variant="secondary" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  );
}
