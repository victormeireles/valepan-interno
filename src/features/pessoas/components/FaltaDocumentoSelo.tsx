import { Badge, type BadgeTone } from '@/components/ui/Badge';
import type { SituacaoDocumento } from '@/domain/pessoas/falta-documento-fila';

const ROTULO: Record<SituacaoDocumento, string> = {
  atrasado: 'Atrasado',
  enviar_hoje: 'Enviar hoje',
  ainda_ausente: 'Quando voltar',
};

const TOM: Record<SituacaoDocumento, BadgeTone> = {
  atrasado: 'danger',
  enviar_hoje: 'warning',
  ainda_ausente: 'accent',
};

export function FaltaDocumentoSelo({ situacao }: { situacao: SituacaoDocumento }) {
  return <Badge tone={TOM[situacao]}>{ROTULO[situacao]}</Badge>;
}
