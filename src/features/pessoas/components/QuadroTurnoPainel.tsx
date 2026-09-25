'use client';

import { useState } from 'react';
import { removerTurno, salvarTurnoHorario } from '@/app/actions/pessoas-turno-horario-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { HorarioSemana } from '@/domain/pessoas/horario-semana';
import type { HorarioDiaQuadro, QuadroTurno } from '@/domain/pessoas/quadro-agrupamento';
import { TurnoCodigo } from '@/domain/pessoas/turno-codigo';
import { PainelAcao } from './PainelAcao';
import { QuadroHorarioDia } from './QuadroHorarioDia';

export type EdicaoTurno =
  | { tipo: 'editar'; setorNome: string; setorCodigo: string; turno: QuadroTurno; codigos: string[]; vinculados: number }
  | { tipo: 'novo'; setorNome: string; setorCodigo: string; codigos: string[] };

type Props = {
  edicao: EdicaoTurno | null;
  onFechar: () => void;
  onConcluir: (mensagem: string, ok: boolean) => void;
};

export function QuadroTurnoPainel({ edicao, onFechar, onConcluir }: Props) {
  if (!edicao) return null;
  return <Formulario key={chave(edicao)} edicao={edicao} onFechar={onFechar} onConcluir={onConcluir} />;
}

function Formulario({ edicao, onFechar, onConcluir }: { edicao: EdicaoTurno; onFechar: () => void; onConcluir: Props['onConcluir'] }) {
  const novo = edicao.tipo === 'novo';
  const ocupadas = novo ? 0 : edicao.vinculados;
  const [nome, setNome] = useState(novo ? '' : edicao.turno.turnoNome);
  const [vagas, setVagas] = useState(novo ? 1 : edicao.turno.aprovado);
  const [dias, setDias] = useState<HorarioDiaQuadro[]>(novo ? new HorarioSemana().padrao() : completar(edicao.turno.horario));
  const [pendente, setPendente] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  async function salvar() {
    setPendente(true);
    const codigo = novo ? new TurnoCodigo().gerar(edicao.setorCodigo, nome, edicao.codigos) : edicao.turno.turnoCodigo;
    const resultado = await salvarTurnoHorario({ codigo, setorCodigo: edicao.setorCodigo, nome, vagas, dias });
    setPendente(false);
    onConcluir(resultado.ok && novo ? 'Turno criado.' : resultado.mensagem, resultado.ok);
    if (resultado.ok) onFechar();
  }

  async function remover() {
    if (edicao.tipo !== 'editar') return;
    setPendente(true);
    const resultado = await removerTurno(edicao.turno.turnoCodigo);
    setPendente(false);
    onConcluir(resultado.ok ? 'Turno removido.' : resultado.mensagem, resultado.ok);
    if (resultado.ok) onFechar();
  }

  return (
    <PainelAcao amplo aberto titulo={novo ? `Novo turno · ${edicao.setorNome}` : `${edicao.turno.turnoNome} · ${edicao.setorNome}`} onFechar={onFechar}>
      <div className="flex flex-col gap-5">
        <CamposTurno nome={nome} vagas={vagas} ocupadas={ocupadas} onNome={setNome} onVagas={setVagas} />
        <BarraSemana onRepetir={() => setDias(repetirSegunda(dias))} />
        <GradeDias dias={dias} onChange={setDias} />
        <AcoesTurno editar={!novo} pendente={pendente} ocupadas={ocupadas} confirmar={confirmar} onSalvar={salvar} onRemover={() => (confirmar ? remover() : setConfirmar(true))} />
      </div>
    </PainelAcao>
  );
}

function CamposTurno({ nome, vagas, ocupadas, onNome, onVagas }: {
  nome: string;
  vagas: number;
  ocupadas: number;
  onNome: (valor: string) => void;
  onVagas: (valor: number) => void;
}) {
  return (
    <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
      <Input label="Nome" value={nome} required onChange={(event) => onNome(event.target.value)} />
      <Input
        label="Vagas aprovadas"
        type="number"
        numeric
        min={ocupadas}
        max={40}
        value={vagas}
        hint={ocupadas > 0 ? `${ocupadas.toLocaleString('pt-BR')} já ocupadas. Só as livres podem sair.` : 'Quantidade de vagas neste turno.'}
        onChange={(event) => onVagas(Number(event.target.value))}
      />
    </div>
  );
}

function BarraSemana({ onRepetir }: { onRepetir: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-stone-600">Segunda a sábado. Se o fim for antes do início, o turno segue no dia seguinte.</p>
      <Button type="button" variant="secondary" size="lg" onClick={onRepetir}>Repetir segunda até sexta</Button>
    </div>
  );
}

function GradeDias({ dias, onChange }: { dias: HorarioDiaQuadro[]; onChange: (dias: HorarioDiaQuadro[]) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {dias.map((dia) => (
        <QuadroHorarioDia
          key={dia.dia}
          dia={dia}
          onChange={(proximo) => onChange(dias.map((item) => (item.dia === proximo.dia ? proximo : item)))}
        />
      ))}
    </div>
  );
}

function AcoesTurno({ editar, pendente, ocupadas, confirmar, onSalvar, onRemover }: {
  editar: boolean;
  pendente: boolean;
  ocupadas: number;
  confirmar: boolean;
  onSalvar: () => void;
  onRemover: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
      {editar ? (
        <Button type="button" variant="danger" size="lg" disabled={pendente || ocupadas > 0} onClick={onRemover}>
          {rotuloRemover(ocupadas, confirmar)}
        </Button>
      ) : <span />}
      <Button type="button" variant="primary" size="lg" disabled={pendente} onClick={onSalvar}>
        {pendente ? 'Salvando…' : 'Salvar turno'}
      </Button>
    </div>
  );
}

function rotuloRemover(ocupadas: number, confirmar: boolean): string {
  if (ocupadas > 0) return 'Transfira as pessoas antes de remover';
  return confirmar ? 'Confirmar remoção' : 'Remover turno';
}

function chave(edicao: EdicaoTurno): string {
  return edicao.tipo === 'novo' ? `novo-${edicao.setorCodigo}` : edicao.turno.turnoCodigo;
}

function completar(dias: HorarioDiaQuadro[]): HorarioDiaQuadro[] {
  const porDia = new Map(dias.map((dia) => [dia.dia, dia]));
  return new HorarioSemana().padrao().map((dia) => porDia.get(dia.dia) ?? { ...dia, situacao: 'a_confirmar', inicio: null, fim: null });
}

function repetirSegunda(dias: HorarioDiaQuadro[]): HorarioDiaQuadro[] {
  const segunda = dias.find((dia) => dia.dia === 1);
  if (!segunda) return dias;
  return dias.map((dia) => (dia.dia >= 2 && dia.dia <= 5 ? { ...segunda, dia: dia.dia } : dia));
}
