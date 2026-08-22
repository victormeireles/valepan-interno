import { useCallback, useMemo, useState } from 'react';
import { EtapaContinuidadeCopy } from '@/domain/producao-etapa/etapa-continuidade-copy';
import {
  requerConfirmacao,
  resolveEtapaContinuidade,
  type EtapaContinuidadeResult,
} from '@/domain/producao-etapa/etapa-continuidade-policy';
import type { EtapaContinuidadeQuantidadeResumoProps } from './EtapaContinuidadeQuantidadeResumo';

type EtapaSubmitIntent = 'salvar' | 'salvar-finalizar';

type UseEtapaLoteSubmitParams = {
  enabled: boolean;
  totalProjetado: number;
  metaReferencia: number;
  unidade: string;
  onSubmit: (continuaProduzindo: boolean) => Promise<void>;
};

type ConfirmDialogState = {
  open: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  resumo: EtapaContinuidadeQuantidadeResumoProps | null;
};

function emptyDialog(): ConfirmDialogState {
  return {
    open: false,
    titulo: '',
    mensagem: '',
    textoConfirmar: '',
    resumo: null,
  };
}

function resolveDialogContent(
  intent: EtapaSubmitIntent,
  unidade: string,
  continuidade: EtapaContinuidadeResult,
  totalProjetado: number,
  metaReferencia: number,
): Omit<ConfirmDialogState, 'open'> {
  if (intent === 'salvar-finalizar') {
    return {
      titulo: EtapaContinuidadeCopy.tituloFinalizarAbaixo(),
      mensagem: EtapaContinuidadeCopy.mensagemFinalizarAbaixo(),
      textoConfirmar: continuidade.textoConfirmacaoFinalizar,
      resumo: {
        lancado: totalProjetado,
        ordem: metaReferencia,
        naoProduzido: continuidade.quantidadeNaoProduzida,
        unidade,
      },
    };
  }

  return {
    titulo: EtapaContinuidadeCopy.tituloContinuar(),
    mensagem: EtapaContinuidadeCopy.mensagemContinuar(),
    textoConfirmar: continuidade.textoConfirmacaoContinuar,
    resumo: null,
  };
}

export function useEtapaLoteSubmit({
  enabled,
  totalProjetado,
  metaReferencia,
  unidade,
  onSubmit,
}: UseEtapaLoteSubmitParams) {
  const [pendingIntent, setPendingIntent] = useState<EtapaSubmitIntent | null>(null);

  const continuidade = useMemo(
    () =>
      resolveEtapaContinuidade({
        totalProjetado,
        metaReferencia,
        unidade,
      }),
    [totalProjetado, metaReferencia, unidade],
  );

  const submitIntent = useCallback(
    async (intent: EtapaSubmitIntent) => {
      const continuaProduzindo = intent === 'salvar';
      if (
        enabled &&
        requerConfirmacao(continuaProduzindo, continuidade)
      ) {
        setPendingIntent(intent);
        return;
      }

      await onSubmit(continuaProduzindo);
    },
    [enabled, continuidade, onSubmit],
  );

  const onSalvar = useCallback(async () => {
    await submitIntent('salvar');
  }, [submitIntent]);

  const onSalvarEFinalizar = useCallback(async () => {
    await submitIntent('salvar-finalizar');
  }, [submitIntent]);

  const handleDialogConfirm = useCallback(async () => {
    if (!pendingIntent) return;
    const continuaProduzindo = pendingIntent === 'salvar';
    setPendingIntent(null);
    await onSubmit(continuaProduzindo);
  }, [pendingIntent, onSubmit]);

  const handleDialogBack = useCallback(() => {
    setPendingIntent(null);
  }, []);

  const confirmDialog = useMemo<ConfirmDialogState>(() => {
    if (!pendingIntent) return emptyDialog();

    return {
      open: true,
      ...resolveDialogContent(
        pendingIntent,
        unidade,
        continuidade,
        totalProjetado,
        metaReferencia,
      ),
    };
  }, [pendingIntent, unidade, continuidade, totalProjetado, metaReferencia]);

  return {
    continuidade,
    confirmDialog,
    onSalvar,
    onSalvarEFinalizar,
    handleDialogBack,
    handleDialogConfirm,
  };
}
