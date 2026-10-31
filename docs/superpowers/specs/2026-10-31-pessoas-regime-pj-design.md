# Regime CLT e PJ — desenho

Data: 2026-10-31  
Status: aguardando revisão do stakeholder

## Objetivo

Cadastrar e gerenciar prestadores de serviço constantes no mesmo colaborador do módulo Pessoas. O regime padrão é CLT. PJ é a opção para quem trabalha na empresa como pessoa jurídica. Quem já está no banco entra como CLT.

PJ ocupa setor, turno, quadro e faltas como os demais. Aviso prévio e exame ocupacional valem só para CLT. CNPJ e razão social ficam na ficha, opcionais.

## Fora desta versão

Data de contrato separada da admissão, pagamento de nota, pessoa extra, card novo na visão geral, módulo de permissão novo e alteração da fórmula do quadro.

Pessoa extra continua sendo serviço avulso, em cadastro próprio. Prestador PJ constante não entra nessa lista.

## Dados

Três colunas em `pessoas_colaboradores`:

- `regime`: `clt` ou `pj`, obrigatório, padrão `clt`.
- `cnpj`: texto nulo, só dígitos.
- `razao_social`: texto nulo, no máximo 200 caracteres depois do trim.

Quem já existe fica `clt`, com CNPJ e razão social vazios. Inserção sem regime nasce `clt`. A carga atual não envia essas colunas: atualizar quem já existe preserva regime, CNPJ e razão social.

CLT gravado deixa CNPJ e razão social vazios, inclusive quando a pessoa era PJ. PJ pode gravar os dois vazios. CNPJ preenchido tem 14 dígitos e dígitos verificadores válidos. Razão social guarda o texto digitado, só com trim nas pontas, sem a capitalização de nome de pessoa. Vazio vira nulo.

O nome do colaborador continua sendo a identidade na lista. Razão social não substitui o nome.

As policies de `interno_pessoas` que já existem cobrem as colunas. Não há tabela nova.

## Ficha

O cadastro, a leitura e a admissão nova ganham o campo Regime, com CLT selecionado por padrão. CNPJ e razão social aparecem só quando o regime é PJ e são gravados junto com a admissão. O restante da ficha permanece: contato, documentos, vale-transporte, emergência, EPI e pagamento.

Na leitura, o CNPJ aparece mascarado (`00.000.000/0000-00`). No banco ficam os 14 dígitos.

## Lista

Selo `PJ` ao lado do nome quando o regime é PJ. CLT não ganha selo. Filtro Regime, com Todos, CLT e PJ. O padrão é Todos.

A busca, tolerante a caixa e acento, continua em nome e código e também acha razão social. CNPJ é buscado pelos dígitos, com ou sem máscara. O filtro de regime combina com os filtros que já existem.

A exportação `colaboradores.csv` ganha as colunas `regime`, `cnpj` e `razao_social`. CNPJ sai como texto. O cuidado que já existe com fórmula de planilha permanece.

## Vínculo

Admissão, desistência, transferência e liderança seguem iguais para os dois regimes.

No desligamento de PJ o campo Aviso não aparece e não é exigido. Hoje é o mesmo critério de data que o desligamento CLT já usa. Data posterior a hoje grava `data_desligamento`, mantém a situação e não cria linha em `pessoas_avisos`. Data de hoje ou anterior desliga, encerra a alocação e libera a vaga, também sem aviso. O texto da tela: "Data depois de hoje marca a saída e mantém a pessoa no quadro. Data de hoje ou anterior desliga e libera a vaga."

O job `pessoas_efetivar_desligamentos` continua efetivando pela `data_desligamento`. A saída prevista de PJ não entra no card Avisos.

Saída prevista é regime PJ, situação diferente de desligado e `data_desligamento` preenchida. Nesse caso o menu mostra Cancelar saída. A ação limpa `data_desligamento` e mantém a situação atual. Não mexe em `pessoas_avisos`.

CLT continua com Aviso (`com_trabalho` ou `sem_trabalho`) e com Cancelar aviso.

Mudar para PJ com aviso ativo é recusado: "Cancele o aviso antes de mudar o regime para PJ." Mudar para CLT com `data_desligamento` preenchida e situação diferente de desligado é recusado: "Cancele a saída prevista antes de mudar o regime para CLT." Desligado pode trocar de regime. Ao salvar como CLT, CNPJ e razão social ficam vazios.

## Exames e afastamento

Para PJ, a coluna Próximo exame mostra travessão e não abre painel. O item Exames sai do menu. Exame novo é recusado: "Exame ocupacional vale só para CLT." Linhas de exame já gravadas permanecem. Se a pessoa voltar a CLT, coluna, menu e histórico voltam a aparecer.

Afastar continua para PJ. Os motivos são Abandono e Afastado. INSS não aparece e, se chegar ao servidor, é recusado: "INSS vale só para CLT."

## O que permanece

Quadro, faltas, admissão, transferência e líder não mudam de regra. PJ ativo em posição conta como contratado. Os cards da visão geral permanecem os mesmos. Ativos inclui PJ ativo. Avisos continua só com aviso de CLT.

## Erros

A mensagem cita o campo. O formulário permanece preenchido. Segundo clique não grava duas vezes. A edição concorrente continua comparando `updated_at`.

- CNPJ inválido: "CNPJ inválido."
- Razão social acima de 200 caracteres: a mensagem cita Razão social.
- Exame em PJ: "Exame ocupacional vale só para CLT."
- INSS em PJ: "INSS vale só para CLT."
- Troca de regime com aviso ou saída prevista: as duas mensagens da seção Vínculo.

## Testes

- Colaborador novo sem regime nasce `clt`, com CNPJ e razão social vazios.
- PJ salva com os dois campos vazios.
- CNPJ inválido é recusado; CNPJ válido de 14 dígitos é aceito.
- Salvar CLT zera CNPJ e razão social.
- CLT com CNPJ ou razão social não passa na constraint.
- A busca acha razão social e os dígitos do CNPJ.
- O filtro Regime separa CLT e PJ; Todos mostra os dois.
- Desligar PJ não exige tipo de aviso e não cria `pessoas_avisos`.
- Data futura de PJ mantém a pessoa no quadro; data de hoje ou anterior libera a vaga.
- Cancelar saída prevista limpa a data e mantém a situação.
- Troca para PJ com aviso ativo é recusada. Troca para CLT com saída prevista é recusada.
- Exame novo e motivo INSS são recusados para PJ.
- PJ ativo em posição entra na conta de contratados.
- A carga que atualiza um colaborador existente não altera regime, CNPJ nem razão social.
