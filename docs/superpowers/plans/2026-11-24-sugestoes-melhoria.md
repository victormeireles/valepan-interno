# Sugestões de melhoria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> O plano continua em `2026-11-24-sugestoes-melhoria-api.md` (tarefas 4–6), `2026-11-24-sugestoes-melhoria-acoes.md` (tarefas 7–8), `2026-11-24-sugestoes-melhoria-telas.md` (tarefas 9–10) e `2026-11-24-sugestoes-melhoria-lista.md` (tarefa 11). A quebra existe para manter cada arquivo abaixo de 500 linhas. Leia os cinco antes de executar.

**Goal:** Página pública `/sugestoes` em que o colaborador ativo se identifica pelo CPF e envia uma sugestão, e lista interna em `/pessoas/sugestoes` para quem tem Pessoas: Ler.

**Architecture:** O navegador público só chama `/api/public/sugestoes`. As rotas usam service role. O CPF vira um token HMAC de 10 minutos. A foto sobe antes da linha e é apagada se o insert falhar. A lista lê as 200 mais novas e assina a foto por 1 hora.

**Tech Stack:** Next.js 15, React 19, Vitest, Supabase (Postgres + Storage), service role, `CpfVerificador` já existente.

## Global Constraints

- Página pública: `/sugestoes`, título “Sugestão de melhoria”. Sem login, sem hub, sem menu.
- CPF inválido: “CPF inválido.” e não consulta o cadastro.
- Busca só `situacao = ativo`, 11 dígitos, pontuação gravada ignorada. `cpf_verificado` não entra.
- Zero ou mais de um ativo: “Procure o RH para cadastrar.” A resposta não diz qual caso foi.
- Um ativo: mostra o nome. “Não sou esta pessoa” volta ao CPF e descarta o token no navegador.
- Temas fixos: Segurança `seguranca`, Qualidade `qualidade`, Organização `organizacao`, Processos `processos`, Eficiência `eficiencia`, Segurança dos alimentos `seguranca_alimentos`, Inovação `inovacao`.
- Texto gravado com `btrim`, de 10 a 2.000 caracteres.
- Foto opcional: jpeg, png ou webp, até 5.242.880 bytes. Ausente é válida.
- Sucesso: “Sugestão enviada.” Enviar outra volta ao CPF. Botões desabilitados enquanto o pedido corre.
- Token: 10 minutos, HMAC-SHA256 com o segredo de auth, payload com id, vencimento e propósito `sugestao-melhoria`. A resposta não devolve o id.
- Limite deslizante de 10 minutos: 10 identificar e 5 enviar por IP. Hash SHA-256 do IP com o segredo. Sem IP, balde `desconhecido`. 429: “Muitas tentativas. Espere um pouco e tente de novo.” Não grava acesso novo nem consulta/grava sugestão. Corrida pode deixar passar alguns a mais.
- Todo pedido apaga acessos com mais de 1 dia antes de contar.
- Falha de consulta: “Não foi possível consultar agora. Tente de novo.” Falha de envio: “Não foi possível enviar agora. Tente de novo.”
- Token ruim: 401 “A identificação expirou. Informe o CPF de novo.”
- Tema: “Escolha um tema.” Texto curto: “Escreva pelo menos 10 caracteres.” Texto longo: “O texto pode ter até 2.000 caracteres.” Foto: “Use uma foto de até 5 MB.”
- Lista `/pessoas/sugestoes`, `requireInternoModulo('interno_pessoas', 'ler')`, 200 mais novas do filtro, data `dd/MM/yyyy HH:mm` em `America/Sao_Paulo`. Vazia: “Nenhuma sugestão ainda.” Foto com URL falha: linha sem imagem.
- Hub: “Sugestões”, “Melhorias enviadas pelo QR”, ícone `lightbulb`, entre Extras e Visão geral. O mesmo no menu Pessoas.
- RLS como na spec. Sem INSERT para anon/authenticated. Sem módulo novo. Sem status, edição ou exclusão na tela.
- Arquivo ≤ 500 linhas. Uma responsabilidade por arquivo. Função abaixo de 40 linhas.

## File map

- `src/domain/sugestoes/sugestao-mensagens.ts` — textos fixos
- `src/domain/sugestoes/sugestao-tema-catalogo.ts` — sete temas
- `src/domain/sugestoes/sugestao-texto-regra.ts` — corte e tamanho
- `src/domain/sugestoes/sugestao-foto-regra.ts` — tipo e tamanho
- `src/domain/sugestoes/sugestao-identificacao-token.ts` — HMAC
- `src/domain/sugestoes/sugestao-cpf-consulta.ts` — inválido, RH ou identificado
- `src/domain/sugestoes/sugestao-ip.ts` — IP e hash
- `src/domain/sugestoes/sugestao-publica-rate-limit.ts` — janela
- `src/domain/sugestoes/sugestao-data-hora.ts` — formato da lista
- `src/lib/services/sugestao-foto-storage.ts` — bucket
- `src/lib/services/sugestao-registro.ts` — insert com desfazer foto
- `src/lib/services/sugestao-acesso-store.ts` — tabela de limite
- `src/lib/services/sugestao-ativos-por-cpf.ts` — RPC
- `src/lib/services/sugestao-identificar-acao.ts` — orquestra o identificar
- `src/lib/services/sugestao-enviar-acao.ts` — orquestra o enviar
- `src/lib/services/sugestao-lista-leitura.ts` — 200 linhas e URLs
- `src/lib/navegacao-oculta.ts` — esconde o menu em `/sugestoes`
- `supabase/migrations/20261124180000_sugestoes_melhoria.sql`
- `src/app/api/public/sugestoes/identificar/route.ts`
- `src/app/api/public/sugestoes/route.ts`
- `src/app/sugestoes/page.tsx` + `src/features/sugestoes/SugestaoPublicaForm.tsx`
- `src/app/pessoas/sugestoes/page.tsx` + `src/features/sugestoes/SugestoesLista.tsx`

---

### Task 1: Mensagens, temas, texto e foto

**Files:**
- Create: `src/domain/sugestoes/sugestao-mensagens.ts`
- Create: `src/domain/sugestoes/sugestao-tema-catalogo.ts`
- Create: `src/domain/sugestoes/sugestao-texto-regra.ts`
- Create: `src/domain/sugestoes/sugestao-foto-regra.ts`
- Test: `src/domain/sugestoes/sugestao-regras.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `SUGESTAO_MENSAGENS`, `SugestaoTema`, `SugestaoTemaCatalogo.aceita`, `SugestaoTemaCatalogo.rotulo`, `SugestaoTemaCatalogo.opcoes`, `SugestaoTextoRegra.avaliar`, `SUGESTAO_FOTO_MAX_BYTES`, `SugestaoFotoRegra.avaliar`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { SugestaoFotoRegra } from './sugestao-foto-regra';
import { SugestaoTemaCatalogo } from './sugestao-tema-catalogo';
import { SugestaoTextoRegra } from './sugestao-texto-regra';

describe('regras da sugestão', () => {
  const temas = new SugestaoTemaCatalogo();
  const texto = new SugestaoTextoRegra();
  const foto = new SugestaoFotoRegra();

  it('aceita os sete temas e rejeita outro', () => {
    expect(temas.opcoes().map((item) => item.valor)).toEqual([
      'seguranca', 'qualidade', 'organizacao', 'processos',
      'eficiencia', 'seguranca_alimentos', 'inovacao',
    ]);
    expect(temas.rotulo('seguranca_alimentos')).toBe('Segurança dos alimentos');
    expect(temas.aceita('inovacao')).toBe(true);
    expect(temas.aceita('outro')).toBe(false);
  });

  it('corta o texto e cobra de 10 a 2000', () => {
    expect(texto.avaliar('a'.repeat(9))).toEqual({
      ok: false,
      mensagem: 'Escreva pelo menos 10 caracteres.',
    });
    expect(texto.avaliar(`  ${'a'.repeat(10)}  `)).toEqual({ ok: true, texto: 'a'.repeat(10) });
    expect(texto.avaliar('a'.repeat(2000))).toEqual({ ok: true, texto: 'a'.repeat(2000) });
    expect(texto.avaliar('a'.repeat(2001)).ok).toBe(false);
  });

  it('aceita foto ausente e jpeg, png ou webp até 5 MB', () => {
    expect(foto.avaliar(null)).toEqual({ ok: true, arquivo: null });
    expect(foto.avaliar({ type: 'image/png', size: 10, bytes: new Uint8Array([1]) }).ok).toBe(true);
    expect(foto.avaliar({ type: 'image/gif', size: 10, bytes: new Uint8Array([1]) })).toEqual({
      ok: false,
      mensagem: 'Use uma foto de até 5 MB.',
    });
    expect(foto.avaliar({ type: 'image/jpeg', size: 5_242_881, bytes: new Uint8Array([1]) }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/sugestoes/sugestao-regras.test.ts`
Expected: FAIL, cannot find module

- [ ] **Step 3: Write minimal implementation**

`sugestao-mensagens.ts`:

```ts
export const SUGESTAO_MENSAGENS = {
  cpfInvalido: 'CPF inválido.',
  procureRh: 'Procure o RH para cadastrar.',
  muitasTentativas: 'Muitas tentativas. Espere um pouco e tente de novo.',
  falhaConsulta: 'Não foi possível consultar agora. Tente de novo.',
  falhaEnvio: 'Não foi possível enviar agora. Tente de novo.',
  identificacaoExpirou: 'A identificação expirou. Informe o CPF de novo.',
  escolhaTema: 'Escolha um tema.',
  textoCurto: 'Escreva pelo menos 10 caracteres.',
  textoLongo: 'O texto pode ter até 2.000 caracteres.',
  foto: 'Use uma foto de até 5 MB.',
  enviada: 'Sugestão enviada.',
  listaVazia: 'Nenhuma sugestão ainda.',
} as const;
```

`sugestao-tema-catalogo.ts`:

```ts
const TEMAS = [
  { valor: 'seguranca', rotulo: 'Segurança' },
  { valor: 'qualidade', rotulo: 'Qualidade' },
  { valor: 'organizacao', rotulo: 'Organização' },
  { valor: 'processos', rotulo: 'Processos' },
  { valor: 'eficiencia', rotulo: 'Eficiência' },
  { valor: 'seguranca_alimentos', rotulo: 'Segurança dos alimentos' },
  { valor: 'inovacao', rotulo: 'Inovação' },
] as const;

export type SugestaoTema = (typeof TEMAS)[number]['valor'];

export class SugestaoTemaCatalogo {
  opcoes(): { valor: SugestaoTema; rotulo: string }[] {
    return TEMAS.map((tema) => ({ valor: tema.valor, rotulo: tema.rotulo }));
  }

  aceita(valor: string): valor is SugestaoTema {
    return TEMAS.some((tema) => tema.valor === valor);
  }

  rotulo(valor: string): string {
    return TEMAS.find((tema) => tema.valor === valor)?.rotulo ?? valor;
  }
}
```

`sugestao-texto-regra.ts`:

```ts
import { SUGESTAO_MENSAGENS } from './sugestao-mensagens';

export type SugestaoTextoResultado =
  | { ok: true; texto: string }
  | { ok: false; mensagem: string };

export class SugestaoTextoRegra {
  avaliar(bruto: string): SugestaoTextoResultado {
    const texto = bruto.trim();
    if (texto.length < 10) return { ok: false, mensagem: SUGESTAO_MENSAGENS.textoCurto };
    if (texto.length > 2000) return { ok: false, mensagem: SUGESTAO_MENSAGENS.textoLongo };
    return { ok: true, texto };
  }
}
```

`sugestao-foto-regra.ts`:

```ts
import { SUGESTAO_MENSAGENS } from './sugestao-mensagens';

export const SUGESTAO_FOTO_MAX_BYTES = 5_242_880;
const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type SugestaoFotoEntrada = { type: string; size: number; bytes: Uint8Array };

export type SugestaoFotoResultado =
  | { ok: true; arquivo: SugestaoFotoEntrada | null }
  | { ok: false; mensagem: string };

export class SugestaoFotoRegra {
  avaliar(arquivo: SugestaoFotoEntrada | null): SugestaoFotoResultado {
    if (!arquivo || arquivo.size <= 0) return { ok: true, arquivo: null };
    const aceita = MIMES.has(arquivo.type) && arquivo.size <= SUGESTAO_FOTO_MAX_BYTES;
    if (!aceita) return { ok: false, mensagem: SUGESTAO_MENSAGENS.foto };
    return { ok: true, arquivo };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/sugestoes/sugestao-regras.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/sugestoes/sugestao-mensagens.ts src/domain/sugestoes/sugestao-tema-catalogo.ts src/domain/sugestoes/sugestao-texto-regra.ts src/domain/sugestoes/sugestao-foto-regra.ts src/domain/sugestoes/sugestao-regras.test.ts
git commit -m "feat(sugestoes): fixa temas, texto e foto da sugestão"
```

---

### Task 2: Token de identificação

**Files:**
- Create: `src/domain/sugestoes/sugestao-identificacao-token.ts`
- Test: `src/domain/sugestoes/sugestao-identificacao-token.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `SugestaoIdentificacaoToken.assinar(colaboradorId: string): string` e `conferir(token: string): { colaboradorId: string } | null`. TTL 10 minutos. Propósito `sugestao-melhoria`.

- [ ] **Step 1: Write the failing test**

```ts
import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { SugestaoIdentificacaoToken } from './sugestao-identificacao-token';

describe('SugestaoIdentificacaoToken', () => {
  const agora = 1_700_000_000_000;
  const token = new SugestaoIdentificacaoToken('segredo', () => agora);

  it('devolve o id enquanto não vence', () => {
    const assinado = token.assinar('colab-1');
    expect(new SugestaoIdentificacaoToken('segredo', () => agora + 60_000).conferir(assinado))
      .toEqual({ colaboradorId: 'colab-1' });
  });

  it('recusa vencido, adulterado, outro segredo e outro propósito', () => {
    const assinado = token.assinar('colab-1');
    expect(new SugestaoIdentificacaoToken('segredo', () => agora + 10 * 60 * 1000).conferir(assinado)).toBeNull();
    expect(token.conferir(`${assinado}x`)).toBeNull();
    expect(new SugestaoIdentificacaoToken('outro', () => agora).conferir(assinado)).toBeNull();
    const payload = Buffer.from(JSON.stringify({
      colaboradorId: 'colab-1', exp: agora + 1000, purpose: 'outro',
    })).toString('base64url');
    const assinatura = createHmac('sha256', 'segredo').update(payload).digest('base64url');
    expect(token.conferir(`${payload}.${assinatura}`)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/sugestoes/sugestao-identificacao-token.test.ts`
Expected: FAIL, cannot find module

- [ ] **Step 3: Write minimal implementation**

```ts
import { createHmac, timingSafeEqual } from 'crypto';

const PROPOSITO = 'sugestao-melhoria';
const TTL_MS = 10 * 60 * 1000;

type Payload = { colaboradorId?: string; exp?: number; purpose?: string };

export class SugestaoIdentificacaoToken {
  constructor(
    private readonly secret: string,
    private readonly agora: () => number = () => Date.now(),
  ) {}

  assinar(colaboradorId: string): string {
    const corpo = Buffer.from(JSON.stringify({
      colaboradorId,
      exp: this.agora() + TTL_MS,
      purpose: PROPOSITO,
    })).toString('base64url');
    return `${corpo}.${this.assinarCorpo(corpo)}`;
  }

  conferir(token: string): { colaboradorId: string } | null {
    const partes = token.split('.');
    if (partes.length !== 2) return null;
    const [corpo, assinatura] = partes;
    if (!this.bate(assinatura, this.assinarCorpo(corpo))) return null;
    const dados = this.ler(corpo);
    if (!dados?.colaboradorId || dados.purpose !== PROPOSITO) return null;
    if (typeof dados.exp !== 'number' || dados.exp <= this.agora()) return null;
    return { colaboradorId: dados.colaboradorId };
  }

  private assinarCorpo(corpo: string): string {
    return createHmac('sha256', this.secret).update(corpo).digest('base64url');
  }

  private bate(recebida: string, esperada: string): boolean {
    const a = Buffer.from(recebida);
    const b = Buffer.from(esperada);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private ler(corpo: string): Payload | null {
    try {
      return JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as Payload;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/sugestoes/sugestao-identificacao-token.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/sugestoes/sugestao-identificacao-token.ts src/domain/sugestoes/sugestao-identificacao-token.test.ts
git commit -m "feat(sugestoes): assina a identificação do colaborador por 10 minutos"
```

---

### Task 3: Consulta de CPF

**Files:**
- Create: `src/domain/sugestoes/sugestao-cpf-consulta.ts`
- Test: `src/domain/sugestoes/sugestao-cpf-consulta.test.ts`

**Interfaces:**
- Consumes: `CpfVerificador.verificar(digitos: string): boolean` em `src/domain/pessoas/cpf-verificador.ts`
- Produces: `SugestaoAtivosPorCpf.listar(digitos: string): Promise<{ id: string; nome: string }[]>`, `SugestaoCpfConsulta.classificar(cpf: string)` → `{ tipo: 'invalido' } | { tipo: 'rh' } | { tipo: 'identificado'; colaborador: { id: string; nome: string } }`. CPF inválido não chama `listar`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { CpfVerificador } from '@/domain/pessoas/cpf-verificador';
import { SugestaoCpfConsulta, type SugestaoAtivosPorCpf } from './sugestao-cpf-consulta';

const ANA = { id: 'ana', nome: 'Ana' };

function porta(linhas: { id: string; nome: string }[]): SugestaoAtivosPorCpf & { chamadas: number } {
  return {
    chamadas: 0,
    async listar() {
      this.chamadas += 1;
      return linhas;
    },
  };
}

describe('SugestaoCpfConsulta', () => {
  it('não consulta CPF com dígito errado', async () => {
    const ativos = porta([ANA]);
    const resultado = await new SugestaoCpfConsulta(new CpfVerificador(), ativos).classificar('111.111.111-11');
    expect(resultado).toEqual({ tipo: 'invalido' });
    expect(ativos.chamadas).toBe(0);
  });

  it('identifica um ativo e manda o resto ao RH', async () => {
    const consulta = (linhas: { id: string; nome: string }[]) =>
      new SugestaoCpfConsulta(new CpfVerificador(), porta(linhas));
    const cpf = '390.533.447-05';
    expect(await consulta([ANA]).classificar(cpf)).toEqual({ tipo: 'identificado', colaborador: ANA });
    expect(await consulta([]).classificar(cpf)).toEqual({ tipo: 'rh' });
    expect(await consulta([ANA, { id: 'bia', nome: 'Bia' }]).classificar(cpf)).toEqual({ tipo: 'rh' });
  });
});
```

O caso “só afastado/desligado/admissão” fica na RPC da Task 4, que filtra `situacao = 'ativo'`. A consulta trata lista vazia como RH.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/sugestoes/sugestao-cpf-consulta.test.ts`
Expected: FAIL, cannot find module

- [ ] **Step 3: Write minimal implementation**

```ts
import { CpfVerificador } from '@/domain/pessoas/cpf-verificador';

export type SugestaoAtivo = { id: string; nome: string };

export interface SugestaoAtivosPorCpf {
  listar(digitos: string): Promise<SugestaoAtivo[]>;
}

export type SugestaoCpfResultado =
  | { tipo: 'invalido' }
  | { tipo: 'rh' }
  | { tipo: 'identificado'; colaborador: SugestaoAtivo };

export class SugestaoCpfConsulta {
  constructor(
    private readonly verificador: CpfVerificador,
    private readonly ativos: SugestaoAtivosPorCpf,
  ) {}

  async classificar(cpf: string): Promise<SugestaoCpfResultado> {
    const digitos = cpf.replace(/\D/g, '');
    if (!this.verificador.verificar(digitos)) return { tipo: 'invalido' };
    const encontrados = await this.ativos.listar(digitos);
    if (encontrados.length !== 1) return { tipo: 'rh' };
    return { tipo: 'identificado', colaborador: encontrados[0] };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/sugestoes/sugestao-cpf-consulta.test.ts`
Expected: PASS. CPF `39053344705` já é aceito por `CpfVerificador` nos testes de cadastro.

- [ ] **Step 5: Commit**

```bash
git add src/domain/sugestoes/sugestao-cpf-consulta.ts src/domain/sugestoes/sugestao-cpf-consulta.test.ts
git commit -m "feat(sugestoes): classifica o CPF em inválido, RH ou um ativo"
```

A migration, o limite, o registro e as rotas estão na parte API.
