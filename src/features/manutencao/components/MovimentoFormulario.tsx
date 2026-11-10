'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export type PecaMovimentoOpcao = {
  id: string;
  codigo: string;
  nome: string;
};

export type PedidoEntrada = {
  pecaId: string;
  quantidade: string;
  preco: string;
};

export type PedidoSaida = {
  pecaId: string;
  quantidade: string;
  motivo: string;
};

type ResultadoMovimento = { ok: boolean; mensagem: string };

type MovimentoFormularioProps = {
  pecas: PecaMovimentoOpcao[];
  onEntrada: (pedido: PedidoEntrada) => Promise<ResultadoMovimento>;
  onSaida: (pedido: PedidoSaida) => Promise<ResultadoMovimento>;
};

const CARTAO = 'rounded-xl border border-stone-200 bg-white shadow-sm';
const ENTRADA_VAZIA: PedidoEntrada = { pecaId: '', quantidade: '', preco: '' };
const SAIDA_VAZIA: PedidoSaida = { pecaId: '', quantidade: '', motivo: '' };

export function MovimentoFormulario({ pecas, onEntrada, onSaida }: MovimentoFormularioProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FormularioEntrada pecas={pecas} onSubmit={onEntrada} />
      <FormularioSaida pecas={pecas} onSubmit={onSaida} />
    </div>
  );
}

function FormularioEntrada({
  pecas,
  onSubmit,
}: {
  pecas: PecaMovimentoOpcao[];
  onSubmit: (pedido: PedidoEntrada) => Promise<ResultadoMovimento>;
}) {
  const envio = useEnvio(ENTRADA_VAZIA, onSubmit);

  return (
    <CartaoFormulario titulo="Entrada" onSubmit={envio.submeter}>
      <AvisoSemAtiva quantidade={pecas.length} />
      <CampoPeca
        pecas={pecas}
        pecaId={envio.valor.pecaId}
        onChange={(pecaId) => envio.alterar({ pecaId })}
      />
      <Input
        label="Quantidade"
        numeric
        inputMode="decimal"
        autoComplete="off"
        value={envio.valor.quantidade}
        onChange={(evento) => envio.alterar({ quantidade: evento.target.value })}
      />
      <Input
        label="Preço"
        numeric
        inputMode="decimal"
        autoComplete="off"
        value={envio.valor.preco}
        onChange={(evento) => envio.alterar({ preco: evento.target.value })}
      />
      <BotaoMovimento salvando={envio.salvando} semPeca={pecas.length === 0}>
        Registrar entrada
      </BotaoMovimento>
    </CartaoFormulario>
  );
}

function FormularioSaida({
  pecas,
  onSubmit,
}: {
  pecas: PecaMovimentoOpcao[];
  onSubmit: (pedido: PedidoSaida) => Promise<ResultadoMovimento>;
}) {
  const envio = useEnvio(SAIDA_VAZIA, onSubmit);

  return (
    <CartaoFormulario titulo="Saída" onSubmit={envio.submeter}>
      <AvisoSemAtiva quantidade={pecas.length} />
      <CampoPeca
        pecas={pecas}
        pecaId={envio.valor.pecaId}
        onChange={(pecaId) => envio.alterar({ pecaId })}
      />
      <Input
        label="Quantidade"
        numeric
        inputMode="decimal"
        autoComplete="off"
        value={envio.valor.quantidade}
        onChange={(evento) => envio.alterar({ quantidade: evento.target.value })}
      />
      <Input
        label="Motivo"
        autoComplete="off"
        value={envio.valor.motivo}
        onChange={(evento) => envio.alterar({ motivo: evento.target.value })}
      />
      <BotaoMovimento salvando={envio.salvando} semPeca={pecas.length === 0}>
        Registrar saída
      </BotaoMovimento>
    </CartaoFormulario>
  );
}

function useEnvio<T>(vazio: T, enviar: (valor: T) => Promise<ResultadoMovimento>) {
  const [valor, setValor] = useState(vazio);
  const [salvando, setSalvando] = useState(false);

  function alterar(parcial: Partial<T>) {
    setValor((atual) => ({ ...atual, ...parcial }));
  }

  async function submeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    setSalvando(true);
    try {
      const resultado = await enviar(valor);
      if (resultado.ok) setValor(vazio);
    } finally {
      setSalvando(false);
    }
  }

  return { valor, salvando, alterar, submeter };
}

function CartaoFormulario({
  titulo,
  onSubmit,
  children,
}: {
  titulo: string;
  onSubmit: (evento: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className={`${CARTAO} space-y-4 p-4`}>
      <h2 className="text-base font-semibold text-stone-900">{titulo}</h2>
      {children}
    </form>
  );
}

function AvisoSemAtiva({ quantidade }: { quantidade: number }) {
  if (quantidade > 0) return null;
  return <p className="text-sm text-stone-600">Nenhuma peça ativa.</p>;
}

function CampoPeca({
  pecas,
  pecaId,
  onChange,
}: {
  pecas: PecaMovimentoOpcao[];
  pecaId: string;
  onChange: (pecaId: string) => void;
}) {
  return (
    <Select
      label="Peça"
      value={pecaId}
      disabled={pecas.length === 0}
      options={opcoesDePeca(pecas)}
      onChange={(evento) => onChange(evento.target.value)}
    />
  );
}

function BotaoMovimento({
  salvando,
  semPeca,
  children,
}: {
  salvando: boolean;
  semPeca: boolean;
  children: string;
}) {
  return (
    <Button type="submit" size="lg" disabled={salvando || semPeca}>
      {children}
    </Button>
  );
}

function opcoesDePeca(pecas: PecaMovimentoOpcao[]) {
  return [
    { value: '', label: 'Selecione a peça' },
    ...pecas.map((peca) => ({
      value: peca.id,
      label: `${peca.codigo} · ${peca.nome}`,
    })),
  ];
}
