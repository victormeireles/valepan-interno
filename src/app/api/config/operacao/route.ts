import { NextResponse } from 'next/server';
import { configOperacaoMapper } from '@/domain/config-operacao/config-operacao-mapper';
import { configOperacaoService } from '@/lib/services/config-operacao-service';
import { estimativaProducaoService } from '@/lib/services/estimativa-producao-service';
import {
  addCalendarDaysISO,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

export async function GET() {
  try {
    const snapshot = await configOperacaoService.getConfig();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const patch = configOperacaoMapper.parsePatch(body);
    if (!patch) {
      return NextResponse.json(
        { error: 'Body inválido: informe horários HH:mm e tempos inteiros em minutos' },
        { status: 400 },
      );
    }

    const snapshot = await configOperacaoService.updateConfig(patch);
    await estimativaProducaoService.recalcOpenDates(
      addCalendarDaysISO(getTodayISOInBrazilTimezone(), -1),
    );
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    const status = message.includes('deve') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
