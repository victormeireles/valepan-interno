# Sugestões de melhoria — parte ações

Continuação de `2026-11-24-sugestoes-melhoria-api.md`. Tarefas 7 e 8. As telas estão em `2026-11-24-sugestoes-melhoria-telas.md`.

### Task 7: Ação de identificar

**Files:**
- Create: `src/lib/services/sugestao-identificar-acao.ts`
- Create: `src/lib/services/sugestao-ativos-por-cpf.ts`
- Create: `src/lib/services/sugestao-acesso-store.ts`
- Create: `src/app/api/public/sugestoes/identificar/route.ts`
- Test: `src/lib/services/sugestao-identificar-acao.test.ts`

**Interfaces:**
- Consumes: `SugestaoCpfConsulta.classificar`, `SugestaoIdentificacaoToken.assinar`, `SugestaoPublicaRateLimit.consumir`, `SUGESTAO_MENSAGENS`, `SugestaoIpOrigem.extrair`
- Produces: `SugestaoHttp = { status: number; body: Record<string, string> }`; `SugestaoIdentificarAcao.executar(cpf: string, ip: string | null): Promise<SugestaoHttp>`. Sucesso: `nome` e `token`, sem `id`. RH é o mesmo corpo para zero ou vários. `SugestaoAtivosPorCpfSupabase.listar` chama a RPC `sugestoes_ativos_por_cpf`. `SugestaoAcessoStoreSupabase` implementa `SugestaoAcessoStore`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import type { SugestaoCpfResultado } from '@/domain/sugestoes/sugestao-cpf-consulta';
import { SugestaoIdentificarAcao } from './sugestao-identificar-acao';

const ANA = { tipo: 'identificado' as const, colaborador: { id: 'ana-id', nome: 'Ana' } };

function acao(resultado: SugestaoCpfResultado | 'estoura', limite: 'ok' | 'limite' = 'ok') {
  const chamadas = { consulta: 0 };
  const consulta = {
    async classificar(): Promise<SugestaoCpfResultado> {
      chamadas.consulta += 1;
      if (resultado === 'estoura') throw new Error('db');
      return resultado;
    },
  };
  const limitePorta = { async consumir() { return limite; } };
  const tokens = new SugestaoIdentificacaoToken('segredo', () => 1_700_000_000_000);
  return { chamadas, acao: new SugestaoIdentificarAcao(limitePorta, consulta, tokens) };
}

describe('SugestaoIdentificarAcao', () => {
  it('responde RH igual para nenhum e para vários, sem nome', async () => {
    const nenhum = await acao({ tipo: 'rh' }).acao.executar('39053344705', '1.1.1.1');
    const varios = await acao({ tipo: 'rh' }).acao.executar('39053344705', '1.1.1.1');
    expect(nenhum).toEqual({ status: 200, body: { mensagem: SUGESTAO_MENSAGENS.procureRh } });
    expect(varios).toEqual(nenhum);
    expect(nenhum.body.nome).toBeUndefined();
  });

  it('devolve nome e token sem o id', async () => {
    const resposta = await acao(ANA).acao.executar('39053344705', null);
    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe('Ana');
    expect(resposta.body.id).toBeUndefined();
    expect(new SugestaoIdentificacaoToken('segredo', () => 1_700_000_000_000).conferir(resposta.body.token))
      .toEqual({ colaboradorId: 'ana-id' });
  });

  it('no limite não consulta', async () => {
    const feito = acao(ANA, 'limite');
    expect(await feito.acao.executar('39053344705', '1.1.1.1')).toEqual({
      status: 429, body: { mensagem: SUGESTAO_MENSAGENS.muitasTentativas },
    });
    expect(feito.chamadas.consulta).toBe(0);
  });

  it('CPF inválido e falha de banco', async () => {
    expect((await acao({ tipo: 'invalido' }).acao.executar('1', null)).status).toBe(400);
    expect((await acao('estoura').acao.executar('39053344705', null)).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/services/sugestao-identificar-acao.test.ts`
Expected: FAIL, cannot find module

- [ ] **Step 3: Write minimal implementation**

`sugestao-identificar-acao.ts`:

```ts
import type { SugestaoCpfConsulta } from '@/domain/sugestoes/sugestao-cpf-consulta';
import type { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import type { SugestaoPublicaRateLimit } from '@/domain/sugestoes/sugestao-publica-rate-limit';

export type SugestaoHttp = { status: number; body: Record<string, string> };

export class SugestaoIdentificarAcao {
  constructor(
    private readonly limite: Pick<SugestaoPublicaRateLimit, 'consumir'>,
    private readonly consulta: Pick<SugestaoCpfConsulta, 'classificar'>,
    private readonly token: Pick<SugestaoIdentificacaoToken, 'assinar'>,
  ) {}

  async executar(cpf: string, ip: string | null): Promise<SugestaoHttp> {
    try {
      if (await this.limite.consumir(ip, 'identificar') === 'limite') {
        return { status: 429, body: { mensagem: SUGESTAO_MENSAGENS.muitasTentativas } };
      }
      return await this.responder(cpf);
    } catch {
      return { status: 500, body: { mensagem: SUGESTAO_MENSAGENS.falhaConsulta } };
    }
  }

  private async responder(cpf: string): Promise<SugestaoHttp> {
    const resultado = await this.consulta.classificar(cpf);
    if (resultado.tipo === 'invalido') {
      return { status: 400, body: { mensagem: SUGESTAO_MENSAGENS.cpfInvalido } };
    }
    if (resultado.tipo === 'rh') {
      return { status: 200, body: { mensagem: SUGESTAO_MENSAGENS.procureRh } };
    }
    return {
      status: 200,
      body: {
        nome: resultado.colaborador.nome,
        token: this.token.assinar(resultado.colaborador.id),
      },
    };
  }
}
```

`sugestao-ativos-por-cpf.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SugestaoAtivo, SugestaoAtivosPorCpf } from '@/domain/sugestoes/sugestao-cpf-consulta';

export class SugestaoAtivosPorCpfSupabase implements SugestaoAtivosPorCpf {
  constructor(private readonly db: SupabaseClient) {}

  async listar(digitos: string): Promise<SugestaoAtivo[]> {
    const { data, error } = await this.db.rpc(
      'sugestoes_ativos_por_cpf' as never,
      { digitos } as never,
    );
    if (error) throw new Error(error.message);
    return (data ?? []) as SugestaoAtivo[];
  }
}
```

`sugestao-acesso-store.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SugestaoAcessoStore, SugestaoAcessoTipo } from '@/domain/sugestoes/sugestao-publica-rate-limit';

export class SugestaoAcessoStoreSupabase implements SugestaoAcessoStore {
  constructor(private readonly db: SupabaseClient) {}

  async apagarAnterioresA(instante: Date): Promise<void> {
    const { error } = await this.db.from('sugestoes_publica_acessos' as never)
      .delete().lt('criado_em', instante.toISOString());
    if (error) throw new Error(error.message);
  }

  async contar(ipHash: string, tipo: SugestaoAcessoTipo, desde: Date): Promise<number> {
    const { count, error } = await this.db.from('sugestoes_publica_acessos' as never)
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).eq('tipo', tipo).gte('criado_em', desde.toISOString());
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async registrar(ipHash: string, tipo: SugestaoAcessoTipo): Promise<void> {
    const { error } = await this.db.from('sugestoes_publica_acessos' as never)
      .insert({ ip_hash: ipHash, tipo } as never);
    if (error) throw new Error(error.message);
  }
}
```

Se o `from(... as never)` não encadear, troque o cliente do construtor para `SupabaseClient<any>`.

`src/app/api/public/sugestoes/identificar/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { CpfVerificador } from '@/domain/pessoas/cpf-verificador';
import { SugestaoCpfConsulta } from '@/domain/sugestoes/sugestao-cpf-consulta';
import { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SugestaoIpOrigem } from '@/domain/sugestoes/sugestao-ip';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import { SugestaoPublicaRateLimit } from '@/domain/sugestoes/sugestao-publica-rate-limit';
import { getAuthSecret } from '@/lib/auth/auth-secret';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { SugestaoAcessoStoreSupabase } from '@/lib/services/sugestao-acesso-store';
import { SugestaoAtivosPorCpfSupabase } from '@/lib/services/sugestao-ativos-por-cpf';
import { SugestaoIdentificarAcao } from '@/lib/services/sugestao-identificar-acao';

export async function POST(request: Request) {
  let cpf = '';
  try {
    const body = await request.json() as { cpf?: unknown };
    cpf = typeof body.cpf === 'string' ? body.cpf : '';
  } catch {
    return NextResponse.json({ mensagem: SUGESTAO_MENSAGENS.cpfInvalido }, { status: 400 });
  }
  const db = createServiceRoleClient();
  const secret = getAuthSecret();
  const acao = new SugestaoIdentificarAcao(
    new SugestaoPublicaRateLimit(new SugestaoAcessoStoreSupabase(db), secret),
    new SugestaoCpfConsulta(new CpfVerificador(), new SugestaoAtivosPorCpfSupabase(db)),
    new SugestaoIdentificacaoToken(secret),
  );
  const resposta = await acao.executar(cpf, new SugestaoIpOrigem().extrair(request.headers));
  return NextResponse.json(resposta.body, { status: resposta.status });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/services/sugestao-identificar-acao.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/sugestao-identificar-acao.ts src/lib/services/sugestao-identificar-acao.test.ts src/lib/services/sugestao-ativos-por-cpf.ts src/lib/services/sugestao-acesso-store.ts src/app/api/public/sugestoes/identificar/route.ts
git commit -m "feat(sugestoes): identifica o colaborador ativo pelo CPF"
```

---

### Task 8: Ação de enviar

**Files:**
- Create: `src/lib/services/sugestao-enviar-acao.ts`
- Create: `src/lib/services/sugestao-insert-supabase.ts`
- Create: `src/app/api/public/sugestoes/route.ts`
- Test: `src/lib/services/sugestao-enviar-acao.test.ts`

**Interfaces:**
- Consumes: `SugestaoHttp`, `SugestaoPublicaRateLimit.consumir`, `SugestaoIdentificacaoToken.conferir`, `SugestaoTemaCatalogo.aceita`, `SugestaoTextoRegra.avaliar`, `SugestaoFotoRegra.avaliar`, `SugestaoRegistro.gravar`, `SugestaoFotoEntrada`, `SUGESTAO_MENSAGENS`
- Produces: `SugestaoEnvioEntrada = { token: string; tema: string; texto: string; foto: SugestaoFotoEntrada | null; ip: string | null }`; `SugestaoEnviarAcao.executar(entrada: SugestaoEnvioEntrada): Promise<SugestaoHttp>`; `SugestaoInsertSupabase.inserir(linha: SugestaoLinhaInsert)`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { SugestaoFotoRegra } from '@/domain/sugestoes/sugestao-foto-regra';
import { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { SugestaoTextoRegra } from '@/domain/sugestoes/sugestao-texto-regra';
import { SugestaoEnviarAcao, type SugestaoEnvioEntrada } from './sugestao-enviar-acao';

const AGORA = 1_700_000_000_000;

function montar(limite: 'ok' | 'limite' = 'ok', falha = false) {
  const gravou: unknown[] = [];
  const registro = {
    async gravar(entrada: unknown) {
      if (falha) throw new Error('insert');
      gravou.push(entrada);
    },
  };
  const acao = new SugestaoEnviarAcao(
    { async consumir() { return limite; } },
    new SugestaoIdentificacaoToken('segredo', () => AGORA),
    new SugestaoTemaCatalogo(),
    new SugestaoTextoRegra(),
    new SugestaoFotoRegra(),
    registro,
  );
  return { acao, gravou };
}

function envio(parcial: Partial<SugestaoEnvioEntrada> = {}): SugestaoEnvioEntrada {
  const token = new SugestaoIdentificacaoToken('segredo', () => AGORA).assinar('ana-id');
  return { token, tema: 'seguranca', texto: 'melhorar o piso da área', foto: null, ip: '1.1.1.1', ...parcial };
}

describe('SugestaoEnviarAcao', () => {
  it('não grava token vencido, tema inválido, texto curto nem foto inválida', async () => {
    const vencido = new SugestaoIdentificacaoToken('segredo', () => AGORA - 11 * 60 * 1000).assinar('ana-id');
    const { acao, gravou } = montar();
    expect((await acao.executar(envio({ token: vencido }))).status).toBe(401);
    expect((await acao.executar(envio({ tema: 'outro' }))).body.mensagem).toBe(SUGESTAO_MENSAGENS.escolhaTema);
    expect((await acao.executar(envio({ texto: 'curto' }))).body.mensagem).toBe(SUGESTAO_MENSAGENS.textoCurto);
    expect((await acao.executar(envio({
      foto: { type: 'image/gif', size: 4, bytes: new Uint8Array([1]) },
    }))).body.mensagem).toBe(SUGESTAO_MENSAGENS.foto);
    expect(gravou).toEqual([]);
  });

  it('no limite não grava', async () => {
    const { acao, gravou } = montar('limite');
    expect((await acao.executar(envio())).status).toBe(429);
    expect(gravou).toEqual([]);
  });

  it('grava o texto cortado e traduz falha em 500', async () => {
    const ok = montar();
    expect((await ok.acao.executar(envio({ texto: '  melhorar o piso da área  ' }))).status).toBe(200);
    expect(ok.gravou).toEqual([{
      colaboradorId: 'ana-id', tema: 'seguranca', texto: 'melhorar o piso da área', foto: null,
    }]);
    expect((await montar('ok', true).acao.executar(envio())).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/services/sugestao-enviar-acao.test.ts`
Expected: FAIL, cannot find module

- [ ] **Step 3: Write minimal implementation**

`sugestao-enviar-acao.ts` rejeita nesta ordem: limite 429, token nulo 401, tema fora 400, texto 400, foto 400, `gravar`, senão 200 com `SUGESTAO_MENSAGENS.enviada`. Qualquer throw vira 500 `falhaEnvio`. O `gravar` recebe o texto já cortado e `foto` só quando a regra devolve arquivo.

```ts
import type { SugestaoFotoEntrada } from '@/domain/sugestoes/sugestao-foto-regra';
import { SugestaoFotoRegra } from '@/domain/sugestoes/sugestao-foto-regra';
import type { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import type { SugestaoPublicaRateLimit } from '@/domain/sugestoes/sugestao-publica-rate-limit';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { SugestaoTextoRegra } from '@/domain/sugestoes/sugestao-texto-regra';
import type { SugestaoRegistro } from '@/lib/services/sugestao-registro';
import type { SugestaoHttp } from '@/lib/services/sugestao-identificar-acao';

export type SugestaoEnvioEntrada = {
  token: string;
  tema: string;
  texto: string;
  foto: SugestaoFotoEntrada | null;
  ip: string | null;
};

export class SugestaoEnviarAcao {
  constructor(
    private readonly limite: Pick<SugestaoPublicaRateLimit, 'consumir'>,
    private readonly token: Pick<SugestaoIdentificacaoToken, 'conferir'>,
    private readonly temas: SugestaoTemaCatalogo,
    private readonly textos: SugestaoTextoRegra,
    private readonly fotos: SugestaoFotoRegra,
    private readonly registro: Pick<SugestaoRegistro, 'gravar'>,
  ) {}

  async executar(entrada: SugestaoEnvioEntrada): Promise<SugestaoHttp> {
    try {
      return await this.validar(entrada);
    } catch {
      return { status: 500, body: { mensagem: SUGESTAO_MENSAGENS.falhaEnvio } };
    }
  }

  private async validar(entrada: SugestaoEnvioEntrada): Promise<SugestaoHttp> {
    if (await this.limite.consumir(entrada.ip, 'enviar') === 'limite') {
      return { status: 429, body: { mensagem: SUGESTAO_MENSAGENS.muitasTentativas } };
    }
    const dono = this.token.conferir(entrada.token);
    if (!dono) return { status: 401, body: { mensagem: SUGESTAO_MENSAGENS.identificacaoExpirou } };
    if (!this.temas.aceita(entrada.tema)) {
      return { status: 400, body: { mensagem: SUGESTAO_MENSAGENS.escolhaTema } };
    }
    const texto = this.textos.avaliar(entrada.texto);
    if (!texto.ok) return { status: 400, body: { mensagem: texto.mensagem } };
    const foto = this.fotos.avaliar(entrada.foto);
    if (!foto.ok) return { status: 400, body: { mensagem: foto.mensagem } };
    await this.registro.gravar({
      colaboradorId: dono.colaboradorId,
      tema: entrada.tema,
      texto: texto.texto,
      foto: foto.arquivo,
    });
    return { status: 200, body: { mensagem: SUGESTAO_MENSAGENS.enviada } };
  }
}
```

`sugestao-insert-supabase.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SugestaoInsert, SugestaoLinhaInsert } from '@/lib/services/sugestao-registro';

export class SugestaoInsertSupabase implements SugestaoInsert {
  constructor(private readonly db: SupabaseClient) {}

  async inserir(linha: SugestaoLinhaInsert): Promise<void> {
    const { error } = await this.db.from('sugestoes_melhoria' as never).insert(linha as never);
    if (error) throw new Error(error.message);
  }
}
```

`src/app/api/public/sugestoes/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { SugestaoFotoRegra, type SugestaoFotoEntrada } from '@/domain/sugestoes/sugestao-foto-regra';
import { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SugestaoIpOrigem } from '@/domain/sugestoes/sugestao-ip';
import { SugestaoPublicaRateLimit } from '@/domain/sugestoes/sugestao-publica-rate-limit';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { SugestaoTextoRegra } from '@/domain/sugestoes/sugestao-texto-regra';
import { getAuthSecret } from '@/lib/auth/auth-secret';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { SugestaoAcessoStoreSupabase } from '@/lib/services/sugestao-acesso-store';
import { SugestaoEnviarAcao } from '@/lib/services/sugestao-enviar-acao';
import { SugestaoFotoStorage } from '@/lib/services/sugestao-foto-storage';
import { SugestaoInsertSupabase } from '@/lib/services/sugestao-insert-supabase';
import { SugestaoRegistro } from '@/lib/services/sugestao-registro';

async function lerFoto(form: FormData): Promise<SugestaoFotoEntrada | null> {
  const arquivo = form.get('foto');
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  return { type: arquivo.type, size: arquivo.size, bytes: new Uint8Array(await arquivo.arrayBuffer()) };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const db = createServiceRoleClient();
  const secret = getAuthSecret();
  const acao = new SugestaoEnviarAcao(
    new SugestaoPublicaRateLimit(new SugestaoAcessoStoreSupabase(db), secret),
    new SugestaoIdentificacaoToken(secret),
    new SugestaoTemaCatalogo(),
    new SugestaoTextoRegra(),
    new SugestaoFotoRegra(),
    new SugestaoRegistro(new SugestaoInsertSupabase(db), new SugestaoFotoStorage(db)),
  );
  const resposta = await acao.executar({
    token: String(form.get('token') ?? ''),
    tema: String(form.get('tema') ?? ''),
    texto: String(form.get('texto') ?? ''),
    foto: await lerFoto(form),
    ip: new SugestaoIpOrigem().extrair(request.headers),
  });
  return NextResponse.json(resposta.body, { status: resposta.status });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/services/sugestao-enviar-acao.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/sugestao-enviar-acao.ts src/lib/services/sugestao-enviar-acao.test.ts src/lib/services/sugestao-insert-supabase.ts src/app/api/public/sugestoes/route.ts
git commit -m "feat(sugestoes): recebe tema, texto e foto da sugestão"
```
