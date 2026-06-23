import { useCallback, useMemo, useState } from 'react';
import {
  requerConfirmacao,
  resolveEtapaContinuidade,
  type EtapaContinuidadeResult,
} from '@/domain/producao-etapa/etapa-continuidade-policy';

type EtapaSubmitIntent = 'salvar' | 'salvar-finalizar';

type UseEtapaLoteSubmitParams = {
  enabled: boolean;
  totalProjetado: number;
  metaReferencia: number;
  unidade: string;
  contexto?: 'etapa' | 'embalagem';
  onSubmit: (continuaProduzindo: boolean) => Promise<void>;
};

type ConfirmDialogState = {
  open: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
};

function resolveDialogContent(
  intent: EtapaSubmitIntent,
  unidade: string,
  continuidade: EtapaContinuidadeResult,
  contexto: 'etapa' | 'embalagem',
): Omit<ConfirmDialogState, 'open'> {
  const alvo = contexto === 'embalagem' ? 'produção' : 'etapa';

  if (intent === 'salvar-finalizar') {
    return {
      titulo: `Finalizar ${alvo} com perda?`,
      mensagem: `Ao finalizar abaixo da meta de referência, a ${alvo} será encerrada com perda registrada em ${unidade}.`,
      textoConfirmar: continuidade.textoConfirmacaoFinalizar,
    };
  }

  return {
    titulo: 'Continuar produzindo?',
    mensagem:
      'O total projetado já atingiu a referência. Confirme apenas se realmente houver mais produção para lançar.',
    textoConfirmar: continuidade.textoConfirmacaoContinuar,
  };
}

export function useEtapaLoteSubmit({
  enabled,
  totalProjetado,
  metaReferencia,
  unidade,
  contexto = 'etapa',
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
    if (!pendingIntent) {
      return {
        open: false,
        titulo: '',
        mensagem: '',
        textoConfirmar: '',
      };
    }

    const content = resolveDialogContent(pendingIntent, unidade, continuidade, contexto);
    return {
      open: true,
      ...content,
    };
  }, [pendingIntent, unidade, continuidade, contexto]);

  return {
    continuidade,
    confirmDialog,
    onSalvar,
    onSalvarEFinalizar,
    handleDialogBack,
    handleDialogConfirm,
  };
}
