# Sugestões de melhoria — parte telas

Continuação de `2026-11-24-sugestoes-melhoria-acoes.md`. Tarefas 9 e 10. A lista interna é a tarefa 11 em `2026-11-24-sugestoes-melhoria-lista.md`.

### Task 9: Rota pública e menu oculto

**Files:**
- Modify: `src/lib/auth/interno-route-access-map.ts` (bloco público, junto de `/login`)
- Modify: `src/lib/auth/interno-route-access-map.test.ts`
- Create: `src/lib/navegacao-oculta.ts`
- Modify: `src/components/ConditionalNavigationClient.tsx`
- Test: `src/lib/navegacao-oculta.test.ts`

**Interfaces:**
- Consumes: `InternoRouteAccessMap.resolve`
- Produces: `/sugestoes` com `{ kind: 'public' }`. `/pessoas/sugestoes` continua `{ kind: 'modulo', modulo: 'interno_pessoas', minimo: 'ler' }` pelo prefixo `/pessoas`. `navegacaoOculta(pathname: string): boolean` é true em `/sugestoes`, `/login` e `/painel/forno`, e false em `/pessoas` e `/pessoas/sugestoes`.

- [ ] **Step 1: Write the failing test**

No teste do mapa, acrescente:

```ts
it('libera a sugestão pública e protege a lista', () => {
  expect(map.resolve('/sugestoes')).toEqual({ kind: 'public' });
  expect(map.resolve('/pessoas/sugestoes')).toEqual({
    kind: 'modulo',
    modulo: 'interno_pessoas',
    minimo: 'ler',
  });
});
```

`src/lib/navegacao-oculta.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { navegacaoOculta } from './navegacao-oculta';

describe('navegacaoOculta', () => {
  it('esconde login, TV e a página pública, e mantém a lista', () => {
    expect(navegacaoOculta('/sugestoes')).toBe(true);
    expect(navegacaoOculta('/login')).toBe(true);
    expect(navegacaoOculta('/painel/forno')).toBe(true);
    expect(navegacaoOculta('/pessoas')).toBe(false);
    expect(navegacaoOculta('/pessoas/sugestoes')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/interno-route-access-map.test.ts src/lib/navegacao-oculta.test.ts`
Expected: FAIL. `/sugestoes` hoje cai em `{ kind: 'app' }`. `navegacaoOculta` não existe.

- [ ] **Step 3: Write minimal implementation**

Em `ROUTE_RULES`, no bloco público, depois da regra de `/login`:

```ts
{ match: 'exact', path: '/sugestoes', requirement: { kind: 'public' } },
```

`src/lib/navegacao-oculta.ts` concentra os prefixos que hoje estão em `ConditionalNavigationClient` e inclui `/sugestoes`:

```ts
const PREFIXOS = [
  '/login',
  '/completar-email',
  '/sugestoes',
  '/painel/fermentacao',
  '/painel/forno',
  '/painel/embalagem',
];

export function navegacaoOculta(pathname: string): boolean {
  return PREFIXOS.some(
    (prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`),
  );
}
```

`ConditionalNavigationClient` apaga `AUTH_PATH_PREFIXES`, `TV_PATH_PREFIXES` e `pathHasPrefix`. O `hideNav` passa a ser `navegacaoOculta(pathname)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/interno-route-access-map.test.ts src/lib/navegacao-oculta.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/interno-route-access-map.ts src/lib/auth/interno-route-access-map.test.ts src/lib/navegacao-oculta.ts src/lib/navegacao-oculta.test.ts src/components/ConditionalNavigationClient.tsx
git commit -m "feat(sugestoes): abre /sugestoes sem login e sem menu"
```

---

### Task 10: Página pública

**Files:**
- Create: `src/app/sugestoes/page.tsx`
- Create: `src/features/sugestoes/SugestaoPublicaForm.tsx`

**Interfaces:**
- Consumes: `POST /api/public/sugestoes/identificar` com JSON `{ cpf }` e corpo `{ nome, token }` ou `{ mensagem }`. `POST /api/public/sugestoes` multipart `token`, `tema`, `texto`, `foto`. `SugestaoTemaCatalogo.opcoes`. `SUGESTAO_MENSAGENS`.
- Produces: página `/sugestoes` com título “Sugestão de melhoria”.

- [ ] **Step 1: Criar a página e o formulário**

`src/app/sugestoes/page.tsx`:

```tsx
import { SugestaoPublicaForm } from '@/features/sugestoes/SugestaoPublicaForm';

export const dynamic = 'force-dynamic';

export default function SugestoesPublicaPage() {
  return <SugestaoPublicaForm />;
}
```

`SugestaoPublicaForm` é client component. Estados: `cpf`, `nome`, `token`, `tema`, `texto`, `arquivo`, `mensagem`, `enviada`, `ocupado`.

- CPF: `Input` label “CPF”, `Button` size `lg` “Continuar”. Enquanto `ocupado`, os dois botões de ação ficam `disabled`.
- Resposta 200 com `nome` e `token`: guarda os dois e mostra “Você é {nome}?”. “Não sou esta pessoa” zera `nome` e `token` e volta ao CPF.
- Senão mostra `mensagem`.
- Com token: `select` dos `new SugestaoTemaCatalogo().opcoes()`, primeira opção vazia “Escolha o tema”; `textarea` “Sugestão”; `input type="file" accept="image/jpeg,image/png,image/webp"`; botão “Enviar”.
- Envio usa `FormData`. Sucesso: “Sugestão enviada.” e botão “Enviar outra”, que zera token, nome, tema, texto, arquivo e `enviada`.
- 401 limpa o token e volta ao CPF com a mensagem.
- Título `h1`: “Sugestão de melhoria”. Cartão `max-w-md`, borda e fundo de superfície, botões com altura de 44px (`size="lg"`).

```tsx
'use client';

import { useState } from 'react';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

const temas = new SugestaoTemaCatalogo().opcoes();

export function SugestaoPublicaForm() {
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [token, setToken] = useState('');
  const [tema, setTema] = useState('');
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [enviada, setEnviada] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function identificar() {
    setOcupado(true);
    setMensagem('');
    try {
      const resposta = await fetch('/api/public/sugestoes/identificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      });
      const corpo = await resposta.json() as { nome?: string; token?: string; mensagem?: string };
      if (resposta.ok && corpo.nome && corpo.token) {
        setNome(corpo.nome);
        setToken(corpo.token);
        return;
      }
      setMensagem(corpo.mensagem ?? SUGESTAO_MENSAGENS.falhaConsulta);
    } catch {
      setMensagem(SUGESTAO_MENSAGENS.falhaConsulta);
    } finally {
      setOcupado(false);
    }
  }

  function naoSouEu() {
    setNome('');
    setToken('');
    setMensagem('');
  }

  async function enviar() {
    setOcupado(true);
    setMensagem('');
    const form = new FormData();
    form.set('token', token);
    form.set('tema', tema);
    form.set('texto', texto);
    if (arquivo) form.set('foto', arquivo);
    try {
      const resposta = await fetch('/api/public/sugestoes', { method: 'POST', body: form });
      const corpo = await resposta.json() as { mensagem?: string };
      if (resposta.status === 401) {
        naoSouEu();
        setMensagem(corpo.mensagem ?? SUGESTAO_MENSAGENS.identificacaoExpirou);
        return;
      }
      if (!resposta.ok) {
        setMensagem(corpo.mensagem ?? SUGESTAO_MENSAGENS.falhaEnvio);
        return;
      }
      setEnviada(true);
    } catch {
      setMensagem(SUGESTAO_MENSAGENS.falhaEnvio);
    } finally {
      setOcupado(false);
    }
  }

  function outra() {
    setToken('');
    setNome('');
    setTema('');
    setTexto('');
    setArquivo(null);
    setEnviada(false);
    setMensagem('');
  }

  return (
    <Card className="mx-auto w-full max-w-md" padding="lg">
      <h1 className="text-2xl font-bold tracking-tight text-text-strong">Sugestão de melhoria</h1>
      {enviada ? <Enviada onOutra={outra} /> : null}
      {!enviada && !token ? <Cpf cpf={cpf} ocupado={ocupado} onCpf={setCpf} onSeguir={identificar} /> : null}
      {!enviada && token ? (
        <Envio
          nome={nome}
          tema={tema}
          texto={texto}
          ocupado={ocupado}
          onTema={setTema}
          onTexto={setTexto}
          onArquivo={setArquivo}
          onEnviar={enviar}
          onNaoSouEu={naoSouEu}
        />
      ) : null}
      {mensagem ? <p className="mt-4 text-sm text-red-700">{mensagem}</p> : null}
    </Card>
  );
}

function Enviada({ onOutra }: { onOutra: () => void }) {
  return (
    <div className="mt-6">
      <p className="text-sm text-text-strong">{SUGESTAO_MENSAGENS.enviada}</p>
      <Button className="mt-4" size="lg" type="button" onClick={onOutra}>Enviar outra</Button>
    </div>
  );
}

function Cpf(props: { cpf: string; ocupado: boolean; onCpf: (v: string) => void; onSeguir: () => void }) {
  return (
    <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); props.onSeguir(); }}>
      <Input label="CPF" inputMode="numeric" value={props.cpf} onChange={(e) => props.onCpf(e.target.value)} />
      <Button size="lg" type="submit" disabled={props.ocupado}>Continuar</Button>
    </form>
  );
}

function Envio(props: {
  nome: string; tema: string; texto: string; ocupado: boolean;
  onTema: (v: string) => void; onTexto: (v: string) => void;
  onArquivo: (f: File | null) => void; onEnviar: () => void; onNaoSouEu: () => void;
}) {
  return (
    <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); props.onEnviar(); }}>
      <p className="text-sm text-text-strong">Você é {props.nome}?</p>
      <Button size="lg" type="button" variant="secondary" onClick={props.onNaoSouEu}>Não sou esta pessoa</Button>
      <label className="text-sm font-medium text-stone-700">
        Tema
        <select className="mt-1.5 min-h-11 w-full rounded-xl border border-border-default px-3" value={props.tema} onChange={(e) => props.onTema(e.target.value)}>
          <option value="">Escolha o tema</option>
          {temas.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-stone-700">
        Sugestão
        <textarea className="mt-1.5 min-h-28 w-full rounded-xl border border-border-default px-3 py-2" value={props.texto} onChange={(e) => props.onTexto(e.target.value)} />
      </label>
      <label className="text-sm font-medium text-stone-700">
        Foto
        <input className="mt-1.5 block min-h-11 w-full" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => props.onArquivo(e.target.files?.[0] ?? null)} />
      </label>
      <Button size="lg" type="submit" disabled={props.ocupado}>Enviar</Button>
    </form>
  );
}
```

Não há teste de componente. A cobertura está nas ações.

- [ ] **Step 2: Commit**

```bash
git add src/app/sugestoes/page.tsx src/features/sugestoes/SugestaoPublicaForm.tsx
git commit -m "feat(sugestoes): abre o formulário público em dois passos"
```


A lista interna está na parte lista.
