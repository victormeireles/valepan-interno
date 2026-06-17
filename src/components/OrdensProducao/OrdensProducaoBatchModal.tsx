'use client';

import MetaEmbalagemBatchModal from '@/components/MetaEmbalagem/MetaEmbalagemBatchModal';

type OrdensProducaoBatchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function OrdensProducaoBatchModal({
  isOpen,
  onClose,
  onSuccess,
}: OrdensProducaoBatchModalProps) {
  return (
    <MetaEmbalagemBatchModal isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} />
  );
}
