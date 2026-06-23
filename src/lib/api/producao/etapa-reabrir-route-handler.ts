import { NextResponse } from 'next/server';

import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';
import { etapaReabrirService } from '@/lib/services/etapa-reabrir-service';

function etapaSucessoLabel(etapa: EtapaProducaoSlug): string {
  switch (etapa) {
    case 'fermentacao':
      return 'Fermentação reaberta com sucesso';
    case 'forno':
      return 'Forno reaberto com sucesso';
    case 'embalagem':
      return 'Embalagem reaberta com sucesso';
  }
}

export async function handleEtapaReabrirPost(
  ordemId: string,
  etapa: EtapaProducaoSlug,
): Promise<NextResponse> {
  try {
    await etapaReabrirService.reabrir(ordemId, etapa);
    return NextResponse.json({ message: etapaSucessoLabel(etapa) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    const status = message.includes('não encontrada')
      ? 404
      : message.includes('já está aberta')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
