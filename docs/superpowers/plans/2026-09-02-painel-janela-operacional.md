# Painéis: OP vs janela operacional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quadros de TV de fermentação/forno/embalagem separam progresso da OP (vida inteira) da produção dos turnos na janela T1→T1+24h, com gráfico 22h–22h derivado da config.

**Architecture:** `JanelaOperacionalResolver` define o recorte a partir do T1 (intervalo de 24h que contém o meio-dia da data). A carga do fluxo passa a buscar lotes nessa janela (união das três etapas); a matriz inclui qualquer OP e `matrizAnt` hachura as outras nas três etapas. A TV ganha card próprio (ORDEM + TURNOS); o header usa feito completo da OP. Painel Produção e Realizado continuam no dia civil.

**Tech Stack:** TypeScript, Vitest, Next.js 15 App Router, React 19, Tailwind v4, design system Valepan (pt-BR, stone/amber, Geist Mono em quantidade).

**Spec:** `docs/superpowers/specs/2026-09-02-painel-janela-operacional-design.mdx`

## Global Constraints

- Arquivos ≤ 500 linhas; quebrar ao se aproximar de 400. Funções < 40 linhas. Uma classe por arquivo.
- Relógio: `America/Sao_Paulo`. Reusar `brazilClockUtcMs`, `addCalendarDaysISO`, `getBrazilHourFromIso`.
- Copy: nunca “dia” sozinho. Nomes: **OP 02/09**, **Turnos 22h–22h**, **nesta janela**, **depois desta janela**, **outra OP**, **previsto nesta janela**. Horários vêm da config, sem `22` chumbado.
- Turno no card = carimbo do lote, não `isClockInJanela`.
- Não alterar toolbar/dashboard do Realizado nem `painel-producao-service` (continuam `brazilCivilDayRangeIso`).
- Não redesenhar `FluxoEtapaCard`. Número grande do fluxo = OP da data na janela (`etapaTotal − matrizAnt`), como a embalagem já faz.
- Testes: Vitest (`npx vitest run <arquivo>`). UI: funções puras + componentes finos.
- Commits: incluir no passo; se a sessão não pediu commit, pular o `git commit`.

---

## Mapa de arquivos

| Arquivo | Papel |
|---------|--------|
| `src/domain/producao-turno/janela-operacional.ts` | `JanelaOperacionalResolver` |
| `src/domain/painel-etapa-tv/painel-etapa-tv-op-progresso.ts` | feito / nesta / depois / falta |
| `src/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo.ts` | T1/T2/T3 + outra OP na janela |
| `src/domain/painel-etapa-tv/painel-etapa-tv-janela-label.ts` | Subtítulo `OP 2 set · turnos 22h de 1 set → 22h de 2 set` |
| `src/domain/fluxo-processo/fluxo-matriz-horaria.ts` | `matrizAnt` nas 3 etapas |
| `src/domain/fluxo-processo/fluxo-processo-builder.ts` | Ferm/forno entram na matriz com `opAnterior` |
| `src/domain/fluxo-processo/fluxo-processo-types.ts` | `turno`, `janelasPorEtapa`, `turnosResumo`, `ultimoPorEtapa` |
| `src/lib/services/ritmo-lotes-dia-loader.ts` | `loadRange` (civil intacto) |
| `src/lib/services/fluxo-processo-service.ts` | União das janelas; copia `turno`/`loteId` |
| `src/domain/fluxo-processo/controle/fluxo-previsto-hora.ts` | Bucket civil alinhado ao T1 |
| `src/components/FluxoProcesso/fluxo-hora-eixo.ts` | `[22,23,0,…,21]` |
| `src/components/FluxoProcesso/FluxoBarrasHora.tsx` | Eixo + “nesta janela” + agora ∈ janela |
| `src/components/FluxoProcesso/fluxo-display-scale.ts` | `opAnteriorTotal(etapa)` |
| `src/components/PainelEtapaTv/PainelEtapaTvResumoCard.tsx` | Duas zonas |
| `src/components/PainelEtapaTv/PainelEtapaTvHeader.tsx` | OP completa + subtítulo |
| `src/components/PainelEtapaTv/PainelEtapaTvGrid.tsx` | Troca `FluxoEtapaCard` pelo resumo |
| `src/domain/painel-etapa-tv/painel-etapa-tv-ultimo-lote-picker.ts` | Filtra pela janela |

---

### Task 1: JanelaOperacionalResolver

**Files:**
- Create: `src/domain/producao-turno/janela-operacional.ts`
- Create: `src/domain/producao-turno/janela-operacional.test.ts`

**Interfaces:**
- Produces:
```typescript
export type JanelaOperacional = {
  iniMs: number;
  fimMs: number;
  t1Inicio: string;
  startDateISO: string;
};

export class JanelaOperacionalResolver {
  forDate(dateISO: string, t1Inicio: string): JanelaOperacional;
  contains(nowMs: number, janela: JanelaOperacional): boolean;
  t1Hour(t1Inicio: string): number;
  hoursAxis(t1Inicio: string): number[];
  union(janelas: JanelaOperacional[]): { iniMs: number; fimMs: number };
  toIsoRange(janela: { iniMs: number; fimMs: number }): { startIso: string; endIso: string };
  civilHourDateISO(janela: JanelaOperacional, hour: number): string;
}
```

- [ ] **Step 1: Escrever os testes**

```typescript
import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { JanelaOperacionalResolver } from './janela-operacional';

const resolver = new JanelaOperacionalResolver();

describe('JanelaOperacionalResolver.forDate', () => {
  it('T1 22:00 na data 02/09 → [01/09 22:00, 02/09 22:00)', () => {
    const j = resolver.forDate('2026-09-02', '22:00');
    expect(j.startDateISO).toBe('2026-09-01');
    expect(j.iniMs).toBe(brazilClockUtcMs('2026-09-01', '22:00'));
    expect(j.fimMs).toBe(brazilClockUtcMs('2026-09-02', '22:00'));
    expect(j.t1Inicio).toBe('22:00');
  });

  it('T1 07:00 na data 02/09 → [02/09 07:00, 03/09 07:00)', () => {
    const j = resolver.forDate('2026-09-02', '07:00');
    expect(j.startDateISO).toBe('2026-09-02');
    expect(j.iniMs).toBe(brazilClockUtcMs('2026-09-02', '07:00'));
    expect(j.fimMs).toBe(brazilClockUtcMs('2026-09-03', '07:00'));
  });

  it('T1 00:00 na data 02/09 → dia civil', () => {
    const j = resolver.forDate('2026-09-02', '00:00');
    expect(j.iniMs).toBe(brazilClockUtcMs('2026-09-02', '00:00'));
    expect(j.fimMs).toBe(brazilClockUtcMs('2026-09-03', '00:00'));
  });
});

describe('JanelaOperacionalResolver.contains', () => {
  it('fronteira fim é exclusiva', () => {
    const j = resolver.forDate('2026-09-02', '22:00');
    expect(resolver.contains(j.fimMs, j)).toBe(false);
    expect(resolver.contains(j.fimMs - 1, j)).toBe(true);
    expect(resolver.contains(j.iniMs, j)).toBe(true);
  });
});

describe('JanelaOperacionalResolver.hoursAxis', () => {
  it('T1 22h → 22…21', () => {
    expect(resolver.hoursAxis('22:00')).toEqual([
      22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
  });
});

describe('JanelaOperacionalResolver.civilHourDateISO', () => {
  it('hora 22 da janela 22h pertence a 01/09; hora 10 a 02/09', () => {
    const j = resolver.forDate('2026-09-02', '22:00');
    expect(resolver.civilHourDateISO(j, 22)).toBe('2026-09-01');
    expect(resolver.civilHourDateISO(j, 10)).toBe('2026-09-02');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/producao-turno/janela-operacional.test.ts`
Expected: FAIL (módulo não existe)

- [ ] **Step 3: Implementar**

Regra `forDate`: `noonMs = brazilClockUtcMs(dateISO, '12:00')`. Candidato no próprio `dateISO`; se `noonMs < startMs`, usar o T1 do dia anterior. `fimMs = iniMs + 24h`. `t1Hour`: `parseInt(t1Inicio.slice(0, 2), 10)`. `hoursAxis`: 24 valores `(t1Hour + i) % 24`. `civilHourDateISO`: se `hour >= t1Hour` então `startDateISO`, senão `addCalendarDaysISO(startDateISO, 1)`. `toIsoRange`: `new Date(ms).toISOString()`. `union`: min ini / max fim.

- [ ] **Step 4: Testes passam**

Run: `npx vitest run src/domain/producao-turno/janela-operacional.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/producao-turno/janela-operacional.ts src/domain/producao-turno/janela-operacional.test.ts
git commit -m "feat: janela operacional T1 alinhada ao meio-dia da OP"
```

---

### Task 2: Progresso da OP (pergunta 1)

**Files:**
- Create: `src/domain/painel-etapa-tv/painel-etapa-tv-op-progresso.ts`
- Create: `src/domain/painel-etapa-tv/painel-etapa-tv-op-progresso.test.ts`

**Interfaces:**
- Consumes: `JanelaOperacional` (Task 1)
- Produces:
```typescript
export type PainelEtapaTvLoteVolume = { produzidoEm: string; volume: number };

export type PainelEtapaTvOpProgressoDto = {
  feito: number;
  meta: number;
  nestaJanela: number;
  depoisJanela: number;
  antesJanela: number;
  falta: number;
};

export class PainelEtapaTvOpProgresso {
  static fromLotes(
    lotes: PainelEtapaTvLoteVolume[],
    meta: number,
    janela: JanelaOperacional,
  ): PainelEtapaTvOpProgressoDto;
}
```

- [ ] **Step 1: Teste**

```typescript
import { describe, expect, it } from 'vitest';
import { JanelaOperacionalResolver } from '@/domain/producao-turno/janela-operacional';
import { PainelEtapaTvOpProgresso } from './painel-etapa-tv-op-progresso';

const janela = new JanelaOperacionalResolver().forDate('2026-09-02', '22:00');

it('lote da véspera 22h entra em feito e nesta janela', () => {
  const dto = PainelEtapaTvOpProgresso.fromLotes(
    [{ produzidoEm: '2026-09-01T22:30:00-03:00', volume: 10 }],
    100,
    janela,
  );
  expect(dto).toMatchObject({
    feito: 10, nestaJanela: 10, depoisJanela: 0, antesJanela: 0, falta: 90, meta: 100,
  });
});

it('lote depois do fim só em depoisJanela', () => {
  const dto = PainelEtapaTvOpProgresso.fromLotes(
    [{ produzidoEm: '2026-09-02T22:30:00-03:00', volume: 8 }],
    100,
    janela,
  );
  expect(dto.depoisJanela).toBe(8);
  expect(dto.nestaJanela).toBe(0);
  expect(dto.feito).toBe(8);
});

it('antes + nesta + depois = feito', () => {
  const dto = PainelEtapaTvOpProgresso.fromLotes(
    [
      { produzidoEm: '2026-09-01T21:00:00-03:00', volume: 1 },
      { produzidoEm: '2026-09-02T10:00:00-03:00', volume: 4 },
      { produzidoEm: '2026-09-02T23:00:00-03:00', volume: 2 },
    ],
    10,
    janela,
  );
  expect(dto.antesJanela + dto.nestaJanela + dto.depoisJanela).toBe(dto.feito);
  expect(dto.feito).toBe(7);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/painel-etapa-tv/painel-etapa-tv-op-progresso.test.ts`

- [ ] **Step 3: Implementar**

`feito = Σ volume`. Classificar `Date.parse(produzidoEm)` vs `iniMs`/`fimMs`. `falta = max(0, meta − feito)`.

- [ ] **Step 4: PASS**
- [ ] **Step 5: Commit** `feat: progresso da OP sem recorte de hora`

---

### Task 3: Resumo de turnos (pergunta 2)

**Files:**
- Create: `src/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo.ts`
- Create: `src/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo.test.ts`

**Interfaces:**
- Consumes: `ProducaoTurnoCadastrado`, `ProducaoTurnoNumero`
- Produces:
```typescript
export type PainelEtapaTvTurnoEvento = {
  volume: number;
  turno: ProducaoTurnoNumero | null | undefined;
  dataOp: string;
};

export type PainelEtapaTvTurnoFatia = {
  numero: ProducaoTurnoNumero;
  inicio: string;
  fim: string;
  volume: number;
};

export type PainelEtapaTvTurnosResumoDto = {
  total: number;
  fatias: PainelEtapaTvTurnoFatia[];
  semTurno: number;
  outraOp: number;
  outraOpData: string | null;
};

export class PainelEtapaTvTurnosResumo {
  static fromEventos(
    eventos: PainelEtapaTvTurnoEvento[],
    dateISO: string,
    turnos: ProducaoTurnoCadastrado[],
  ): PainelEtapaTvTurnosResumoDto;
}
```

- [ ] **Step 1: Teste**

```typescript
it('soma pelo carimbo, não pelo relógio, no overlap T2/T3', () => {
  const dto = PainelEtapaTvTurnosResumo.fromEventos(
    [
      { volume: 10, turno: 2, dataOp: '2026-09-02' },
      { volume: 7, turno: 3, dataOp: '2026-09-02' },
    ],
    '2026-09-02',
    [
      { numero: 1, inicio: '22:00', fim: '07:00' },
      { numero: 2, inicio: '07:00', fim: '16:00' },
      { numero: 3, inicio: '13:00', fim: '22:00' },
    ],
  );
  expect(dto.fatias.find((f) => f.numero === 2)?.volume).toBe(10);
  expect(dto.fatias.find((f) => f.numero === 3)?.volume).toBe(7);
  expect(dto.total).toBe(17);
});

it('outra OP com uma data vira outraOpData', () => {
  const dto = PainelEtapaTvTurnosResumo.fromEventos(
    [
      { volume: 5, turno: 1, dataOp: '2026-09-02' },
      { volume: 3, turno: 1, dataOp: '2026-09-01' },
    ],
    '2026-09-02',
    [{ numero: 1, inicio: '22:00', fim: '07:00' }],
  );
  expect(dto.outraOp).toBe(3);
  expect(dto.outraOpData).toBe('2026-09-01');
});

it('duas datas outras → outraOpData null', () => {
  const dto = PainelEtapaTvTurnosResumo.fromEventos(
    [
      { volume: 1, turno: 1, dataOp: '2026-09-01' },
      { volume: 1, turno: 1, dataOp: '2026-08-31' },
    ],
    '2026-09-02',
    [{ numero: 1, inicio: '22:00', fim: '07:00' }],
  );
  expect(dto.outraOp).toBe(2);
  expect(dto.outraOpData).toBeNull();
});
```

- [ ] **Step 2: FAIL** — `npx vitest run src/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo.test.ts`
- [ ] **Step 3:** Fatias só dos turnos cadastrados (omitir T2 se não veio na config). `semTurno` se `turno` não é 1|2|3. `outraOp` se `dataOp !== dateISO` (string vazia conta como outra). `total = Σ volume`.
- [ ] **Step 4: PASS**
- [ ] **Step 5: Commit** `feat: resumo de turnos da janela pelo carimbo`

---

### Task 4: matrizAnt em fermentação e forno

**Files:**
- Modify: `src/domain/fluxo-processo/fluxo-matriz-horaria.ts`
- Create: `src/domain/fluxo-processo/fluxo-matriz-horaria.test.ts`
- Modify: `src/domain/fluxo-processo/fluxo-processo-builder.ts` (`byEtapa` ferm/forno sem filtrar `opAnterior`; `assertMatrizFechaComEtapas`)
- Modify: `src/domain/fluxo-processo/fluxo-processo-builder.test.ts`

**Interfaces:**
- Produces: `FluxoMatrizHorariaBuilder.build` grava `matrizAnt[key]` para `ferm` \| `forno` \| `emb` quando `entry.opAnterior`.
- `assertMatrizFechaComEtapas`: `sum(matriz[e]) === e.un` (inalterado). `sum(matrizAnt.emb) === opAnterior.un` permanece.

- [ ] **Step 1: Teste do builder de matriz**

```typescript
it('hachura OP anterior em ferm e forno', () => {
  const { matriz, matrizAnt } = new FluxoMatrizHorariaBuilder().build(['60g'], {
    ferm: [{ assadeiraNome: '60g', unidades: 40, hour: 22, opAnterior: true }],
    forno: [{ assadeiraNome: '60g', unidades: 10, hour: 23, opAnterior: true }],
    emb: [],
  });
  expect(matriz.ferm['60g'][22]).toBe(40);
  expect(matrizAnt.ferm['60g'][22]).toBe(40);
  expect(matriz.forno['60g'][23]).toBe(10);
  expect(matrizAnt.forno['60g'][23]).toBe(10);
});
```

Alinhar ferm/forno ao que a embalagem **já faz** (teste `matriz soma fecha…`: `emb.un === 1440` inclui as 10 CX da OP 11/08; `opAnterior.un === 480`; o card subtrai na UI):

- `matriz` = janela inteira (qualquer OP)
- `matrizAnt[etapa]` = parcela outra OP
- `etapas[].un` = soma da matriz (inclui outra OP) — invariante `sum(matriz[e]) === e.un` **não muda**
- `volOperacional` = só OP da data (`!opAnterior`) — o teste `não contam lote de OP de outro dia no volume da OP` continua: ferm `volOperacional === 1`, forno `0`
- Acrescentar nesse teste: `sumMatrizEtapa(matriz, 'ferm')` inclui o extra; `sumMatrizHoras(matrizAnt.ferm)` igual a esse extra

Card do fluxo subtrai `matrizAnt` em ferm/forno na Task 8 (`opAnteriorTotal(etapa)`). Nesta task, só matriz + builder.

- [ ] **Step 2: FAIL**
- [ ] **Step 3:** Em `fluxo-matriz-horaria.ts` trocar `if (key === 'emb' && entry.opAnterior)` por `if (entry.opAnterior) { matrizAnt[key][ass][hour] += entry.unidades; }`. No builder, `byEtapa.ferm` e `forno` passam a mapear **todos** os eventos (como `emb`), com `opAnterior`. `un` continua `sumMatrizEtapa`. `volOperacional` e paradas/qualidade usam `raw.filter((e) => !e.opAnterior)` nas três etapas.
- [ ] **Step 4: PASS** `npx vitest run src/domain/fluxo-processo/fluxo-matriz-horaria.test.ts src/domain/fluxo-processo/fluxo-processo-builder.test.ts`
- [ ] **Step 5: Commit** `feat: hachura OP anterior no gráfico de ferm e forno`

---

### Task 5: Carga do fluxo na janela operacional

**Files:**
- Modify: `src/lib/services/ritmo-lotes-dia-loader.ts` (adicionar `loadRange`; **não** mudar `load(dateISO)` civil)
- Modify: `src/lib/services/fluxo-processo-service.ts`
- Modify: `src/domain/fluxo-processo/fluxo-processo-types.ts` (`turno?`, `loteId?` em `FluxoApontamentoEvento`; `janelasPorEtapa` em `VpFluxoPayload`)

**Interfaces:**
- Consumes: `JanelaOperacionalResolver`
- Produces: `ritmoLotesDiaLoader.loadRange(startIso: string, endIso: string): Promise<FluxoRitmoLotesDia>`
- `VpFluxoPayload.janelasPorEtapa: Record<FluxoEtapaKey, JanelaOperacional>`

- [ ] **Step 1:** Se não houver teste do loader, criar `src/lib/services/ritmo-lotes-dia-loader.test.ts` mockando os três repositórios: `load('2026-09-02')` ainda chama range `2026-09-02T00:00:00-03:00` → `2026-09-03T00:00:00-03:00`; `loadRange` usa os ISO passados.

- [ ] **Step 2: FAIL**
- [ ] **Step 3:** `loadRange` igual a `load` mas com o par ISO. No `FluxoProcessoService.getCargaCompleta`, depois de `getConfig()`:

```typescript
const resolver = new JanelaOperacionalResolver();
const janelasPorEtapa = {
  ferm: resolver.forDate(date, config.horarioInicioProducao),
  forno: resolver.forDate(date, config.horarioInicioForno),
  emb: resolver.forDate(date, config.horarioInicioEmbalagem),
};
const uniao = resolver.union([janelasPorEtapa.ferm, janelasPorEtapa.forno, janelasPorEtapa.emb]);
const { startIso, endIso } = resolver.toIsoRange(uniao);
```

Trocar `ritmoLotesDiaLoader.load(date)` por `loadRange(startIso, endIso)`. Comparação ontem/semana: janela de `dateAnterior` / `dateSemana` com os **mesmos** T1 (união), não civil. Copiar `turno: l.turno`, `loteId: l.id` (campo real do record — conferir `FermentacaoLoteRecord`; se for `loteId`, usar esse) para os eventos. `fluxo.janelasPorEtapa = janelasPorEtapa` no payload após `builder.build`.

- [ ] **Step 4:** `npx vitest run src/lib/services/ritmo-lotes-dia-loader.test.ts src/domain/fluxo-processo/fluxo-processo-builder.test.ts`
- [ ] **Step 5: Commit** `feat: fluxo carrega lotes na janela T1 em vez do dia civil`

---

### Task 6: Previsto horário na mesma janela

**Files:**
- Modify: `src/domain/fluxo-processo/controle/fluxo-previsto-hora.ts`
- Modify: `src/domain/fluxo-processo/controle/fluxo-previsto-hora.test.ts`
- Modify: `src/domain/fluxo-processo/controle/fluxo-controle-builder.ts` (passar T1 por etapa)
- Modify: `src/lib/services/fluxo-processo-controle-attach.ts` se o builder precisar dos T1

**Interfaces:**
- `FluxoPrevistoHora.rateioOpHora(op, etapa, dateISO, hour, t1Inicio = '00:00')`
- `buildMatriz(ops, ordemAss, dateISO, t1PorEtapa?: Record<FluxoEtapaKey, string>)`

Default `'00:00'` preserva os testes atuais (bucket = hora civil de `dateISO`).

- [ ] **Step 1: Acrescentar teste**

```typescript
it('T1 22h: previsto 22:00–23:00 de 01/09 cai na hora 22, não na 22 de 02/09', () => {
  const row = {
    ...op(),
    fermentacaoInicioPrevisto: new Date(brazilClockUtcMs('2026-09-01', '22:00')).toISOString(),
    fermentacaoFimPrevisto: new Date(brazilClockUtcMs('2026-09-01', '23:00')).toISOString(),
  };
  expect(hora.rateioOpHora(row, 'ferm', '2026-09-02', 22, '22:00')).toBe(200);
  expect(hora.rateioOpHora(row, 'ferm', '2026-09-02', 10, '22:00')).toBe(0);
});
```

`op()` do arquivo usa 200 un em 2h — aqui janela prevista 1h → 200 na hora 22. Ajustar unidades do fixture para o overlap real (1h = 200 se ini/fim 22–23).

- [ ] **Step 2: FAIL** (hora 22 ainda é 02/09 22:00)
- [ ] **Step 3:** `horaLimites(dateISO, hour, t1Inicio)`: `janela = resolver.forDate(dateISO, t1Inicio)`; `bucketDate = resolver.civilHourDateISO(janela, hour)`; ini/fim como hoje mas em `bucketDate`. `buildMatriz` usa `t1PorEtapa?.[etapa] ?? '00:00'`. Controle attach: `t1PorEtapa` a partir de `fluxo.janelasPorEtapa` (`t1Inicio`).
- [ ] **Step 4: PASS** `npx vitest run src/domain/fluxo-processo/controle/fluxo-previsto-hora.test.ts`
- [ ] **Step 5: Commit** `feat: previsto por hora segue a janela do T1`

---

### Task 7: Anexar turnosResumo e ultimoPorEtapa no fluxo

**Files:**
- Modify: `src/domain/fluxo-processo/fluxo-processo-types.ts`
- Create: `src/lib/services/fluxo-processo-tv-attach.ts` (classe pequena: a partir dos eventos resolvidos + config)
- Modify: `src/lib/services/fluxo-processo-service.ts` (chamar attach)
- Test: `src/lib/services/fluxo-processo-tv-attach.test.ts`

**Interfaces:**
- `VpFluxoPayload.turnosResumo: Record<FluxoEtapaKey, PainelEtapaTvTurnosResumoDto>`
- `VpFluxoPayload.ultimoPorEtapa: Record<FluxoEtapaKey, PainelEtapaTvLoteFonte | null>`
- Eventos precisam `loteId` (= `record.id`), `turno`, `dataOp`, `produzidoEm`, volume (LT/CX).

O builder não devolve os `ResolvedEvent`. Attach no service com os arrays já mapeados (`fermentacao` / `forno` / `embalagem`): `PainelEtapaTvTurnosResumo.fromEventos` com `volume: latas` (ferm/forno) ou `caixas` (emb), `turno`, `dataOp`. `ultimoPorEtapa`: max `produzidoEm`, empate `id` descendente. `PainelEtapaTvLoteFonte.loteId` = `FermentacaoLoteRecord.id` / `FornoLoteRecord.id` / `EmbalagemLoteRecord.id`. Quantidade = `assadeiras` (ferm/forno) ou `quantidade.caixas` (emb).

- [ ] **Step 1: Teste do attach** com 2 eventos forno (OP D e OP D-1), turnos cadastrados, espera `outraOp` e `ultimoPorEtapa.forno.loteId`.
- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implementar attach + ligar no service após `builder.build`.** Default vazio se arrays vazios (não quebrar testes de builder que não passam pelo service).
- [ ] **Step 4: PASS**
- [ ] **Step 5: Commit** `feat: fluxo anexa turnos e último lote da janela`

---

### Task 8: Eixo do gráfico, copy e “agora”

**Files:**
- Create: `src/components/FluxoProcesso/fluxo-hora-eixo.ts` (wrapper fino se quiser reusar o resolver; pode importar `JanelaOperacionalResolver.hoursAxis` direto — se não criar arquivo extra)
- Modify: `src/components/FluxoProcesso/FluxoBarrasHora.tsx`
- Modify: `src/components/FluxoProcesso/FluxoProducaoPorHora.tsx`
- Modify: `src/components/PainelEtapaTv/PainelEtapaTvGrafico.tsx`
- Modify: `src/components/FluxoProcesso/fluxo-display-scale.ts` + `.test.ts` (`opAnteriorTotal(etapa: FluxoEtapaKey)`)
- Modify: `src/components/FluxoProcesso/FluxoEtapaCardComControle.tsx` e `FluxoEtapaCardSemControle.tsx`: hachura/legenda de outra OP em qualquer etapa (`opAnteriorTotal(e.key)`), copy **OP {data}** se `outraOpData` não existir usar `diaAnteriorLabelFromDia` só como fallback

**Interfaces:**
- `FluxoBarrasHora` recebe `t1Inicio: string` e `janela: JanelaOperacional` (ou lê `fluxo.janelasPorEtapa[etapa]`).
- `HORAS = resolver.hoursAxis(t1Inicio)` no lugar de `0..23`.
- `mostrarAgora = resolver.contains(Date.now(), janela)` (não comparar calendário da data com hoje).
- `horaAgora` continua a hora civil BR (índice da matriz); o eixo reordenado já coloca a coluna certa.
- Caption: `{n} {unit} nesta janela · empilhado por assadeira`; se `opAnteriorTotal(etapa) > 0`: ` · {n} de outra OP` (se uma data conhecida, `OP 01/09` — formatar `dataOp` `YYYY-MM-DD` → `OP DD/MM`).
- Título do card: **Por hora nesta janela**.
- Legenda: **hachurado = outra OP** (ou `OP DD/MM`).
- Fantasma: o `aria`/legenda **previsto** vira **previsto nesta janela**.

`opAnteriorTotal(etapa)`: modo `un` = soma `matrizAnt[etapa]`; modo `lt` = `fromUn` por assadeira; modo `cx` só faz sentido em `emb` (manter `opAnterior.volOperacional` quando `etapa === 'emb'`, senão 0).

Deprecar overload sem etapa: `opAnteriorTotal()` sem args chama `opAnteriorTotal('emb')` para não quebrar testes antigos, ou atualizar todas as chamadas.

Card do fluxo (`FluxoEtapaCardComControle`): a linha “de OP de {antLabel}” para **qualquer** etapa com `opAnteriorTotal(e.key) > 0`.

- [ ] **Step 1:** Teste de scale: `matrizAnt.ferm` 40 un → `opAnteriorTotal('ferm')` em `lt`. Teste de `hoursAxis` já existe na Task 1.
- [ ] **Step 2–4:** implementar copy + eixo. Sem RTL; conferir que `HORAS.map` usa o eixo novo e `totais[h]` indexa hora civil.
- [ ] **Step 5: Commit** `feat: gráfico 24h começa no T1 e fala janela, não dia`

---

### Task 9: Header da TV = OP completa + subtítulo da janela

**Files:**
- Create: `src/domain/painel-etapa-tv/painel-etapa-tv-janela-label.ts`
- Create: `src/domain/painel-etapa-tv/painel-etapa-tv-janela-label.test.ts`
- Modify: `src/components/PainelEtapaTv/PainelEtapaTvPageClient.tsx` (métricas)
- Modify: `src/components/PainelEtapaTv/PainelEtapaTvHeader.tsx`
- Modify: `src/components/PainelEtapaTv/PainelEtapaTvScreen.tsx` (passar label)

**Interfaces:**
```typescript
export class PainelEtapaTvJanelaLabel {
  static format(dateISO: string, janela: JanelaOperacional): string;
  // "OP 2 set · turnos 22h de 1 set → 22h de 2 set"
}
```

Meses: `jan fev mar abr mai jun jul ago set out nov dez`. Dia sem zero à esquerda. Relógio: `formatJanelaClockLabel(t1Inicio)` nos dois lados (mesmo clock; datas diferentes).

- [ ] **Step 1: Teste do label** com `2026-09-02` + T1 22:00 → string exata acima (`1 set` e `2 set`).
- [ ] **Step 2: FAIL**
- [ ] **Step 3:** PageClient ferm/forno: `buildOrdensEtapaToolbarMetrics(ordensParaTotaisLt(carga.ordens ?? []), 'LT')` — **parar** de usar `toolbarMetricsEtapaDiaCivil` / `dashboardDia`. Embalagem: manter `buildEmbalagemToolbarMetrics`. Header: trocar `{diaLabel} · agora {agora}` por `{janelaLabel} · agora {agora}` (`aria-label` da data: “Data da OP”). `janelaLabel` de `fluxo.janelasPorEtapa[config.fluxoKey]` + `selectedDate`; fallback `formatOpLabelFromDate(selectedDate)` se fluxo null.
- [ ] **Step 4: PASS** do teste de label
- [ ] **Step 5: Commit** `feat: header da TV mostra OP completa e a janela T1`

---

### Task 10: Card de TV (ORDEM + TURNOS)

**Files:**
- Create: `src/components/PainelEtapaTv/PainelEtapaTvResumoCard.tsx`
- Modify: `src/components/PainelEtapaTv/PainelEtapaTvGrid.tsx`
- Modify: `src/components/PainelEtapaTv/PainelEtapaTvScreen.tsx` (passar progresso + turnosResumo + janela)

**Interfaces:**
- Props do card: `progresso: PainelEtapaTvOpProgressoDto`, `turnos: PainelEtapaTvTurnosResumoDto`, `dateISO`, `unit: string`, `t1Label: string` (ex. `22h–22h` via `formatJanelaClockLabel` início e fim da janela = mesmo T1 + 24h, na prática `22h–22h`).

UI (pt-BR, `font-mono tabular-nums`, rótulos `text-[10px] font-semibold uppercase tracking-wide text-text-muted`):

1. Zona **ORDEM {DD/MM}**: `feito / meta UNIT`. Micro: `nesta janela {n}` · se `depoisJanela > 0` `depois desta janela {n}` · se `antesJanela > 0` `antes desta janela {n}` · `falta {n}`.
2. Zona **TURNOS {t1Label}**: total. Linha por fatia `T1 22h–07h` + volume. `sem turno` só se `semTurno > 0`. Se `outraOp > 0`: `{n} de outra OP` ou `{n} de OP DD/MM` se `outraOpData`.

`t1Label`: `${formatJanelaClockLabel(janela.t1Inicio)}–${formatJanelaClockLabel(janela.t1Inicio)}` é errado. Fim da janela é o mesmo clock no dia seguinte → `22h–22h`. Usar `formatJanelaClockLabel(t1Inicio)` duas vezes com en-dash.

Screen calcula progresso:

```typescript
PainelEtapaTvOpProgresso.fromLotes(
  lotesDaEtapa, // ferm/forno: lote.assadeiras; emb: lote.quantidade.caixas
  metrics.meta,
  fluxo.janelasPorEtapa[config.fluxoKey],
)
```

`feito` do progresso deve coincidir com `metrics.produzido` (mesmos lotes). Se divergir (recorte `incluirNosTotais`), filtrar lotes como `ordensParaTotaisLt`.

Grid: no lugar de `FluxoEtapaCard`, renderizar `PainelEtapaTvResumoCard`. Remover `FluxoFaixaEtapa` do `PainelEtapaTvGrafico`.

- [ ] **Step 1:** Sem RTL. Teste opcional de formatação DD/MM se extrair helper. Implementar o card + grid.
- [ ] **Step 2:** Conferir arquivos < 400 linhas.
- [ ] **Step 3: Commit** `feat: card da TV separa ordem e turnos da janela`

---

### Task 11: Último lançamento na janela

**Files:**
- Modify: `src/domain/painel-etapa-tv/painel-etapa-tv-ultimo-lote-picker.ts`
- Modify: `src/domain/painel-etapa-tv/painel-etapa-tv-ultimo-lote-picker.test.ts`
- Modify: `src/components/PainelEtapaTv/PainelEtapaTvScreen.tsx`
- Modify: `src/components/PainelEtapaTv/PainelEtapaTvUltimoLote.tsx` (copy vazio)

**Interfaces:**
```typescript
static fromLotes(lotes: PainelEtapaTvLoteFonte[], janela?: { iniMs: number; fimMs: number }): PainelEtapaTvUltimoLote | null
```

Sem `janela`, comportamento atual (testes velhos passam). Com janela, filtra `iniMs <= parse < fimMs`.

Screen: preferir `fluxo.ultimoPorEtapa[config.fluxoKey]` se não null; senão picker nos lotes da fonte filtrados pela janela (OPs da data — fallback). Copy vazio: **Nenhum lançamento nesta janela**.

- [ ] **Step 1: Teste** lote 21h de 01/09 fora da janela 22h; lote 22:30 vence.
- [ ] **Step 2–4**
- [ ] **Step 5: Commit** `feat: último lote do quadro é o mais recente na janela`

---

## Verificação manual (depois da Task 11)

- `npx vitest run src/domain/producao-turno/janela-operacional.test.ts src/domain/painel-etapa-tv src/domain/fluxo-processo src/components/FluxoProcesso/fluxo-display-scale.test.ts src/lib/services/ritmo-lotes-dia-loader.test.ts src/lib/services/fluxo-processo-tv-attach.test.ts`
- `npx vitest run` (suíte) se o tempo permitir
- Browser `/painel/fermentacao`, `/painel/forno`, `/painel/embalagem`: subtítulo visível; eixo começa no T1; header ≠ soma só civil; card com duas zonas. Fluxo `/realizado/fluxo-processo`: gráfico deslocado, card de etapa ainda é o antigo.
- Realizado fermentação: toolbar inalterada (civil).

---

## Cobertura da spec

| Spec | Task |
|------|------|
| Janela = T1 que contém o meio-dia | 1 |
| OP completa / nesta / depois / falta | 2, 9, 10 |
| Turnos pelo carimbo + outra OP | 3, 7, 10 |
| Vocabulário, sem “dia” | 8, 9, 10 |
| Gráfico 22…21, hachura 3 etapas, previsto na janela | 4, 6, 8 |
| Carga fluxo T1, não civil; Produção/Realizado intactos | 5 |
| Header OP; card TV novo; some FluxoEtapaCard na TV | 9, 10 |
| Último lote na janela | 11 |
| Config T1 21:00 desloca | 1 + 5 + 8 (sem constante 22) |
| Card fluxo não redesenhado; un = OP na janela | 4, 8 |
