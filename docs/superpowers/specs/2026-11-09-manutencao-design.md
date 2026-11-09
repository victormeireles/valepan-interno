# Módulo de manutenção — desenho

Data: 2026-11-09  
Status: aguardando revisão do stakeholder

## Objetivo

Concentrar a manutenção dos equipamentos num módulo do app interno: máquinas por setor operacional, peças com estoque e custo médio, ordens corretivas e preventivas na mesma fila, e indicadores de hora parada, hora de execução e real gasto em peças.

O contrato das cinco fatias fica neste documento. Cada fatia tem o próprio plano de implementação e entrega uma parte usável.

## Fora desta versão

Real de hora de trabalho, botão de início, horímetro, aviso por WhatsApp ou push, foto, editar ordem finalizada, vínculo com o colaborador de Pessoas, compra de peça, mais de um almoxarifado e máquina composta por outras.

Devolver uma ordem recebida apaga o executor e o horário de Recebi. Não há histórico de devoluções.

Remover um plano preventivo inativa. Não há restaurar. O plano some da lista. A ordem já gerada permanece.

## Acesso

Dois módulos novos, no grupo novo `manutencao`, rótulo "Manutenção". `grupo_ordem` é o maior `grupo_ordem` já usado por `aplicativo = interno`, mais um. Os dois entram em `src/lib/auth/interno-modulos-catalog.ts` e em `public.modulos` na mesma migration. O perfil continua sendo atribuído onde já é hoje. Este app não cria usuário nem perfil.

O dono do sistema passa nos dois módulos, como já acontece em `InternoAccessManager`. Administrar vale como ler e editar.

| Ação | Solicitação ler | Solicitação editar | Manutenção ler | Manutenção editar | Manutenção administrar |
|---|---|---|---|---|---|
| Ver máquinas e ordens | setores marcados | setores marcados | todos | todos | todos |
| Abrir ordem corretiva | | setores marcados | | todos | todos |
| Cancelar corretiva aberta | | setores marcados | | sim | sim, com motivo |
| Cancelar preventiva aberta | | | | sim | sim, com motivo |
| Acompanhar status, quem recebeu e conclusão | setores marcados | setores marcados | todos | todos | todos |
| Recebi | | | | sim | sim |
| Devolver para a fila | | | | a que recebeu | qualquer recebida |
| Finalizar | | | | a que recebeu | qualquer recebida |
| Ver estoque, peças, preventiva, horas e R$ | | | sim | sim | sim |
| Lançar estoque e plano preventivo | | | | sim | sim |
| Cadastrar máquina e peça | | | | | sim |
| Cancelar ordem já recebida | | | | | sim, com motivo |

Quem lê a manutenção vê todos os setores operacionais ativos e não abre ordem. Quem edita ou administra abre corretiva em qualquer um deles. A manutenção não usa a lista de setores.

A lista fica em `manutencao_usuario_setores`. A tela Solicitantes, só para quem administra a manutenção, mostra os usuários que já têm `interno_manutencao_solicitacao` num perfil ativo e grava os setores operacionais ativos. Solicitante sem setor válido entra no módulo e vê a lista vazia, com o aviso "Nenhum setor liberado." Preço e saldo não aparecem para a solicitação.

Setor que deixe de ser operacional ativo continua na lista gravada e deixa de valer na leitura e na abertura.

## Dados

Oito tabelas novas. RLS ligado em todas. Não há policy de DELETE: máquina, peça, movimento e ordem não se apagam. Plano se inativa. As policies de leitura e escrita usam `(SELECT auth_tem_modulo(...))` e `(SELECT is_admin())`. O corte por setor na solicitação entra na policy de leitura de máquina e de ordem.

As ações de servidor checam módulo, nível e setor e gravam com o cliente de service role, no mesmo padrão de Pessoas. A transição de status da ordem fica na ação, não só na policy. Service role não substitui a checagem da ação.

Nada aqui altera insumos, ordens de produção ou pessoas. O único vínculo externo é `pessoas_setores`.

### Máquina — `manutencao_maquinas`

Código, nome, setor e observação opcional. Código único, comparado sem diferença de maiúsculas e sem espaço nas pontas. Uma máquina tem um setor. O setor gravado na máquina precisa estar operacional e ativo.

Ordem nova e plano novo só em máquina ativa. Inativar a máquina não mexe na ordem aberta. O job da preventiva não gera ordem de máquina inativa. Trocar o setor vale para a ordem seguinte. A ordem antiga guarda o setor da abertura.

### Peça — `manutencao_pecas`

Código, nome e unidade. A unidade padrão é `UN`. Código único, com a mesma regra da máquina. `saldo` é `numeric(14,3)`, começa em zero e pode ficar negativo. `custo_medio_centavos` é inteiro e fica nulo até a primeira entrada.

Inativar a peça tira ela da escolha de uma finalização nova. O saldo que já existe permanece. A linha já gravada na ordem permanece.

### Movimento — `manutencao_estoque_movimentos`

Tipos: `entrada`, `saida_manual`, `consumo_os`. Quantidade sempre maior que zero, até 3 casas. O movimento não se edita.

A entrada exige preço unitário em centavos, zero ou mais, e um usuário. A saída manual exige motivo preenchido e um usuário, e não exige máquina. O consumo exige a ordem e nasce só na finalização. O preço unitário gravado no consumo e na saída é o custo médio da hora. Se a peça ainda não tem custo médio, esse preço é zero.

### Ordem — `manutencao_ordens`

Número inteiro único, mostrado como `OS-` e cinco dígitos (`OS-00001`). Corretiva e preventiva compartilham a sequência.

Tipo `corretiva` ou `preventiva`. A corretiva exige urgência (`maquina_parou`, `trabalhando_com_problema`, `oferecendo_risco`) e tipo de problema (`eletrico`, `mecanico`, `ajuste_parametro`). A preventiva deixa os dois nulos e aponta para o plano. A descrição é obrigatória nos dois tipos.

Status: `aberta`, `recebida`, `finalizada`, `cancelada`.

A abertura grava autor, horário e o setor da máquina naquele momento. Na preventiva gerada pelo job o autor fica nulo. Recebida exige quem recebeu e o horário. Finalizada exige início, fim e serviços executados. O fim é posterior ao início. Cancelada exige quem cancelou e o horário. O motivo só é obrigatório quando quem administra cancela.

`custo_pecas_centavos` é preenchido na finalização com a soma das linhas. Zero se não houve peça.

Várias corretivas podem estar abertas na mesma máquina. A trava de não duplicar vale por plano, não por máquina.

### Peças da ordem — `manutencao_ordem_pecas`

Uma linha por peça na ordem. Quantidade, custo unitário da hora e custo total da linha. O total é quantidade vezes o custo unitário, arredondado ao centavo mais próximo, com empate para cima. Cada linha corresponde a um movimento `consumo_os`.

### Ajudantes — `manutencao_ordem_ajudantes`

Usuário com manutenção editar ou administrar, além de quem recebeu. Quem só lê a manutenção, ou só tem solicitação, não entra. A lista pode ser vazia.

### Plano — `manutencao_planos`

Máquina, descrição, ativo e a próxima data. Na criação, a primeira data é hoje ou um dia futuro, no calendário de `America/Sao_Paulo`. Frequência:

- `a_cada_n_dias`: intervalo inteiro de no mínimo 1. A data âncora é a primeira data escolhida e não muda quando o plano é editado só na descrição.
- `semanal`: dia da semana de 1 a 7, segunda a domingo. A primeira data cai nesse dia.
- `mensal`: dia do mês de 1 a 28. A primeira data cai nesse dia.

### Setores do solicitante — `manutencao_usuario_setores`

Par único de usuário e setor. Na gravação o setor é operacional e ativo.

## Estoque e custo

O saldo e o custo médio da peça mudam na mesma transação do movimento.

O custo médio só muda na entrada. Com saldo anterior maior que zero, a conta é a média ponderada entre o saldo valorizado e a entrada, arredondada ao centavo mais próximo, com empate para cima. Com saldo anterior zero ou negativo, o custo médio passa a ser o preço dessa entrada. Saída e consumo não mudam o custo médio.

Consumo e saída usam o custo médio vigente. Ordem já finalizada não é recalculada. Peça consumida antes da primeira entrada fica com custo zero nessa ordem.

O valor mostrado no saldo é saldo vezes custo médio, em centavos, com o mesmo arredondamento. Sem custo médio, o valor é zero. Saldo negativo aparece em destaque, com valor negativo.

## Fluxo da corretiva

Não há botão de início.

**Abrir.** Solicitação editar, nos setores marcados, ou manutenção editar. Máquina ativa de um setor permitido, urgência, tipo de problema e descrição. A ordem nasce aberta.

**Recebi.** Manutenção editar. Grava quem executa e o horário e passa para recebida. A atualização só ocorre se o status ainda é aberta. O segundo Recebi, inclusive simultâneo, não grava e responde "Já recebida por {nome}".

**Devolver.** Quem recebeu, ou quem administra a manutenção, devolve uma recebida para aberta e limpa executor e horário.

**Finalizar.** Quem recebeu, ou quem administra. O formulário abre com início no horário do Recebi e fim em agora. Os dois podem ser alterados. O início não fica antes da abertura. O fim é depois do início e não fica no futuro. Os horários são comparados em `America/Sao_Paulo`. Serviços executados são obrigatórios. Ajudantes são opcionais. Cada peça aparece numa linha. Escolher de novo a mesma peça soma na quantidade. Quantidade maior que zero, até 3 casas. Peça inativa não entra na lista. A baixa, as linhas, o custo e o status nascem na mesma transação. Se a gravação falha, o saldo não muda. Saldo negativo conclui e a mensagem lista as peças que ficaram em falta. A ordem finalizada não se edita. Ajuste posterior é entrada ou saída manual.

**Cancelar.** Solicitação editar cancela corretiva aberta de um setor marcado, sem motivo. Manutenção editar cancela qualquer ordem aberta, sem motivo. Administrar cancela aberta ou recebida e o motivo é obrigatório. Finalizada não cancela. O solicitante não cancela preventiva.

**Tempo.** Execução é a hora de fim menos a hora de início. Parada só existe na urgência `maquina_parou`, da abertura até a hora de fim informada. Nas outras urgências a parada é zero. Os dois tempos ficam em horas. Não há taxa de mão de obra.

## Preventiva

Manutenção editar cria, edita e remove. Remover põe `ativo` em falso.

Editar descrição não mexe na próxima data nem na ordem já gerada. Editar frequência, dia ou intervalo recalcula a próxima data para o encaixe seguinte, estritamente depois de hoje, em `America/Sao_Paulo`. Ao passar para a cada N dias, a âncora passa a ser essa próxima data. Editar a máquina vale para a ordem que ainda vai nascer. A ordem aberta continua na máquina anterior.

O job `manutencao-gerar-preventivas` roda em `10 3 * * *` (00:10 em São Paulo), em função `SECURITY DEFINER`, no mesmo modelo de `pessoas_efetivar_admissoes`. O cron não tem usuário.

Para cada plano ativo de máquina ativa com `proxima_em` menor ou igual a hoje: se já existe ordem daquele plano em aberta ou recebida, não cria outra e não muda a data. Se não existe, cria uma ordem preventiva, sem urgência e sem tipo de problema, com a descrição do plano, autor nulo e o setor atual da máquina. Em seguida grava a próxima data estritamente depois de hoje:

- a cada N dias: a menor data igual à âncora mais um múltiplo de N e maior que hoje;
- semanal: o próximo dia da semana escolhido;
- mensal: o próximo dia do mês escolhido.

Datas vencidas não viram uma pilha de ordens. O plano entra na fila na próxima execução do job em que a data já chegou. Criado depois das 00:10 com data de hoje, espera a madrugada seguinte.

## Telas

Seção nova "Manutenção" no início. O solicitante vê a fila e, se edita, Nova ordem. O restante só aparece para manutenção.

Rotas:

- `/manutencao` — fila. Leitura de qualquer um dos dois módulos.
- `/manutencao/nova` — abertura da corretiva.
- `/manutencao/ordens/[numero]` — detalhe.
- `/manutencao/maquinas` — manutenção ler. Gravar é administrar.
- `/manutencao/pecas` — manutenção ler. Movimentar é editar.
- `/manutencao/preventiva` — manutenção ler. Gravar é editar.
- `/manutencao/indicadores` — manutenção ler.
- `/manutencao/solicitantes` — manutenção administrar.

A fila é a tela do dia, no celular. A manutenção e o solicitante caem em abertas e recebidas. O solicitante só vê os setores marcados. A ordem com máquina parada vem primeiro, depois a que oferece risco, depois a que trabalha com problema, depois a preventiva. Dentro do grupo, a mais antiga primeiro. A linha mostra número, máquina, setor, urgência, tipo e status. Se já foi recebida, mostra quem está com ela. Máquina parada em vermelho. Oferecendo risco em âmbar.

A abertura pede máquina, urgência, tipo de problema e descrição, com alvos de toque de no mínimo 44 px.

O detalhe mostra a linha do tempo: aberta, recebida, finalizada. O solicitante vê status, quem recebeu, a conclusão e o nome e a quantidade das peças. Não vê valor. Ordem fora do setor dele responde como sem permissão. Recebi, devolver, finalizar e cancelar aparecem conforme a permissão. Finalizada não oferece edição.

Máquinas: lista por setor. Cadastrar, editar e inativar é administrar.

Peças: código, nome, unidade, saldo, custo médio e valor do saldo. Entrada pede quantidade e preço. Saída pede quantidade e motivo.

Preventiva: máquina, frequência, próxima data e se já existe ordem aberta ou recebida daquele plano.

Indicadores: período com o mês civil atual de `America/Sao_Paulo` como padrão. Por máquina, nas ordens finalizadas cuja hora de fim cai no período: horas paradas, horas de execução e real de peças. A tela mostra horas e minutos. A parada em andamento, ordem aberta ou recebida com máquina parada, aparece à parte, contada da abertura até agora, e só entra no total do período quando a ordem fecha. Saída manual não entra na máquina. A soma do custo dessas saídas no período aparece numa linha "Ajustes", sem máquina. Entrada de estoque não entra no real gasto.

Solicitantes: quem tem o módulo de solicitação e os setores operacionais ativos marcados.

O texto da interface é pt-BR, operacional. Ícones são Material Icons. Quantidade, hora e real usam dígitos tabulares.

## Falhas

Máquina inativa, setor fora da lista ou campo obrigatório vazio não grava. Plano com intervalo menor que 1, dia do mês acima de 28, dia da semana fora de 1 a 7 ou máquina inativa não grava.

Finalizar recusa fim antes do início, fim no futuro, início antes da abertura, serviço vazio e quantidade zero. Cancelar finalizada não muda a ordem. Solicitante cancelar preventiva não muda a ordem. Devolver ou finalizar ordem de outra pessoa, sem ser quem administra, não muda a ordem.

Quem não tem o módulo é enviado para `/?erro=sem-permissao`, como nas rotas atuais.

## Prova

Testes de domínio:

- custo médio com saldo positivo, zero e negativo, inclusive o arredondamento do empate;
- consumo antes da primeira entrada fica com custo zero e não recalcula a ordem depois da entrada;
- parada só em máquina parada; nas outras urgências a parada é zero;
- horas de execução iguais ao fim menos o início;
- ordem da fila;
- próxima data dos três tipos de frequência, inclusive quando a data já passou;
- não cria outra ordem do plano se existe aberta ou recebida.

Testes de acesso:

- solicitante lê e abre só nos setores marcados;
- solicitante sem setor vê a lista vazia;
- manutenção lê todos os setores;
- solicitante não cancela preventiva e não vê valor;
- editar finaliza e devolve só a ordem que recebeu;
- administrar finaliza, devolve e cancela a recebida.

Testes da ação de finalizar: peças, consumo, custo e status gravam juntos. Falha no meio devolve o saldo ao que era. Dois Recebi simultâneos deixam um executor só.

Teste do job: cria uma ordem, pula se já houver aberta ou recebida, não gera para máquina ou plano inativo, e empurra a data para o encaixe depois de hoje.

## Entrega

1. **Fundação.** Módulos no catálogo e em `public.modulos`, rotas, seção no início, máquinas e tela Solicitantes. A fila existe e ainda não lista ordem. Pronto quando a manutenção cadastra máquina por setor, a tela Solicitantes grava os setores e o solicitante sem setor vê "Nenhum setor liberado." A escolha de máquina filtrada pelo setor chega na corretiva.
2. **Peças.** Cadastro, entrada, saída manual, saldo negativo e custo médio.
3. **Corretiva.** Abertura, fila, detalhe, Recebi, devolver, finalizar com baixa e cancelar.
4. **Preventiva.** Planos e o job diário, gerando ordem na mesma fila.
5. **Indicadores.** Horas paradas, horas de execução, real de peças por máquina e a linha de ajustes.

## Código

Regras de status, custo, fila e calendário ficam em `src/domain/manutencao`. Telas em `src/features/manutencao`. Rotas em `src/app/manutencao`. Ações em `src/app/actions`, com o prefixo `manutencao-`. O mapa de rotas e o início passam a conhecer os dois módulos. Nenhuma dessas pastas concentra regra e tela no mesmo arquivo. Arquivo novo que se aproximar de 400 linhas é dividido antes de passar disso.
