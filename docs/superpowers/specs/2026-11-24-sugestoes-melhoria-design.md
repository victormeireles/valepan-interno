# Sugestões de melhoria — desenho

Data: 2026-11-24  
Status: aguardando revisão do stakeholder

## Objetivo

Um QR impresso fora do sistema aponta para uma página pública. O colaborador informa o CPF, confirma o nome e envia uma sugestão de melhoria. Quem tem Pessoas: Ler lê a lista no app, filtra por tema e vê quem enviou.

## Fora desta versão

Status, responsável, edição, exclusão na tela, tema cadastrável, campo de local, PIN, geração do QR no app, aviso por WhatsApp ou e-mail, lista de colaboradores na página pública e módulo novo de permissão.

## Fluxo público

A página é `/sugestoes`, título “Sugestão de melhoria”. Não pede login e não aparece no hub nem no menu. O botão de consultar e o de enviar ficam desabilitados enquanto o pedido está em andamento.

1. A pessoa digita o CPF.
2. CPF inválido: “CPF inválido.” O servidor não consulta o cadastro.
3. CPF válido: o servidor procura só `situacao = ativo` com esses 11 dígitos. Pontuação gravada no cadastro é ignorada. `cpf_verificado` não entra na regra.
4. Um ativo: a página mostra o nome. Se for a pessoa, segue. Se não for, volta ao CPF e descarta o token no navegador.
5. Nenhum ativo, ou mais de um ativo com o mesmo CPF: “Procure o RH para cadastrar.” A mesma frase vale para desligado, afastado, admissão prevista e CPF sem cadastro. A resposta não diz qual dos casos foi.
6. O formulário pede um tema, o texto e uma foto opcional.
7. Sucesso: “Sugestão enviada.” O botão de enviar outra volta ao CPF.

Temas fixos, rótulo e valor:

| Rótulo | Valor |
|---|---|
| Segurança | `seguranca` |
| Qualidade | `qualidade` |
| Organização | `organizacao` |
| Processos | `processos` |
| Eficiência | `eficiencia` |
| Segurança dos alimentos | `seguranca_alimentos` |
| Inovação | `inovacao` |

## Lista interna

A página é `/pessoas/sugestoes`. O prefixo `/pessoas` já exige `interno_pessoas` no nível `ler`. A página chama `requireInternoModulo('interno_pessoas', 'ler')` de novo.

A lista mostra as 200 sugestões mais novas do filtro atual: data e hora em `dd/MM/yyyy HH:mm`, fuso `America/Sao_Paulo`, nome vindo do cadastro, rótulo do tema, texto e a miniatura da foto quando houver. O filtro é “Todos” mais os sete temas. Sem status, sem edição e sem exclusão.

O hub ganha o item “Sugestões”, descrição “Melhorias enviadas pelo QR”, ícone `lightbulb`, módulo `interno_pessoas`. O menu Pessoas ganha o mesmo link, entre Extras e Visão geral.

Lista vazia: “Nenhuma sugestão ainda.” Se a URL assinada da foto falhar, a linha aparece sem imagem e o restante da lista segue.

## Arquitetura

O navegador da página pública só chama `/api/public/sugestoes`. Esse prefixo já é público no middleware. `/sugestoes` entra no mapa de rotas como pública, senão cai no fallback que exige login.

As duas rotas usam o cliente de service role.

`POST /api/public/sugestoes/identificar` recebe JSON `{ cpf }`. Um ativo: responde `{ nome, token }` e não devolve o id do colaborador. Os outros casos válidos de CPF: `{ mensagem: "Procure o RH para cadastrar." }`.

O token dura 10 minutos. É HMAC-SHA256 com o segredo de auth já usado no app. O payload leva o id do colaborador, o vencimento e o propósito `sugestao-melhoria`.

`POST /api/public/sugestoes` recebe multipart: `token`, `tema`, `texto` e o arquivo `foto` opcional. O servidor confere o token, grava `colaborador_id` e sobe a foto. A sugestão não guarda CPF.

A foto sobe antes da linha. Se o insert falhar, o arquivo é apagado. Se o upload falhar, a linha não nasce.

Limite por IP, usando o primeiro salto de `x-forwarded-for` ou o endereço da conexão. Sem IP, entra no balde `desconhecido`. O banco guarda o hash SHA-256 do IP com o segredo de auth, não o IP cru.

A janela é deslizante: contam os registros daquele hash e daquele tipo com `criado_em` nos últimos 10 minutos.

- Identificar: 10 pedidos por IP na janela.
- Enviar: 5 pedidos por IP na janela.

Todo pedido apaga registros de acesso com mais de 1 dia, conta a janela e só então segue. Dentro do limite, grava o acesso e continua. Acima do limite responde 429 com “Muitas tentativas. Espere um pouco e tente de novo.”, não grava acesso novo e não consulta nem grava sugestão. Uma corrida entre pedidos pode deixar passar alguns a mais.

A lista interna lê com service role, depois da checagem de módulo, e pede URL assinada com validade de 1 hora.

## Dados

Tabela `sugestoes_melhoria`:

- `id` uuid, chave primária, `gen_random_uuid()`
- `colaborador_id` uuid obrigatório, referência a `pessoas_colaboradores(id)` com `ON DELETE RESTRICT`
- `tema` text obrigatório, check nos sete valores
- `texto` text obrigatório, de 10 a 2.000 caracteres já com `btrim`
- `foto_path` text nulo
- `criado_em` timestamptz obrigatório, default `now()`

Índices em `criado_em desc` e em `tema`. Sem coluna de CPF, status ou responsável.

Tabela `sugestoes_publica_acessos`, só para o limite:

- `id` uuid
- `ip_hash` text obrigatório
- `tipo` text obrigatório, `identificar` ou `enviar`
- `criado_em` timestamptz obrigatório, default `now()`

Índice em `(ip_hash, tipo, criado_em desc)`.

RLS ligada nas duas. Em `sugestoes_melhoria`: `SELECT` para `authenticated` com `USING (true)`; `UPDATE` e `DELETE` só com `(SELECT is_admin())`. Sem policy de `INSERT` para `authenticated` nem para `anon`. Em `sugestoes_publica_acessos`: nenhuma policy para `authenticated` nem para `anon`. A service role contorna o RLS. A tela desta versão não atualiza nem apaga.

Bucket privado `sugestoes-melhoria`, não público, limite de 5.242.880 bytes, MIME `image/jpeg`, `image/png` e `image/webp`. Sem policy de storage para anônimo ou autenticado. A linha guarda só o caminho.

Uma migration cria as tabelas, os índices, o RLS, as policies e o bucket.

## Erros

| Caso | Resposta |
|---|---|
| CPF inválido | 400, “CPF inválido.” |
| CPF válido sem um único ativo | 200, “Procure o RH para cadastrar.” |
| Limite de IP | 429, “Muitas tentativas. Espere um pouco e tente de novo.” |
| Falha ao consultar ou gravar | 500, “Não foi possível consultar agora. Tente de novo.” no identificar; “Não foi possível enviar agora. Tente de novo.” no enviar |
| Token ausente, inválido ou vencido | 401, “A identificação expirou. Informe o CPF de novo.” A página volta ao CPF |
| Tema fora da lista | 400, “Escolha um tema.” |
| Texto com menos de 10 caracteres | 400, “Escreva pelo menos 10 caracteres.” |
| Texto com mais de 2.000 caracteres | 400, “O texto pode ter até 2.000 caracteres.” |
| Foto em outro tipo ou acima de 5 MB | 400, “Use uma foto de até 5 MB.” Nada é gravado |

O texto é gravado já com as pontas cortadas. Foto ausente é válida.

## Peças

Cada uma faz uma coisa:

- `SugestaoTemaCatalogo` — os sete temas e rótulos
- `SugestaoCpfConsulta` — valida o CPF com `CpfVerificador` e classifica em inválido, identificado ou RH
- `SugestaoIdentificacaoToken` — assina e confere o token
- `SugestaoTextoRegra` — corte e tamanho
- `SugestaoFotoRegra` — tipo e tamanho
- `SugestaoPublicaRateLimit` — conta e registra o hash do IP
- `SugestaoFotoStorage` — sobe, apaga e assina
- `SugestaoRegistro` — insere a linha e desfaz a foto se o insert falhar
- rotas em `/api/public/sugestoes`
- página pública em dois passos
- página `/pessoas/sugestoes` com o filtro

## Testes

Domínio, sem banco:

- CPF com dígito errado não consulta.
- Zero ativos, dois ativos, ou o mesmo CPF só em afastado, desligado ou admissão prevista classificam como RH.
- Um ativo classifica como identificado, com o id desse colaborador.
- Texto com 9, 10, 2.000 e 2.001 caracteres, depois do corte.
- Os sete temas passam; outro valor falha.
- Token válido confere; vencido, adulterado ou com outro propósito falha.
- jpeg, png e webp até 5 MB passam; gif e arquivo acima de 5 MB falham; foto ausente passa.

Rotas, com cliente falso:

- Identificar devolve o mesmo corpo para zero e para vários ativos, sem nome e sem token.
- Identificar de um ativo devolve nome e token, sem o id.
- Enviar com token vencido, tema inválido ou texto inválido não insere.
- Se o insert lançar, o arquivo sobe e é apagado.
- O 11º identificar e o 6º enviar na janela devolvem 429 e não consultam nem inserem.

Mapa de rotas: `/sugestoes` é pública. `/pessoas/sugestoes` resolve `interno_pessoas` / `ler`.

A migration é o contrato do RLS e do bucket descritos em Dados.
