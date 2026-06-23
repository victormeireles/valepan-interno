'use client';

import EtapaLoteModalFooter from '@/components/Realizado/etapa/EtapaLoteModalFooter';

type Props = {
  usualContinuaProduzindo: boolean;
  busy: boolean;
  onCancel: () => void;
  onSalvar: () => void;
  onSalvarEFinalizar: () => void;
};

export default function EmbalagemLoteModalFooter({
  usualContinuaProduzindo,
  busy,
  onCancel,
  onSalvar,
  onSalvarEFinalizar,
}: Props) {
  return (
    <EtapaLoteModalFooter
      usualContinuaProduzindo={usualContinuaProduzindo}
      busy={busy}
      onCancel={onCancel}
      onSalvar={onSalvar}
      onSalvarEFinalizar={onSalvarEFinalizar}
    />
  );
}
