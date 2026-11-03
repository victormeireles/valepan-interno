# Remuneração do colaborador — desenho

Data: 2026-11-03  
Status: aguardando revisão do stakeholder

## Objetivo

Registrar, na ficha de cada colaborador CLT ou PJ, o pacote mensal de remuneração e o histórico por data de início. O pacote tem salário, valor do vale transporte, vale alimentação/refeição e plano de saúde. A conta da folha fica para depois. Quem já está no banco fica sem vigência até alguém administrar gravar a primeira.

## Fora desta versão

Conta da folha, soma de custos, total na lista ou no quadro, exportação dos valores, módulo de permissão novo e qualquer ligação entre o "precisa" do vale transporte e o valor em reais.

A data de uma vigência já gravada não se edita no lugar. Para trocá-la, apaga a vigência e grava outra.

## Dados

Tabela nova `pessoas_remuneracao_vigencias`. CLT e PJ usam o mesmo formato. Nenhuma coluna nova em `pessoas_colaboradores`. A coluna `vale_transporte` que já existe, com precisa, não precisa ou não informado, permanece como está.

Cada linha tem `id`. O par (`colaborador_id`, `inicio`) é único.

- `colaborador_id`: referência ao colaborador. Se a linha do colaborador for removida, as vigências dela saem junto.
- `inicio`: data civil de início.
- `salario_centavos`, `vale_transporte_centavos` e `vale_alimentacao_centavos`: inteiros, no mínimo zero. Zero significa que não recebe aquele item.
- `plano_saude`: sim ou não. Não fica em branco.
- `created_at` e `updated_at`.

Uma pessoa só tem uma linha por data de início. Gravar de novo nessa data atualiza os quatro valores e `updated_at`. Outra data cria outra linha. Apagar remove só aquela linha. Duas gravações na mesma data: fica a última.

Pessoa sem nenhuma linha está com remuneração não informada.

Não há data de fim. O pacote que vale num dia é o de início mais recente até esse dia. O dia de referência é o dia civil de `America/Sao_Paulo`, o mesmo critério que o vínculo já usa. Data futura fica gravada e ainda não é a vigente. Se só existem datas futuras, nada vale hoje. Apagar uma linha faz a anterior seguir valendo dali para a frente.

Os três valores cabem em inteiro de 32 bits. Acima disso a gravação recusa.

## Acesso

Quem administra Pessoas é o único que lê, grava, corrige e apaga. Quem só lê ou edita a ficha continua vendo o restante do cadastro e não recebe esses valores.

A tabela tem RLS nas quatro operações, exigindo `auth_tem_modulo('interno_pessoas', 'administrar')`. Não há policy para ler ou editar. A exclusão é física da vigência e continua restrita a quem administra o módulo.

A ação no servidor exige o mesmo nível antes de consultar a tabela. O cliente de serviço usado nas outras ações de Pessoas não substitui essa checagem, porque ele não passa pelo RLS.

A gravação normal da ficha, a lista, o quadro, o CSV de colaboradores e a carga não consultam nem alteram essa tabela. O select do cadastro permanece o que já é.

## Ficha

A seção Remuneração fica na ficha do colaborador e só é montada quando a sessão administra Pessoas. A página de Pessoas calcula isso e repassa para a ficha, no mesmo jeito que o quadro já repassa quem pode editar.

A seção não entra no Salvar do cadastro. Tem carregar, gravar e apagar à parte, na leitura e na edição do restante.

Quem administra vê:

- O pacote que vale hoje, ou o texto "Remuneração não informada."
- A lista das vigências, da data de início mais recente para a mais antiga. A que vale hoje leva a marca Vigente. Data de início posterior a hoje leva a marca Futura. As demais não levam marca.
- Em cada linha: data de início, salário, valor do vale transporte, vale alimentação/refeição e plano de saúde. Plano de saúde aparece como Sim ou Não. Valores em reais, com `R$`, ponto nos milhares e vírgula nos centavos.

Nova vigência abre data, os três valores e o plano de saúde desligado. Corrigir abre a mesma forma com a linha preenchida e a data fixa. Apagar pede confirmação "Apagar a vigência de dd/mm/aaaa?" e remove só aquela data.

O vale transporte de precisa ou não precisa continua no grupo Transporte. O valor fica na remuneração, com o rótulo "Valor do vale transporte". Os outros rótulos são "Salário", "Vale alimentação/refeição" e "Plano de saúde".

## Gravação

A data de início identifica a vigência. Na correção a forma não envia outra data. Uma data diferente, se chegar à ação, cria outra vigência e deixa a original.

O valor é digitado em reais, no formato brasileiro. O ponto é opcional e, quando aparece, separa milhar em grupos de três. Vírgula introduz centavos, com um ou dois dígitos. Sem vírgula, o número é inteiro em reais. A gravação guarda centavos. `1.234,56` e `1234,56` viram `123456`. `1,5` vira `150`. `0` e `0,00` viram `0`. Plano de saúde desligado grava não.

Campo vazio, texto inválido, mais de dois dígitos depois da vírgula e valor negativo recusam. Plano de saúde chega como sim ou não; qualquer outro valor recusa. Data vazia, malformada ou inexistente no calendário recusa. Passado, hoje e futuro são aceitos.

A forma permanece preenchida. O botão não dispara de novo enquanto a gravação está em andamento.

## Erros

A mensagem cita o campo. Sem permissão, a ação falha antes de ler os valores, com a recusa que o módulo já usa.

- Salário vazio, inválido ou negativo: "Informe o salário."
- Vale transporte vazio, inválido ou negativo: "Informe o valor do vale transporte."
- Vale alimentação/refeição vazio, inválido ou negativo: "Informe o vale alimentação/refeição."
- Valor que não cabe no inteiro: "Salário alto demais.", "Valor do vale transporte alto demais." ou "Vale alimentação/refeição alto demais."
- Data: "Informe a data de início."
- Plano de saúde: "Informe o plano de saúde."
- Sucesso: "Vigência gravada." ou "Vigência apagada."
- Pessoa inexistente: "Colaborador não encontrado."
- Apagar data que não existe: "Vigência não encontrada."

## Testes

- Pessoa sem vigência fica com remuneração não informada.
- Gravar uma data nova cria a linha. Gravar a mesma data atualiza os quatro valores.
- `1.234,56`, `1234,56`, `1,5`, `0` e `0,00` viram os centavos correspondentes. Vazio, texto inválido, negativo, mais de dois dígitos depois da vírgula e valor que não cabe no inteiro recusam, com a mensagem do campo. A forma continua preenchida. Plano de saúde desligado grava não.
- O pacote que vale hoje é o de início mais recente até o dia civil de São Paulo. Data futura fica gravada e ainda não é a vigente. Só datas futuras deixam o hoje como não informado.
- Apagar uma vigência remove só aquela data. A anterior passa a valer dali para a frente.
- CLT e PJ usam a mesma tabela. A coluna antiga de vale transporte não muda.
- Quem administra lê, grava e apaga. Quem só lê ou edita não recebe os valores, e a ação recusa antes de consultar a tabela.
- Salvar o cadastro, a lista, o quadro, o CSV e a carga não leem nem gravam remuneração.
