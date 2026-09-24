# Módulo Pessoas — desenho

Data: 24/09/2026. Fonte de negócio: `tmp/rh/PRD.md` e os arquivos em `tmp/rh/`.

## Objetivo

Concentrar no sistema interno o cadastro de colaboradores, a alocação por setor e turno, o quadro de vagas, avisos, desligamentos, faltas e serviços de pessoas extras. Os números da visão geral abrem as pessoas e as posições que os compõem.

A spec cobre o módulo inteiro. A implementação quebra nas etapas do final deste documento.

## Fora desta versão

Ponto eletrônico, presença diária, escala diária, horas remuneradas, folha, adicional noturno, banco de horas, cálculo trabalhista, férias, recrutamento, portal do funcionário, acesso de líderes, WhatsApp, e-mail, integração financeira e pagamento parcial. Anexo de atestado também fica de fora. Horário serve à alocação e não calcula jornada paga.

Não há tela para atribuir perfil, usuário ou permissão. Isso continua no sistema que já controla acessos.

## Permissão

Novo módulo `interno_pessoas`, nos níveis já existentes `ler`, `editar` e `administrar`. `administrar` inclui `editar`. `ler` abre as telas e a exportação. `editar` grava, inclusive a carga. O item entra no menu e no início só para quem tem o módulo. Rotas e actions exigem o mesmo módulo.

## O que não se mistura

Colaborador não é conta de login (`usuarios`). Turno de RH não usa o turno 1–2–3 da produção (`config_operacao_turnos`). Setor de RH é cadastro novo: fermentação, forno e embalagem da produção não são esses setores.

Códigos dos arquivos permanecem únicos: colaborador `VP-0001`, setor `PRO`, turno `PRO-MAD`. Cada tabela tem id interno. A carga usa o código como chave e não duplica ao rodar de novo.

## Dados

Setor: código, nome, tipo (`operacional` ou `apoio`), indicação de agrupamento proposto, ativo.

Turno: código, setor, nome de exibição, se gera vaga operacional, ativo. Dois turnos podem se chamar Manhã e continuar distintos pelo código e pelo horário.

Horário por dia, de segunda a sábado: início, fim e se termina no dia seguinte. Cada dia está `definido`, `nao_trabalha` ou `a_confirmar`. Dia a confirmar não tem hora. Domingo não tem linha. A fonte é `tmp/rh/HORARIOS.md`. Não se recalcula a regra de 9 h ou 10 h no código. O turno isolado de Produção 09h–18h não é criado.

Colaborador: código, nome, apelido, nascimento, mãe, CPF, CPF verificado, endereço, telefone, e-mail, cargo, situação (`ativo`, `admissao_prevista`, `desligado`), cadastro incompleto, admissão, desligamento, desligamento com data desconhecida, observações. Cadastro incompleto não é situação de vínculo.

Posição: uma linha por vaga aprovada, com setor, turno e ativa. Contadores do `quadro.csv` não são colunas editáveis. Servem só para criar as posições na carga.

Alocação: colaborador, setor, turno, posição opcional, papel (`ocupacao` ou `reserva`), início e fim. Apoio e gestão têm alocação sem posição. Uma pessoa tem no máximo uma alocação aberta. Uma posição tem no máximo uma alocação aberta.

Aviso: colaborador, tipo (`com_trabalho` ou `sem_trabalho`), início, último dia previsto de trabalho, término previsto do vínculo, observação, situação (`ativo`, `cancelado` ou `encerrado`). Independente do vínculo. Corrigir ou cancelar guarda histórico.

Falta: colaborador, data civil, atestado (`aguardando`, `apresentado`, `nao_apresentado` ou vazio), classificação (`pendente`, `justificada`, `injustificada`), observação, setor e turno da data (ou desconhecido), cancelamento com motivo. Uma falta ativa por pessoa e data. Cancelada sai dos totais e permanece no histórico.

Pessoa extra: nome, telefone, observação, disponível para seleção, CPF opcional. Não cria colaborador nem usuário.

Serviço extra: pessoa extra, setor, início, fim, precisa de passagem, valor da passagem, valor do extra, observação, estado (`programado`, `realizado`, `cancelado`). Total = valor do extra + passagem, em centavos, nunca negativo. Sem passagem, o valor da passagem é zero. Com passagem e valor desconhecido, o total fica pendente e não vira zero. Fim posterior ao início, inclusive no dia seguinte.

Pagamento: um registro integral por serviço realizado, com data e usuário, situação `pendente` ou `pago`. Estorno exige motivo e não é lançamento bancário. Serviço pago não se edita nem se cancela até o estorno.

Auditoria do módulo: quem, quando, entidade e a alteração. Sem CPF, endereço ou telefone em log público.

## Acesso no banco

RLS ligado em todas as tabelas novas. Leitura e escrita exigem `(SELECT auth_tem_modulo('interno_pessoas', 'ler'))` ou `editar`, conforme a operação. Não usar `USING (true)` para autenticado: CPF, endereço e nome da mãe não ficam legíveis para qualquer login da fábrica. Não há exclusão física pelo app. Encerrar, cancelar e estornar preservam a linha. `is_admin()` não substitui o módulo.

## Números do quadro

Calculados das posições ativas e das alocações abertas:

- Quadro aprovado = posições ativas.
- Contratados = posições ocupadas por colaborador ativo.
- Reservas = posições ligadas a admissão prevista.
- Vagas livres = aprovado − contratados − reservas.
- Composição planejada = contratados + reservas.
- Aviso ativo não subtrai o contratado.

Apoio e gestão não entram nessas contas. Fotografia inicial, depois da carga: 93 posições, 64 contratados, 1 reserva, 28 vagas. 75 ativos = 64 nas posições + 11 fora. As 11 são Alan, Elizabeth, Julliana, Marcelle, Nathalia, Nilton, Roberto, Sergio Marcos, Sérgio Ricardo, Thais e Geovani.

## Telas

Grupo **Pessoas** no menu e no início. Seis telas, no computador e no celular, com os componentes e o visual já usados no sistema.

**Visão geral.** Cards de ativos, admissões previstas, avisos em andamento, vagas livres e faltas no período. Cada número abre a lista correspondente. Quadro por setor e turno com posições, contratados, reservas, vagas livres e saídas previstas. Apoio e gestão em grupo separado, com setor, cargo e horário. Card de pendências abre cadastro incompleto. Alocado não significa presente no dia. Sem percentual de absenteísmo.

**Colaboradores.** Busca por nome, CPF e código, tolerante a caixa e acento. Filtros: setor, turno, situação, aviso e cadastro incompleto. Lista inicial: ativos e admissões previstas. Desligados só no filtro. Ficha com dados pessoais, cargo, situação, setor, turno, posição e observações. Seções de alocações, faltas e histórico. Idade a partir do nascimento. Nome, mãe e endereço com capitalização legível; partículas `de`, `da`, `dos` em minúsculas; siglas RH, CPF, CEP e RJ em maiúsculas; correção manual permitida. Não deduzir nome civil, acento, DDD, e-mail ou CPF. Provisório salva com nome e código. CPF digitado novo só entra com formato e dígitos válidos. CPF legado inválido permanece sinalizado e não é chave.

**Setores e horários.** Cadastro editável. Turno mostra segunda a sábado. Dia a confirmar aparece vazio. Apoio não gera vaga.

**Quadro.** Uma linha por setor e turno. Ampliar cria posições e registra auditoria. Reduzir só desativa posição livre. Ocupada ou reservada exige transferência ou encerramento antes. Transferir encerra a alocação anterior e abre a nova na mesma operação. Sem vaga livre, o sistema informa o conflito e não inventa posição.

**Vínculo.** Admissão prevista reserva uma posição. Na entrada, a mesma reserva vira ocupação, sem pessoa nem posição nova. Desistência libera a reserva, guarda histórico e não registra demissão. Weslei Willian é a reserva inicial da Produção madrugada. Aviso não remove a pessoa dos contratados. Aviso sem trabalho não altera a posição sozinho. Desligamento confirmado atualiza o vínculo, encerra a alocação, libera a posição, marca aviso ativo como encerrado e mantém faltas e histórico. Operação nova pede a data efetiva. Data futura fica como saída prevista até confirmação. Recontratação reabre vínculo na mesma pessoa. Os 16 desligados importados ficam com data desconhecida. A data da carga não vira data de desligamento.

**Faltas.** Formulário: colaborador, data, atestado, classificação, observação. Usuário e instante automáticos. Período mostra os dias para desmarcar antes de salvar. Não supõe que todo dia do intervalo é trabalhado. Apresentar atestado não justifica sozinho. Setor e turno gravados são os vigentes na data. Se o histórico não permitir, pedir seleção ou gravar desconhecido. Transferência posterior não reescreve falta antiga. Listagem por pessoa, setor, turno e período, com totais separados por classificação. Cancelar pede motivo.

**Extras.** Cadastro separado. Serviço com os campos acima. Programado e cancelado ficam fora do total realizado a pagar. Só realizado com valores completos pode ser marcado pago. Duplicidade exata é bloqueada. Sobreposição da mesma pessoa avisa e não bloqueia dois períodos diferentes no mesmo dia. Relatórios por pessoa, setor e período, com filtro explícito por data do serviço ou data do pagamento. Cancelados aparecem fora das somas.

## Carga

Rotina privada, com prévia, só para quem tem `editar`. A prévia mostra o que entra, o que já existe e o que falha. Erro de uma linha não descarta as outras. Repetir não duplica.

Ordem da carga completa: setores, turnos e horários, posições a partir das vagas aprovadas do `quadro.csv`, colaboradores e alocações, faltas. Na implementação, a etapa 1 grava setor, turno, horário e colaborador, com o setor e o turno atuais no colaborador para a lista funcionar. A etapa 2 cria as posições e a alocação aberta e, a partir daí, setor e turno atuais só mudam pela alocação. A etapa 3 grava as faltas. Apoio entra com setor e horário, sem posição. Nilton não ocupa vaga da Produção. Roberto e Sérgio Ricardo não ampliam a Expedição. Geovani entra como líder no turno `AP-GPR13` do arquivo, sem posição. Mauro Afonso não está no arquivo e não é criado.

Falta: a coluna `tipo` vira classificação (`Justificada` ou `Injustificada`). Atestado fica vazio. Setor da planilha é gravado quando a linha traz setor reconhecido; senão, desconhecido. `VP-0056` não tem colaborador e vai para o relatório de erro, sem pessoa fictícia.

Dados incompletos permanecem visíveis. A carga não publica dado pessoal em exemplo, teste commitado ou página estática.

## Erros e concorrência

Mensagem cita o campo. O formulário permanece preenchido. Segundo clique não grava duas vezes. Transferência, admissão e desligamento são atômicos. Edição concorrente compara `updated_at`: a segunda gravação avisa o conflito e não sobrescreve em silêncio. Datas de nascimento e de falta são datas civis, no fuso `America/Sao_Paulo`, sem deslocar o dia. Datas na tela em pt-BR.

Exportação respeita o filtro da tela e o módulo `ler`. CPF sai como texto. Valor que começa com `=`, `+`, `-` ou `@` é neutralizado para não virar fórmula.

## Etapas de implementação

1. Permissão, tabelas, menu e carga de setores, horários e colaboradores.
2. Posições, alocação, transferência, admissão, aviso, desligamento e visão do quadro.
3. Faltas, com lançamento, classificação e cancelamento.
4. Pessoas extras, serviços e pagamento.
5. Visão geral, exportação e conferência dos números, sem regressão nos módulos atuais.

Cada etapa usa dados reais importados pela rotina privada e fica utilizável antes da seguinte.

## Conferência

Testes automatizados, sem dados pessoais reais no repositório:

- Quadro inicial: 93, 64, 1 e 28, com as 11 pessoas fora das posições.
- Posição não aceita dois ocupantes ou duas reservas.
- Pessoa não tem duas alocações abertas.
- Reserva vira ocupação na mesma posição. Desistência não gera desligamento.
- Redução não desativa posição ocupada.
- Falta repetida no mesmo dia é recusada. Falta cancelada sai do total.
- Passagem desconhecida deixa o total pendente. Serviço programado ou cancelado não entra a pagar. Pago bloqueia edição até o estorno.
- Carga repetida não duplica código. `VP-0056` não cria colaborador.
- Usuário sem `interno_pessoas` não lê as tabelas nem abre as rotas.
