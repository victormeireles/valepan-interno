import { NextResponse } from 'next/server';
import { zapiManager } from '@/lib/managers/zapi-manager';
import {
  whatsAppConfigService,
  type WhatsAppConfigPatch,
} from '@/lib/services/whatsapp-config-service';

function toApiBody(
  snapshot: Awaited<ReturnType<typeof whatsAppConfigService.getConfig>>,
  zapiConnected: boolean,
) {
  return {
    embalagem: snapshot.embalagem,
    fermentacao: snapshot.fermentacao,
    forno: snapshot.forno,
    saidas: snapshot.saidas,
    updatedAt: snapshot.updatedAt,
    zapiConnected,
  };
}

function parsePatch(body: unknown): WhatsAppConfigPatch | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const patch: WhatsAppConfigPatch = {};
  const keys = ['embalagem', 'fermentacao', 'forno', 'saidas'] as const;
  for (const key of keys) {
    if (record[key] === undefined) continue;
    if (typeof record[key] !== 'boolean') return null;
    patch[key] = record[key];
  }
  if (Object.keys(patch).length === 0) return null;
  return patch;
}

export async function GET() {
  try {
    const [snapshot, zapiConnected] = await Promise.all([
      whatsAppConfigService.getConfig(),
      zapiManager.isInstanceConnected(),
    ]);
    return NextResponse.json(toApiBody(snapshot, zapiConnected));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const patch = parsePatch(body);
    if (!patch) {
      return NextResponse.json(
        { error: 'Body inválido: use booleans embalagem, fermentacao, forno, saidas' },
        { status: 400 },
      );
    }

    const snapshot = await whatsAppConfigService.updateConfig(patch);
    const zapiConnected = await zapiManager.isInstanceConnected();
    return NextResponse.json(toApiBody(snapshot, zapiConnected));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
