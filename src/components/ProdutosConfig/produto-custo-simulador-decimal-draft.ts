const COMPLETE_DECIMAL = /^\d+([.,]\d+)?$/;

type DecimalDraftCommit = {
  shouldCommit: boolean;
  value: number | undefined;
};

export class ProdutoCustoSimuladorDecimalDraft {
  commit(raw: string): DecimalDraftCommit {
    const trimmed = raw.trim();
    if (!trimmed) return { shouldCommit: true, value: undefined };
    if (!COMPLETE_DECIMAL.test(trimmed)) {
      return { shouldCommit: false, value: undefined };
    }
    const parsed = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(parsed)) return { shouldCommit: false, value: undefined };
    return { shouldCommit: true, value: parsed };
  }

  formatCommitted(value: number | undefined): string {
    return value == null ? '' : String(value);
  }

  draftForParent(currentDraft: string, parentValue: number | undefined): string {
    const result = this.commit(currentDraft);
    if (!result.shouldCommit) return currentDraft;
    if (result.value === parentValue) return currentDraft;
    return this.formatCommitted(parentValue);
  }
}

export const produtoCustoSimuladorDecimalDraft = new ProdutoCustoSimuladorDecimalDraft();
