'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  criarPessoaExtra,
  criarServicoExtra,
  estornarServico,
  pagarServico,
  realizarServico,
  type ExtraListaItem,
  type ServicoListaItem,
} from '@/app/actions/pessoas-extras-actions';
import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ListColumnHeader } from '@/components/ui/ListColumnHeader';
import { ListRow } from '@/components/ui/ListRow';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { Toolbar } from '@/components/ui/Toolbar';
import { BuscaPessoa } from './BuscaPessoa';
import { ColunaRotulo } from './ColunaRotulo';
import { PainelAcao } from './PainelAcao';

type Setor = { id: string; nome: string };

export function ExtrasLista({ pessoas, servicos, setores }: { pessoas: ExtraListaItem[]; servicos: ServicoListaItem[]; setores: Setor[] }) {
  const router = useRouter();
  const [pessoaAberta, setPessoaAberta] = useState(false);
  const [servicoAberto, setServicoAberto] = useState(false);
  const [estornoId, setEstornoId] = useState<string | null>(null);
  const [pessoaId, setPessoaId] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const [pendente, setPendente] = useState(false);

  async function concluir(texto: string, ok: boolean) {
    setAviso({ texto, ok });
    setPendente(false);
    if (ok) router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <Toolbar
        title="Extras"
        resumo={`${pessoas.length.toLocaleString('pt-BR')} pessoas · ${servicos.length.toLocaleString('pt-BR')} serviços`}
        actions={
          <div className="flex gap-2">
            <Button size="lg" variant="secondary" onClick={() => setPessoaAberta(true)}>Nova pessoa</Button>
            <Button size="lg" onClick={() => setServicoAberto(true)}>Novo serviço</Button>
          </div>
        }
      />
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Pessoas</h2>
        {pessoas.length === 0 ? <EmptyState icon="person_add" title="Nenhuma pessoa extra cadastrada." /> : (
          <Card padding="none">
            {pessoas.map((pessoa, index) => (
              <ListRow key={pessoa.id} even={index % 2 === 1} title={pessoa.nome} subtitle={pessoa.disponivel ? 'Disponível' : 'Indisponível'} />
            ))}
          </Card>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Serviços</h2>
        {servicos.length === 0 ? <EmptyState icon="schedule" title="Nenhum serviço registrado." /> : (
          <Card padding="none">
            <div className="hidden md:block">
              <ListColumnHeader leading="Pessoa" columns={[{ label: 'Setor', width: '8rem', align: 'left' }, { label: 'Estado', width: '7rem', align: 'left' }, { label: 'Total', width: '9rem', align: 'right' }]} />
            </div>
            {servicos.map((item, index) => (
              <ListRow
                key={item.id}
                even={index % 2 === 1}
                title={item.nome}
                subtitle={periodo(item.inicio, item.fim)}
                columns={[
                  { value: <ColunaRotulo label="Setor">{item.setor}</ColunaRotulo>, width: '8rem', align: 'left', tabular: false },
                  { value: <ColunaRotulo label="Estado">{item.estado}{item.pago ? ' · pago' : ''}</ColunaRotulo>, width: '7rem', align: 'left', tabular: false },
                  { value: <ColunaRotulo label="Total">{item.total === null ? 'Total pendente' : (item.total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</ColunaRotulo>, width: '9rem', align: 'right', tabular: true },
                ]}
                menu={
                  <OverflowMenu ariaLabel={`Ações de ${item.nome}`}>
                    <OverflowMenuItem icon="task_alt" label="Realizar" onClick={() => void realizarServico(item.id).then((r) => concluir(r.mensagem, r.ok))} />
                    <OverflowMenuItem icon="payments" label="Pagar" onClick={() => void pagarServico(item.id).then((r) => concluir(r.mensagem, r.ok))} />
                    <OverflowMenuItem icon="undo" label="Estornar" tone="danger" onClick={() => setEstornoId(item.id)} />
                  </OverflowMenu>
                }
              />
            ))}
          </Card>
        )}
      </section>
      <PainelAcao aberto={pessoaAberta} titulo="Nova pessoa extra" onFechar={() => setPessoaAberta(false)}>
        <form className="flex flex-col gap-3" action={async (form) => {
          setPendente(true);
          const resultado = await criarPessoaExtra(String(form.get('nome') ?? ''), String(form.get('telefone') ?? ''));
          await concluir(resultado.mensagem, resultado.ok);
          if (resultado.ok) setPessoaAberta(false);
        }}>
          <Input name="nome" label="Nome" required />
          <Input name="telefone" label="Telefone" type="tel" />
          <Button type="submit" size="lg" disabled={pendente}>Cadastrar</Button>
        </form>
      </PainelAcao>
      <PainelAcao aberto={servicoAberto} titulo="Novo serviço" onFechar={() => setServicoAberto(false)}>
        <form className="flex flex-col gap-3" action={async (form) => {
          const passagem = String(form.get('passagem') ?? '');
          setPendente(true);
          const resultado = await criarServicoExtra({
            pessoaId,
            setorId: String(form.get('setor') ?? ''),
            inicio: String(form.get('inicio') ?? ''),
            fim: String(form.get('fim') ?? ''),
            valorExtra: Math.round(Number(form.get('valor') ?? 0) * 100),
            precisaPassagem: passagem !== '0',
            valorPassagem: passagem === '' ? null : Math.round(Number(passagem) * 100),
          });
          await concluir(resultado.mensagem, resultado.ok);
          if (resultado.ok) setServicoAberto(false);
        }}>
          <BuscaPessoa label="Pessoa" opcoes={pessoas.map((pessoa) => ({ id: pessoa.id, nome: pessoa.nome }))} value={pessoaId} onChange={setPessoaId} />
          <Select name="setor" label="Setor" required options={setores.map((setor) => ({ value: setor.id, label: setor.nome }))} />
          <Input name="inicio" label="Início" type="datetime-local" required />
          <Input name="fim" label="Término" type="datetime-local" required />
          <Input name="valor" label="Valor do extra" type="number" numeric required />
          <Input name="passagem" label="Passagem" hint="Vazio deixa o total pendente. Zero significa sem passagem." type="number" numeric />
          <Button type="submit" size="lg" disabled={pendente || !pessoaId}>Registrar serviço</Button>
        </form>
      </PainelAcao>
      <PainelAcao aberto={estornoId !== null} titulo="Estornar pagamento" onFechar={() => setEstornoId(null)}>
        <form className="flex flex-col gap-3" action={async (form) => {
          if (!estornoId) return;
          setPendente(true);
          const resultado = await estornarServico(estornoId, String(form.get('motivo') ?? ''));
          await concluir(resultado.mensagem, resultado.ok);
          if (resultado.ok) setEstornoId(null);
        }}>
          <Input name="motivo" label="Motivo" required />
          <Button type="submit" size="lg" variant="danger" disabled={pendente}>Estornar</Button>
        </form>
      </PainelAcao>
      {aviso ? <div className="fixed bottom-4 right-4 z-50 max-w-sm"><Toast tone={aviso.ok ? 'success' : 'error'} onClose={() => setAviso(null)}>{aviso.texto}</Toast></div> : null}
    </div>
  );
}

function periodo(inicio: string, fim: string): string {
  const formato = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return `${formato.format(new Date(inicio))} – ${formato.format(new Date(fim))}`;
}
