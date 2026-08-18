import { AsyncLocalStorage } from 'node:async_hooks';
import { estimativaProducaoService } from '@/lib/services/estimativa-producao-service';

export class EstimativaRecalcCoordinator {
  private readonly storage = new AsyncLocalStorage<Set<string>>();

  constructor(private readonly recalc: (date: string) => Promise<unknown>) {}

  async runCoalesced<T>(fn: () => Promise<T>): Promise<T> {
    const dates = new Set<string>();
    const result = await this.storage.run(dates, fn);
    for (const date of dates) {
      await this.recalc(date);
    }
    return result;
  }

  async enqueue(...dates: string[]): Promise<void> {
    const unique = [...new Set(dates.filter(Boolean))];
    const batch = this.storage.getStore();
    if (batch) {
      for (const date of unique) batch.add(date);
      return;
    }
    for (const date of unique) {
      await this.recalc(date);
    }
  }
}

export const estimativaRecalcCoordinator = new EstimativaRecalcCoordinator((date) =>
  estimativaProducaoService.recalcForDate(date),
);

export function enqueueEstimativaRecalc(...dates: string[]): Promise<void> {
  return estimativaRecalcCoordinator.enqueue(...dates);
}

export function withCoalescedEstimativaRecalc<T>(fn: () => Promise<T>): Promise<T> {
  return estimativaRecalcCoordinator.runCoalesced(fn);
}
