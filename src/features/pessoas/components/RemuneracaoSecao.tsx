'use client';

import { useEffect, useState } from 'react';
import {
  apagarRemuneracaoColaborador,
  gravarRemuneracaoColaborador,
  listarRemuneracaoColaborador,
} from '@/app/actions/pessoas-remuneracao-actions';
import { Button } from '@/components/ui/Button';
import { RemuneracaoCentavos } from '@/domain/pessoas/remuneracao-centavos';
import { RemuneracaoQuadro, type RemuneracaoVigencia } from '@/domain/pessoas/remuneracao-quadro';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import { RemuneracaoForma, type RemuneracaoFormaValores } from './RemuneracaoForma';
import { RemuneracaoHistorico } from './RemuneracaoHistorico';

const centavos = new RemuneracaoCentavos();
const quadro = new RemuneracaoQuadro();
const vazios: RemuneracaoFormaValores = { salario: '', valeTransporteValor: '', valeAlimentacao: '', planoSaude: false };

export function RemuneracaoSecao({
  codigo,
  onConcluir,
}: {
  codigo: string;
  onConcluir: (mensagem: string, ok: boolean) => void;
}) {
  const [vigencias, setVigencias] = useState<RemuneracaoVigencia[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [modo, setModo] = useState<'lista' | 'nova' | string>('lista');
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    listarRemuneracaoColaborador(codigo)
      .then((lista) => {
        if (vivo) setVigencias(lista);
      })
      .catch((falha: unknown) => {
        if (vivo) setErroCarga(falha instanceof Error ? falha.message : 'Não foi possível carregar a remuneração.');
      });
    return () => {
      vivo = false;
    };
  }, [codigo]);

  const hoje = getTodayISOInBrazilTimezone();
  const visao = quadro.montar(vigencias ?? [], hoje);
  const correcao = vigencias?.find((vigencia) => vigencia.inicio === modo) ?? null;

  async function salvar(campos: Record<string, string>) {
    setPendente(true);
    setErro(null);
    try {
      const resultado = await gravarRemuneracaoColaborador(codigo, campos);
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      const lista = await listarRemuneracaoColaborador(codigo);
      onConcluir(resultado.mensagem, true);
      setModo('lista');
      setVigencias(lista);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
    } finally {
      setPendente(false);
    }
  }

  async function apagar(inicio: string) {
    setPendente(true);
    try {
      const resultado = await apagarRemuneracaoColaborador(codigo, inicio);
      if (!resultado.ok) {
        onConcluir(resultado.mensagem, false);
        return;
      }
      const lista = await listarRemuneracaoColaborador(codigo);
      onConcluir(resultado.mensagem, true);
      setConfirmando(null);
      setVigencias(lista);
    } catch (falha: unknown) {
      const mensagem = falha instanceof Error ? falha.message : 'Não foi possível apagar.';
      onConcluir(mensagem, false);
    } finally {
      setPendente(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Remuneração</h3>
      {erroCarga ? <p className="text-sm text-red-700">{erroCarga}</p> : null}
      {!vigencias && !erroCarga ? <p className="text-sm text-stone-500">Carregando remuneração…</p> : null}
      {vigencias ? (
        <>
          <p className="font-mono text-sm tabular-nums text-stone-800">
            {visao.vigente
              ? `Salário ${centavos.formatar(visao.vigente.salarioCentavos)} · Valor do vale transporte ${centavos.formatar(visao.vigente.valeTransporteCentavos)} · Vale alimentação/refeição ${centavos.formatar(visao.vigente.valeAlimentacaoCentavos)} · Plano de saúde ${visao.vigente.planoSaude ? 'Sim' : 'Não'}`
              : 'Remuneração não informada.'}
          </p>
          {modo === 'lista' ? (
            <Button type="button" variant="secondary" onClick={() => { setErro(null); setModo('nova'); }}>Nova vigência</Button>
          ) : (
            <RemuneracaoForma
              key={modo}
              inicioFixo={correcao?.inicio ?? null}
              valores={correcao ? valoresDe(correcao) : vazios}
              pendente={pendente}
              erro={erro}
              onCancelar={() => { setErro(null); setModo('lista'); }}
              onSalvar={salvar}
            />
          )}
          <RemuneracaoHistorico
            linhas={visao.linhas}
            confirmando={confirmando}
            pendente={pendente}
            onCorrigir={(inicio) => { setErro(null); setModo(inicio); }}
            onPedirApagar={setConfirmando}
            onCancelarApagar={() => setConfirmando(null)}
            onApagar={apagar}
          />
        </>
      ) : null}
    </section>
  );
}

function valoresDe(vigencia: RemuneracaoVigencia): RemuneracaoFormaValores {
  return {
    salario: centavos.digitar(vigencia.salarioCentavos),
    valeTransporteValor: centavos.digitar(vigencia.valeTransporteCentavos),
    valeAlimentacao: centavos.digitar(vigencia.valeAlimentacaoCentavos),
    planoSaude: vigencia.planoSaude,
  };
}
