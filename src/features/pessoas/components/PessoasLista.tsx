'use client';

import { useMemo, useState } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ListRow } from '@/components/ui/ListRow';
import { Toolbar } from '@/components/ui/Toolbar';
import {
  ColaboradorListaFiltro,
  type ColaboradorListaItem,
} from '@/domain/pessoas/colaborador-lista-filtro';

const SITUACAO_ROTULO: Record<ColaboradorListaItem['situacao'], string> = {
  ativo: 'Ativo',
  admissao_prevista: 'Admissão prevista',
  desligado: 'Desligado',
};

const SITUACAO_TOM: Record<ColaboradorListaItem['situacao'], BadgeTone> = {
  ativo: 'success',
  admissao_prevista: 'warning',
  desligado: 'neutral',
};

const filtro = new ColaboradorListaFiltro();

type Props = {
  itens: ColaboradorListaItem[];
};

function situacaoRotulo(situacao: ColaboradorListaItem['situacao']): string {
  return SITUACAO_ROTULO[situacao];
}

function SituacaoBadge({ situacao }: { situacao: ColaboradorListaItem['situacao'] }) {
  return <Badge tone={SITUACAO_TOM[situacao]}>{situacaoRotulo(situacao)}</Badge>;
}

function ColaboradorListaRow({
  item,
  even,
}: {
  item: ColaboradorListaItem;
  even: boolean;
}) {
  return (
    <ListRow
      even={even}
      title={item.nome}
      subtitle={item.codigo}
      columns={[
        {
          value: <SituacaoBadge situacao={item.situacao} />,
          width: '9rem',
          align: 'left',
          tabular: false,
        },
        {
          value: item.setorNome ?? '—',
          width: '10rem',
          align: 'left',
          tabular: false,
        },
        {
          value: item.turnoNome ?? '—',
          width: '8rem',
          align: 'left',
          tabular: false,
        },
      ]}
    />
  );
}

function PessoasListaBusca({
  termo,
  onTermoChange,
}: {
  termo: string;
  onTermoChange: (valor: string) => void;
}) {
  return (
    <Input
      aria-label="Buscar colaborador"
      placeholder="Buscar por nome ou código"
      icon="search"
      value={termo}
      onChange={(event) => onTermoChange(event.target.value)}
      className="min-w-[16rem]"
    />
  );
}

function PessoasListaCorpo({
  itens,
  filtrados,
}: {
  itens: ColaboradorListaItem[];
  filtrados: ColaboradorListaItem[];
}) {
  if (itens.length === 0) {
    return <EmptyState icon="badge" title="Nenhum colaborador carregado." />;
  }

  return (
    <Card padding="none">
      {filtrados.map((item, index) => (
        <ColaboradorListaRow key={item.codigo} item={item} even={index % 2 === 1} />
      ))}
    </Card>
  );
}

export default function PessoasLista({ itens }: Props) {
  const [termo, setTermo] = useState('');
  const filtrados = useMemo(() => filtro.aplicar(itens, termo), [itens, termo]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Toolbar
        title="Pessoas"
        sticky={false}
        filters={
          itens.length > 0 ? (
            <PessoasListaBusca termo={termo} onTermoChange={setTermo} />
          ) : undefined
        }
        resumo={itens.length > 0 ? `${filtrados.length} de ${itens.length}` : undefined}
      />
      <div className="mt-4 px-4 sm:px-6">
        <PessoasListaCorpo itens={itens} filtrados={filtrados} />
      </div>
    </div>
  );
}
