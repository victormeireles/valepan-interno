'use client';

import { useEffect, useState } from 'react';
import {
  admitirColaborador,
  admitirNovo,
  desistirAdmissao,
  desligarColaborador,
  transferirColaborador,
  type TurnoOpcao,
} from '@/app/actions/pessoas-vinculo-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { CADASTRO_VAZIO } from '@/domain/pessoas/colaborador-cadastro';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { BuscaTurno } from './BuscaTurno';
import { CadastroFormulario } from './CadastroFormulario';
import { PainelAcao } from './PainelAcao';

export type AcaoPessoa =
  | 'admitir'
  | 'contratar'
  | 'transferir'
  | 'desligar'
  | 'desistir'
  | null;

type Props = {
  acao: AcaoPessoa;
  pessoa: ColaboradorListaItem | null;
  turnos: TurnoOpcao[];
  onFechar: () => void;
  onConcluir: (mensagem: string, ok: boolean) => void;
};

export function PessoasAcaoPainel({ acao, pessoa, turnos, onFechar, onConcluir }: Props) {
  const [pendente, setPendente] = useState(false);
  const [turnoCodigo, setTurnoCodigo] = useState('');
  const [lider, setLider] = useState(false);
  const exigeTurno = acao === 'admitir' || acao === 'transferir';

  useEffect(() => {
    setTurnoCodigo(acao === 'transferir' ? pessoa?.turnoCodigo ?? '' : '');
    setLider(acao === 'transferir' && pessoa?.liderSetor === true);
  }, [acao, pessoa]);

  async function enviar(form: FormData) {
    setPendente(true);
    const resultado = await executar(acao, pessoa, form);
    setPendente(false);
    onConcluir(resultado.mensagem, resultado.ok);
    if (resultado.ok) onFechar();
  }

  return (
    <PainelAcao aberto={acao !== null} titulo={titulo(acao, pessoa)} onFechar={onFechar} largo={acao === 'admitir'}>
      <form className="flex flex-col gap-5" action={enviar}>
        {acao === 'admitir' ? (
          <>
            <Input name="nome" label="Nome" required />
            <BuscaTurno name="turno" label="Setor e turno" turnos={turnos} onChange={setTurnoCodigo} />
            <Input name="data" label="Data de admissão" type="date" required />
            <CadastroFormulario cadastro={CADASTRO_VAZIO} />
          </>
        ) : null}
        {acao === 'contratar' ? <Input name="data" label="Data" type="date" required /> : null}
        {acao === 'desligar' ? (
          <>
            <Input name="data" label="Data de desligamento" type="date" required />
            <Select
              name="tipo"
              label="Aviso"
              options={[
                { value: 'com_trabalho', label: 'Com trabalho' },
                { value: 'sem_trabalho', label: 'Sem trabalho' },
              ]}
            />
            <p className="text-sm text-stone-700">
              Data depois de hoje registra o aviso e mantém a pessoa no quadro. Data de hoje ou anterior desliga e libera a vaga.
            </p>
          </>
        ) : null}
        {acao === 'transferir' ? (
          <BuscaTurno
            name="turno"
            label="Novo setor e turno"
            turnos={turnos}
            atual={atualDe(pessoa)}
            atualCodigo={pessoa?.turnoCodigo}
            valorInicial={pessoa?.turnoCodigo}
            onChange={setTurnoCodigo}
          />
        ) : null}
        {acao === 'transferir' ? (
          <>
            <input type="hidden" name="lider" value={lider ? '1' : '0'} />
            <Switch label="Líder do setor" checked={lider} onChange={setLider} />
          </>
        ) : null}
        {acao === 'desistir' ? (
          <p className="text-sm text-stone-700">Isso encerra a reserva e não registra demissão.</p>
        ) : null}
        <Button type="submit" size="lg" variant={acao === 'desligar' ? 'danger' : 'primary'} disabled={pendente || (exigeTurno && !turnoCodigo)}>
          {pendente ? 'Registrando…' : 'Confirmar'}
        </Button>
      </form>
    </PainelAcao>
  );
}

function atualDe(pessoa: ColaboradorListaItem | null): string {
  if (!pessoa?.setorNome && !pessoa?.turnoNome) return 'Sem setor e turno';
  return `${pessoa?.setorNome ?? 'Sem setor'} — ${pessoa?.turnoNome ?? 'Sem turno'}`;
}

function titulo(acao: AcaoPessoa, pessoa: ColaboradorListaItem | null): string {
  if (acao === 'admitir') return 'Admitir colaborador';
  if (acao === 'contratar') return `Contratar ${pessoa?.nome ?? ''}`;
  if (acao === 'transferir') return 'Alterar setor e turno';
  if (acao === 'desligar') return 'Desligar';
  if (acao === 'desistir') return 'Desistir da admissão';
  return '';
}

async function executar(acao: AcaoPessoa, pessoa: ColaboradorListaItem | null, form: FormData) {
  const data = String(form.get('data') ?? '');
  const turno = String(form.get('turno') ?? '');
  if (acao === 'admitir') {
    const campos = Object.fromEntries([...form.entries()].map(([chave, valor]) => [chave, String(valor)]));
    return admitirNovo(String(campos.nome ?? ''), turno, data, campos);
  }
  if (!pessoa) return { ok: false, mensagem: 'Selecione um colaborador.' };
  if (acao === 'contratar') return admitirColaborador(pessoa.codigo, data);
  if (acao === 'transferir') return transferirColaborador(pessoa.codigo, turno, form.get('lider') === '1');
  if (acao === 'desligar') return desligarColaborador(pessoa.codigo, data, String(form.get('tipo') ?? ''));
  return desistirAdmissao(pessoa.codigo);
}
