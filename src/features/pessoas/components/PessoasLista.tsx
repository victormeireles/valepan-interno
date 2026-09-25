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
            <Input
              aria-label="Buscar colaborador"
              placeholder="Buscar por nome ou código"
              icon="search"
              value={termo}
              onChange={(event) => setTermo(event.target.value)}
              className="min-w-[16rem]"
            />
          ) : undefined
        }
        resumo={itens.length > 0 ? `${filtrados.length} de ${itens.length}` : undefined}
      />

      <div className="mt-4 px-4 sm:px-6">
        {itens.length === 0 ? (
          <EmptyState icon="badge" title="Nenhum colaborador carregado." />
        ) : (
          <Card padding="none">
            {filtrados.map((item, index) => (
              <ListRow
                key={item.codigo}
                even={index % 2 === 1}
                title={item.nome}
                subtitle={item.codigo}
                columns={[
                  {
                    value: (
                      <Badge tone={SITUACAO_TOM[item.situacao]}>
                        {SITUACAO_ROTULO[item.situacao]}
                      </Badge>
                    ),
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
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
