# Férias no quadro — desenho

Data: 2026-11-26
Status: aguardando revisão do stakeholder

## Objetivo

Lançar férias de um colaborador com data de início e data de volta, e mostrar no quadro que, naqueles dias, tem menos gente no posto. A vaga continua da pessoa. O período também impede falta.

O caso imediato são três pessoas que entram de férias em 01/12. O lançamento pode ser feito antes. Até a véspera a contagem segue igual, com um selo das datas. A queda vale do início até a véspera da volta.

## Fora desta versão

Folha, abono, férias vendidas e qualquer cálculo trabalhista. Substituto nomeado. Tela de histórico. Projeção de falta de gente antes do início. Liberar a vaga, como o afastamento faz. Módulo de permissão novo. Painel de pessoas. Rotina diária.

Afastamento (INSS, abandono, outro) permanece como está: tira a pessoa do posto na hora e solta a vaga, sem data de volta.

## Dados

Tabela `pessoas_ferias`:

- `id`
- `colaborador_id`, obrigatório, referência a `pessoas_colaboradores`
- `inicio`, data obrigatória
- `volta`, data obrigatória, o primeiro dia de trabalho
- `cancelada_em`, nulo enquanto o período vale
- `created_at`, `updated_at`

A pessoa fica fora no intervalo `[inicio, volta)`. De 01/12 com volta em 31/12, fica fora de 01 a 30 e volta a contar em 31/12.

`volta` é posterior a `inicio`. Não há exclusão física. Cancelar preenche `cancelada_em`.

Dois períodos da mesma pessoa com `cancelada_em` nulo não podem se cruzar. A migration garante isso com uma função de verificação no insert e no update. A regra de domínio recusa antes, com a mensagem de negócio. Se a base recusar mesmo assim, a action devolve a mesma mensagem.

RLS ligada. Policies no mesmo critério de `pessoas_faltas`: leitura com `interno_pessoas` em ler, insert e update com editar, sempre com `(SELECT auth_tem_modulo(...))`. Sem policy de delete.

## Estado

O estado não fica gravado. O dia de hoje, em `America/Sao_Paulo`, define:

- **Cancelada**, quando `cancelada_em` está preenchido.
- **Programada**, quando hoje é antes do início.
- **Em gozo**, do início até a véspera da volta.
- **Encerrada**, a partir do dia da volta.

No dia da volta a pessoa volta a contar no posto. Não há job.

Um período em gozo com a volta alterada para hoje fica encerrado hoje. A pessoa conta no posto nesse dia.

## Quem pode entrar

Só colaborador com situação `ativo`, sem aviso ativo e sem saída prevista. Saída prevista é regime PJ com `data_desligamento` preenchida e situação diferente de desligado.

Reserva, afastado e desligado ficam de fora porque a situação não é `ativo`.

Enquanto existir período programado ou em gozo, não se lança outro. O banco continua impedindo cruzamento.

## Lançamento

O menu da pessoa, na lista e no quadro, ganha **Férias** para quem pode entrar e não tem período aberto.

O painel pede início e volta. O texto fixo do painel: "A volta é o primeiro dia de trabalho."

Com período programado ou em gozo, o menu troca para **Alterar férias** e **Cancelar férias**. O painel de cancelar mostra o nome e as datas. O botão grava o cancelamento. Não há segundo diálogo.

Alterar um período programado mexe nas duas datas, com início hoje ou no futuro. Alterar um período em gozo trava o início e só muda a volta. A volta pode ser hoje, e nesse caso o período encerra hoje.

Período encerrado ou cancelado some do menu. Dá para lançar outro em seguida.

Quem só lê o módulo Pessoas vê selo e contagem. Lançar, alterar e cancelar exigem editar.

## Quadro

A pessoa permanece na lista do turno, antes e durante o período. Apoio também, quando for o caso.

O selo é neutro (`neutral`), para não parecer aviso nem erro. O texto é a janela em que fica fora, em pt-BR. Um dia: `Férias 01/12`. Vários: `Férias 01/12–30/12`. O fim do texto é a véspera da volta.

Antes do início, contratados, no posto, em férias e vagas livres ficam iguais ao quadro de hoje. Só o selo aparece.

Durante o gozo:

- Contratados não muda. A pessoa segue contratada na vaga.
- Vagas livres não muda.
- **Em férias** soma quem está em ocupação e em gozo naquele turno. Apoio e reserva não entram nesse número.
- No posto desce pelo mesmo tanto. Aviso e férias não se misturam, porque férias recusa quem está em aviso.
- A faixa geral e a faixa do setor ganham a célula **Em férias**, logo depois de Contratados. Na faixa geral, o número é a soma dos turnos. No celular o rótulo curto é `Férias`. O número usa o tom padrão das outras células.
- A barra de hoje ganha um trecho `bg-stone-400` para em férias, e a legenda "Em férias" quando o número é maior que zero. O trecho de quem está no posto encolhe.
- A barra "Após as saídas" continua existindo só quando há aviso. Gente em férias não entra em vagas livres nessa projeção. O trecho de férias permanece nas duas barras.
- A nota, só quando em férias é maior que zero: `3 em férias. No posto: 12. A vaga continua de cada um.` No singular: `1 em férias. No posto: 12. A vaga continua da pessoa.`
- O resumo do turno inclui `3 em férias` quando o número é maior que zero.

"No posto" da nota é o trecho âmbar da barra.

## Lista de colaboradores

A lista usa o mesmo selo para período programado ou em gozo. A situação continua `ativo`. O filtro Ativos continua incluindo quem está de férias.

## Faltas

Lançar falta recusa o envio inteiro se alguma data pedida cai num período não cancelado. Nada é inserido. A mensagem cita a pessoa e cada período atingido: `Ana está de férias de 01/12 a 30/12.`

Editar falta não muda a data e não passa por essa regra. Cancelar falta continua livre.

Lançar ou alterar férias recusa se existe falta ativa, com `cancelada_em` nulo, em qualquer dia do intervalo. O sistema não cancela falta sozinho. A mensagem lista as datas em ordem cronológica: `Cancele a falta de 02/12 antes de lançar as férias.` Com várias: `Cancele as faltas de 02/12, 05/12 e 08/12 antes de lançar as férias.`

Período cancelado deixa de bloquear falta, inclusive nos dias que já passaram.

## Mensagens

Ordem da validação ao lançar ou alterar: datas, situação da pessoa, cruzamento com outra férias, faltas ativas.

- Datas vazias ou inválidas: `Informe o início e a volta.`
- Volta no mesmo dia ou antes do início: `A volta precisa ser depois do início.`
- Início anterior a hoje, no lançamento ou na alteração de período programado: `O início não pode ser anterior a hoje.`
- Situação diferente de ativo: `Só um colaborador ativo pode entrar de férias.`
- Aviso ativo: `Cancele o aviso antes de lançar férias.`
- Saída prevista: `Cancele a saída prevista antes de lançar férias.`
- Período cruzando outro em aberto: `Já existe férias nesse período.`
- Sem período aberto ao alterar ou cancelar: `Não há férias em aberto.`
- Colaborador inexistente: `Colaborador não encontrado.`

Sucesso: `Férias lançadas.`, `Férias atualizadas.`, `Férias canceladas.`

Aviso ativo tem precedência sobre saída prevista quando os dois existirem.

## Testes

- Estado pelas datas: programada, em gozo, encerrada no dia da volta, cancelada.
- Um dia fora e vários dias fora no texto do selo. O fim do selo é a véspera da volta.
- Quadro em gozo: em férias sobe, no posto desce, contratados e vagas livres ficam. Apoio em gozo leva selo e não entra na célula.
- Quadro antes do início: números iguais, selo presente.
- Barra "Após as saídas" não soma férias em vagas livres.
- Lançar falta com uma data dentro do período não insere nenhuma data do envio.
- Férias com falta ativa no intervalo é recusada, e as datas aparecem na mensagem.
- Cada recusa da seção de mensagens.
- Alterar em gozo não muda o início. Volta igual a hoje encerra hoje.
- Cancelar no meio do gozo devolve a pessoa à contagem e libera falta no intervalo.
