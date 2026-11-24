# Sugestões de melhoria — parte API

Continuação de `2026-11-24-sugestoes-melhoria.md`. Tarefas 4 a 6. As ações HTTP estão em `2026-11-24-sugestoes-melhoria-acoes.md`. As telas estão em `2026-11-24-sugestoes-melhoria-telas.md`.

### Task 4: Migration

**Files:**
- Create: `supabase/migrations/20261124180000_sugestoes_melhoria.sql`

**Interfaces:**
- Consumes: `public.pessoas_colaboradores(id)`, `public.is_admin()`
- Produces: tabelas `sugestoes_melhoria` e `sugestoes_publica_acessos`, RPC `public.sugestoes_ativos_por_cpf(digitos text)` devolvendo `id, nome` só de `situacao = ativo`, bucket privado `sugestoes-melhoria`

- [ ] **Step 1: Criar a migration.** Não há teste de banco: este SQL é o contrato.

```sql
CREATE TABLE public.sugestoes_melhoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.pessoas_colaboradores(id) ON DELETE RESTRICT,
  tema text NOT NULL CHECK (tema IN (
    'seguranca', 'qualidade', 'organizacao', 'processos',
    'eficiencia', 'seguranca_alimentos', 'inovacao'
  )),
  texto text NOT NULL,
  foto_path text NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sugestoes_melhoria_texto_chk CHECK (
    char_length(texto) BETWEEN 10 AND 2000 AND texto = btrim(texto)
  )
);

CREATE INDEX sugestoes_melhoria_criado_em_idx ON public.sugestoes_melhoria (criado_em DESC);
CREATE INDEX sugestoes_melhoria_tema_idx ON public.sugestoes_melhoria (tema);

CREATE TABLE public.sugestoes_publica_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('identificar', 'enviar')),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sugestoes_publica_acessos_janela_idx
  ON public.sugestoes_publica_acessos (ip_hash, tipo, criado_em DESC);

ALTER TABLE public.sugestoes_melhoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugestoes_publica_acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY sugestoes_melhoria_select ON public.sugestoes_melhoria
  FOR SELECT TO authenticated USING (true);
CREATE POLICY sugestoes_melhoria_update ON public.sugestoes_melhoria
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY sugestoes_melhoria_delete ON public.sugestoes_melhoria
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

CREATE FUNCTION public.sugestoes_ativos_por_cpf(digitos text)
RETURNS TABLE (id uuid, nome text)
LANGUAGE sql STABLE
AS $$
  SELECT c.id, c.nome FROM public.pessoas_colaboradores c
  WHERE c.situacao = 'ativo'
    AND regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') = digitos;
$$;

REVOKE ALL ON FUNCTION public.sugestoes_ativos_por_cpf(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sugestoes_ativos_por_cpf(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sugestoes_ativos_por_cpf(text) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sugestoes-melhoria', 'sugestoes-melhoria', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;
```

Não criar policy de INSERT. Não criar policy em `sugestoes_publica_acessos`. Não criar policy de storage.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20261124180000_sugestoes_melhoria.sql
git commit -m "feat(sugestoes): cria tabelas, RLS e bucket da sugestão"
```

---

### Task 5: Limite por IP

**Files:**
- Create: `src/domain/sugestoes/sugestao-ip.ts`
- Create: `src/domain/sugestoes/sugestao-publica-rate-limit.ts`
- Test: `src/domain/sugestoes/sugestao-publica-rate-limit.test.ts`

**Interfaces:**
- Consumes: nada das tarefas anteriores
- Produces: `SugestaoAcessoTipo` = `'identificar' | 'enviar'`; `SugestaoAcessoStore` com `apagarAnterioresA(instante: Date)`, `contar(ipHash, tipo, desde)`, `registrar(ipHash, tipo)`; `SugestaoIpOrigem.extrair(headers: Headers): string | null`; `SugestaoIpHash.calcular(secret: string, ip: string | null): string`; `SugestaoPublicaRateLimit.consumir(ip: string | null, tipo: SugestaoAcessoTipo): Promise<'ok' | 'limite'>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { SugestaoIpHash, SugestaoIpOrigem } from './sugestao-ip';
import { SugestaoPublicaRateLimit, type SugestaoAcessoStore, type SugestaoAcessoTipo } from './sugestao-publica-rate-limit';

class Memoria implements SugestaoAcessoStore {
  linhas: { ipHash: string; tipo: SugestaoAcessoTipo; em: Date }[] = [];
  constructor(private readonly agora: Date) {}
  async apagarAnterioresA(instante: Date) {
    this.linhas = this.linhas.filter((linha) => linha.em >= instante);
  }
  async contar(ipHash: string, tipo: SugestaoAcessoTipo, desde: Date) {
    return this.linhas.filter((linha) => linha.ipHash === ipHash && linha.tipo === tipo && linha.em >= desde).length;
  }
  async registrar(ipHash: string, tipo: SugestaoAcessoTipo) {
    this.linhas.push({ ipHash, tipo, em: this.agora });
  }
}

describe('limite público', () => {
  it('lê o primeiro IP e junta o vazio no balde desconhecido', () => {
    const headers = new Headers({ 'x-forwarded-for': ' 203.0.113.5 , 10.0.0.1' });
    expect(new SugestaoIpOrigem().extrair(headers)).toBe('203.0.113.5');
    expect(new SugestaoIpOrigem().extrair(new Headers())).toBeNull();
    const hash = new SugestaoIpHash();
    expect(hash.calcular('segredo', null)).toBe(hash.calcular('segredo', '   '));
    expect(hash.calcular('segredo', null)).not.toBe(hash.calcular('segredo', '203.0.113.5'));
  });

  it('libera 10 identificar e 5 enviar e bloqueia o seguinte sem registrar', async () => {
    const agora = new Date('2026-11-24T12:00:00.000Z');
    const store = new Memoria(agora);
    const limite = new SugestaoPublicaRateLimit(store, 'segredo', () => agora);
    for (let i = 0; i < 10; i += 1) expect(await limite.consumir('1.1.1.1', 'identificar')).toBe('ok');
    expect(await limite.consumir('1.1.1.1', 'identificar')).toBe('limite');
    for (let i = 0; i < 5; i += 1) expect(await limite.consumir('1.1.1.1', 'enviar')).toBe('ok');
    expect(await limite.consumir('1.1.1.1', 'enviar')).toBe('limite');
    expect(store.linhas.filter((linha) => linha.tipo === 'identificar')).toHaveLength(10);
    expect(store.linhas.filter((linha) => linha.tipo === 'enviar')).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/sugestoes/sugestao-publica-rate-limit.test.ts`
Expected: FAIL, cannot find module

- [ ] **Step 3: Write minimal implementation**

`sugestao-ip.ts`:

```ts
import { createHash } from 'crypto';

export class SugestaoIpOrigem {
  extrair(headers: Headers): string | null {
    const bruto = headers.get('x-forwarded-for');
    if (!bruto) return null;
    const primeiro = bruto.split(',')[0]?.trim() ?? '';
    return primeiro || null;
  }
}

export class SugestaoIpHash {
  calcular(secret: string, ip: string | null): string {
    const origem = ip && ip.trim() ? ip.trim() : 'desconhecido';
    return createHash('sha256').update(`${secret}\n${origem}`).digest('hex');
  }
}
```

`sugestao-publica-rate-limit.ts`:

```ts
import { SugestaoIpHash } from './sugestao-ip';

export type SugestaoAcessoTipo = 'identificar' | 'enviar';

export interface SugestaoAcessoStore {
  apagarAnterioresA(instante: Date): Promise<void>;
  contar(ipHash: string, tipo: SugestaoAcessoTipo, desde: Date): Promise<number>;
  registrar(ipHash: string, tipo: SugestaoAcessoTipo): Promise<void>;
}

const JANELA_MS = 10 * 60 * 1000;
const RETENCAO_MS = 24 * 60 * 60 * 1000;
const TETO: Record<SugestaoAcessoTipo, number> = { identificar: 10, enviar: 5 };

export class SugestaoPublicaRateLimit {
  private readonly hash = new SugestaoIpHash();

  constructor(
    private readonly store: SugestaoAcessoStore,
    private readonly secret: string,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async consumir(ip: string | null, tipo: SugestaoAcessoTipo): Promise<'ok' | 'limite'> {
    const momento = this.agora();
    await this.store.apagarAnterioresA(new Date(momento.getTime() - RETENCAO_MS));
    const ipHash = this.hash.calcular(this.secret, ip);
    const total = await this.store.contar(ipHash, tipo, new Date(momento.getTime() - JANELA_MS));
    if (total >= TETO[tipo]) return 'limite';
    await this.store.registrar(ipHash, tipo);
    return 'ok';
  }
}
```

O store de produção grava `criado_em` no banco com `now()`. O fake de teste grava o relógio injetado.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/sugestoes/sugestao-publica-rate-limit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/sugestoes/sugestao-ip.ts src/domain/sugestoes/sugestao-publica-rate-limit.ts src/domain/sugestoes/sugestao-publica-rate-limit.test.ts
git commit -m "feat(sugestoes): limita consultas e envios por IP"
```

---

### Task 6: Foto e registro

**Files:**
- Create: `src/lib/services/sugestao-foto-storage.ts`
- Create: `src/lib/services/sugestao-registro.ts`
- Test: `src/lib/services/sugestao-registro.test.ts`

**Interfaces:**
- Consumes: `SugestaoTema` da Task 1
- Produces: `SugestaoFotoArquivo.upload(bytes, type): Promise<string>` e `remove(paths: string[])`; `SugestaoFotoStorage` no bucket `sugestoes-melhoria`, URL assinada por 3600s; `SugestaoRegistro.gravar({ colaboradorId, tema, texto, foto })`. Se o insert falhar e havia foto, chama `remove` com o caminho.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { SugestaoRegistro, type SugestaoFotoArquivo, type SugestaoInsert } from './sugestao-registro';

class Fotos implements SugestaoFotoArquivo {
  apagou: string[] = [];
  async upload(): Promise<string> { return 'foto.jpg'; }
  async remove(paths: string[]) { this.apagou.push(...paths); }
}

function banco(falha: boolean): SugestaoInsert & { linhas: unknown[] } {
  return {
    linhas: [],
    async inserir(linha) {
      if (falha) throw new Error('insert');
      this.linhas.push(linha);
    },
  };
}

describe('SugestaoRegistro', () => {
  const foto = { type: 'image/jpeg', size: 1, bytes: new Uint8Array([1]) };

  it('grava sem foto', async () => {
    const fotos = new Fotos();
    const db = banco(false);
    await new SugestaoRegistro(db, fotos).gravar({
      colaboradorId: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto: null,
    });
    expect(db.linhas).toEqual([{
      colaborador_id: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto_path: null,
    }]);
    expect(fotos.apagou).toEqual([]);
  });

  it('apaga a foto se o insert falhar', async () => {
    const fotos = new Fotos();
    await expect(new SugestaoRegistro(banco(true), fotos).gravar({
      colaboradorId: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto,
    })).rejects.toThrow('insert');
    expect(fotos.apagou).toEqual(['foto.jpg']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/services/sugestao-registro.test.ts`
Expected: FAIL, cannot find module

- [ ] **Step 3: Write minimal implementation**

`sugestao-registro.ts`:

```ts
import type { SugestaoTema } from '@/domain/sugestoes/sugestao-tema-catalogo';
import type { SugestaoFotoEntrada } from '@/domain/sugestoes/sugestao-foto-regra';

export interface SugestaoFotoArquivo {
  upload(bytes: Uint8Array, type: string): Promise<string>;
  remove(paths: string[]): Promise<void>;
}

export type SugestaoLinhaInsert = {
  colaborador_id: string;
  tema: SugestaoTema;
  texto: string;
  foto_path: string | null;
};

export interface SugestaoInsert {
  inserir(linha: SugestaoLinhaInsert): Promise<void>;
}

export class SugestaoRegistro {
  constructor(
    private readonly db: SugestaoInsert,
    private readonly fotos: SugestaoFotoArquivo,
  ) {}

  async gravar(entrada: {
    colaboradorId: string;
    tema: SugestaoTema;
    texto: string;
    foto: SugestaoFotoEntrada | null;
  }): Promise<void> {
    const path = entrada.foto
      ? await this.fotos.upload(entrada.foto.bytes, entrada.foto.type)
      : null;
    try {
      await this.db.inserir({
        colaborador_id: entrada.colaboradorId,
        tema: entrada.tema,
        texto: entrada.texto,
        foto_path: path,
      });
    } catch (error) {
      if (path) await this.fotos.remove([path]);
      throw error;
    }
  }
}
```

`sugestao-foto-storage.ts` implementa `SugestaoFotoArquivo` e acrescenta `signedUrls`. O cliente padrão é `supabaseClientFactory.createServiceRoleClient()`. Use `as never` no `from`, no mesmo espírito das actions de pessoas, porque a tabela nova ainda não está em `Database`.

```ts
import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const BUCKET = 'sugestoes-melhoria';
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class SugestaoFotoStorage {
  constructor(private readonly client?: SupabaseClient) {}

  private get db(): SupabaseClient {
    return this.client ?? supabaseClientFactory.createServiceRoleClient();
  }

  async upload(bytes: Uint8Array, type: string): Promise<string> {
    const path = `${randomUUID()}.${EXT[type] ?? 'bin'}`;
    const { error } = await this.db.storage.from(BUCKET).upload(path, bytes, {
      contentType: type,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return path;
  }

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await this.db.storage.from(BUCKET).remove(paths);
    if (error) throw new Error(error.message);
  }

  async signedUrls(paths: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (paths.length === 0) return map;
    const { data, error } = await this.db.storage.from(BUCKET).createSignedUrls(paths, 3600);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
    }
    return map;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/services/sugestao-registro.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/sugestao-foto-storage.ts src/lib/services/sugestao-registro.ts src/lib/services/sugestao-registro.test.ts
git commit -m "feat(sugestoes): grava a sugestão e desfaz a foto se o insert falhar"
```

As ações de identificar e enviar estão na parte ações.
