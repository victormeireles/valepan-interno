'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { abrirCorretiva } from '@/app/actions/manutencao-ordem-actions';
import type { MaquinaAberturaItem } from '@/app/actions/manutencao-maquinas-abertura';
import type { AberturaEntrada } from '@/domain/manutencao/ordem-abertura';
import { Button } from '@/components/ui/Button';
import { Select, type SelectOption } from '@/components/ui/Select';

const URGENCIAS = [
  { value: 'maquina_parou', label: 'Máquina parou' },
  { value: 'trabalhando_com_problema', label: 'Trabalhando com problema' },
  { value: 'oferecendo_risco', label: 'Oferecendo risco' },
] as const;

const PROBLEMAS = [
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'mecanico', label: 'Mecânico' },
  { value: 'ajuste_parametro', label: 'Ajuste de parâmetro' },
] as const;

type Urgencia = (typeof URGENCIAS)[number]['value'];
type TipoProblema = (typeof PROBLEMAS)[number]['value'];

type RascunhoAbertura = {
  maquinaId: string;
  urgencia: string;
  tipoProblema: string;
  descricao: string;
};

type NovaOrdemFormularioProps = {
  maquinas: MaquinaAberturaItem[];
};

const RASCUNHO_VAZIO: RascunhoAbertura = {
  maquinaId: '',
  urgencia: '',
  tipoProblema: '',
  descricao: '',
};

const CARTAO = 'max-w-xl space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm';

export function NovaOrdemFormulario({ maquinas }: NovaOrdemFormularioProps) {
  const router = useRouter();
  const [rascunho, setRascunho] = useState(RASCUNHO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const entrada = montarEntrada(rascunho);
    if (!entrada.ok) {
      setErro(entrada.mensagem);
      return;
    }
    await gravar(entrada.valor, setErro, setEnviando, (numero) => {
      router.push(`/manutencao/ordens/${numero}`);
    });
  }

  return (
    <form onSubmit={enviar} className={CARTAO}>
      <h1 className="text-xl font-bold tracking-tight text-stone-900">Nova ordem</h1>
      <CamposAbertura
        maquinas={maquinas}
        rascunho={rascunho}
        onAlterar={(alteracao) => setRascunho((atual) => ({ ...atual, ...alteracao }))}
      />
      {erro ? (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={enviando}>
        Abrir ordem
      </Button>
    </form>
  );
}

async function gravar(
  entrada: AberturaEntrada,
  definirErro: (mensagem: string | null) => void,
  definirEnviando: (enviando: boolean) => void,
  aoAbrir: (numero: number) => void,
) {
  definirEnviando(true);
  definirErro(null);
  try {
    const resultado = await abrirCorretiva(entrada);
    if (!resultado.ok) {
      definirErro(resultado.mensagem);
      return;
    }
    aoAbrir(resultado.numero);
  } finally {
    definirEnviando(false);
  }
}

function CamposAbertura({
  maquinas,
  rascunho,
  onAlterar,
}: {
  maquinas: MaquinaAberturaItem[];
  rascunho: RascunhoAbertura;
  onAlterar: (alteracao: Partial<RascunhoAbertura>) => void;
}) {
  return (
    <>
      <Select
        label="Máquina"
        required
        value={rascunho.maquinaId}
        options={opcoesMaquina(maquinas)}
        hint={maquinas.length === 0 ? 'Nenhuma máquina ativa no seu escopo.' : undefined}
        onChange={(evento) => onAlterar({ maquinaId: evento.target.value })}
      />
      <Select
        label="Urgência"
        required
        value={rascunho.urgencia}
        options={comPlaceholder('Selecione a urgência', URGENCIAS)}
        onChange={(evento) => onAlterar({ urgencia: evento.target.value })}
      />
      <Select
        label="Tipo de problema"
        required
        value={rascunho.tipoProblema}
        options={comPlaceholder('Selecione o tipo de problema', PROBLEMAS)}
        onChange={(evento) => onAlterar({ tipoProblema: evento.target.value })}
      />
      <CampoDescricao
        descricao={rascunho.descricao}
        onAlterar={(descricao) => onAlterar({ descricao })}
      />
    </>
  );
}

function CampoDescricao({
  descricao,
  onAlterar,
}: {
  descricao: string;
  onAlterar: (descricao: string) => void;
}) {
  const campoId = useId();

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label
        htmlFor={campoId}
        className="text-sm font-medium tracking-[-0.004em] text-stone-700"
      >
        Descrição
        <span className="text-danger"> *</span>
      </label>
      <textarea
        id={campoId}
        value={descricao}
        onChange={(evento) => onAlterar(evento.target.value)}
        className="min-h-28 w-full rounded-[9px] border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/35"
      />
    </div>
  );
}

function opcoesMaquina(maquinas: MaquinaAberturaItem[]): SelectOption[] {
  return [
    { value: '', label: 'Selecione a máquina' },
    ...maquinas.map((maquina) => ({
      value: maquina.id,
      label: `${maquina.codigo} · ${maquina.nome}`,
    })),
  ];
}

function comPlaceholder(
  placeholder: string,
  opcoes: readonly { value: string; label: string }[],
): SelectOption[] {
  return [{ value: '', label: placeholder }, ...opcoes];
}

function montarEntrada(
  rascunho: RascunhoAbertura,
): { ok: true; valor: AberturaEntrada } | { ok: false; mensagem: string } {
  const urgencia = valorDe<Urgencia>(URGENCIAS, rascunho.urgencia);
  const tipoProblema = valorDe<TipoProblema>(PROBLEMAS, rascunho.tipoProblema);
  if (!rascunho.maquinaId) return { ok: false, mensagem: 'Máquina não encontrada.' };
  if (!urgencia) return { ok: false, mensagem: 'Informe a urgência.' };
  if (!tipoProblema) return { ok: false, mensagem: 'Informe o tipo de problema.' };
  if (!rascunho.descricao.trim()) return { ok: false, mensagem: 'Informe a descrição.' };
  return {
    ok: true,
    valor: {
      maquinaId: rascunho.maquinaId,
      urgencia,
      tipoProblema,
      descricao: rascunho.descricao,
    },
  };
}

function valorDe<T extends string>(
  opcoes: readonly { value: T }[],
  valor: string,
): T | null {
  return opcoes.find((opcao) => opcao.value === valor)?.value ?? null;
}
