# Indicadores — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Mostrar horas paradas, horas de execução e R$ de peças por máquina no período, mais a linha Ajustes das saídas manuais.

**Architecture:** Agregação em `IndicadoresManutencao` (domínio). A consulta lê ordens finalizadas e movimentos `saida_manual` no período. Sem tabela nova.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Supabase.

**Spec:** Telas Indicadores, fatia 5. Depende de TempoOrdem e CustoMedio já existentes.

## Global Constraints

- pt-BR. Período padrão = mês civil atual em `America/Sao_Paulo`.
- Por máquina, só OS finalizadas cujo `fim_em` cai no período: parada, execução, R$ peças.
- Parada em andamento (aberta/recebida + `maquina_parou`) aparece à parte, da abertura até agora; não entra no total do período até fechar.
- Saídas manuais no período → uma linha `Ajustes` (soma qty × preço do movimento). Entradas não entram.
- Manutenção ler. Solicitação não vê.
- Arquivo < 400. Não aplique migration. Não `git add -A`. Commit PowerShell.

---

### Task 1: Agregação

**Files:**
- Create: `src/domain/manutencao/indicadores-manutencao.ts` + `.test.ts`

```ts
export type OrdemIndicador = {
  maquinaId: string;
  maquinaNome: string;
  status: string;
  urgencia: string | null;
  abertaEm: string;
  inicioEm: string | null;
  fimEm: string | null;
  custoPecasCentavos: number;
};
export type SaidaManual = { createdAt: string; quantidade: number; precoUnitarioCentavos: number };
export class IndicadoresManutencao {
  agregar(args: {
    inicioPeriodo: string; // YYYY-MM-DD SP
    fimPeriodo: string;    // inclusive
    agoraIso: string;
    ordens: OrdemIndicador[];
    saidas: SaidaManual[];
  }): {
    porMaquina: { maquinaId: string; nome: string; paradaMinutos: number; execucaoMinutos: number; custoPecasCentavos: number }[];
    emAndamento: { maquinaId: string; nome: string; paradaMinutos: number }[];
    ajustesCentavos: number;
  };
}
```

- [ ] **Step 1: Testes**

Finalizada `maquina_parou` com fim no período: parada = aberta→fim, execução = início→fim, custo soma.  
Finalizada `oferecendo_risco`: parada 0.  
Fim fora do período: não entra.  
Aberta `maquina_parou`: só em `emAndamento` até agora.  
Saída manual no período: ajustes = soma arredondada qty×preço (qty em unidades decimais × centavos → usar milésimos).  
Entrada ignorada (não passa saidas de entrada).

- [ ] **Step 2: Implementar, commit**

```powershell
git add src/domain/manutencao/indicadores-manutencao.ts src/domain/manutencao/indicadores-manutencao.test.ts
git commit -m "feat(manutencao): agrega horas e real dos indicadores"
```

---

### Task 2: Consulta e tela

**Files:**
- Create: `src/app/actions/manutencao-indicadores-consulta.ts`
- Modify: route rules, hub, main-nav + tests
- Create: `src/app/manutencao/indicadores/page.tsx`
- Create: `src/features/manutencao/components/IndicadoresPainel.tsx`

- [ ] **Step 1**

`carregarIndicadores(inicio?, fim?)`: manutenção ler. Default mês atual SP. Lê finalizadas com fim no intervalo; abertas/recebidas com urgência maquina_parou; saidas_manual com created_at no intervalo. Agrega. Formata horas e minutos para a UI.

Rota `/manutencao/indicadores` ler. Hub/barra: Indicadores, ícone `analytics`, descrição `Horas e real no período`.

Tela: seletor de período (mês ou de–até), tabela por máquina (parada, execução, R$), bloco Em andamento, linha Ajustes. tabular-nums. ≥44px.

- [ ] **Step 2: Suíte e commit**

```powershell
git add src/app/actions/manutencao-indicadores-consulta.ts src/lib/auth/manutencao-route-rules.ts src/lib/auth/interno-route-access-map.test.ts src/components/Hub/hub-nav-config.ts src/components/Hub/filter-hub-nav-items.test.ts src/config/main-nav-config.ts src/config/main-nav-config.test.ts src/app/manutencao/indicadores/page.tsx src/features/manutencao/components/IndicadoresPainel.tsx
git commit -m "feat(manutencao): mostra os indicadores de manutencao"
```

---

## Self-review

- Fatia 5 completa. Sem tabela nova. Parada em andamento separada do total.
