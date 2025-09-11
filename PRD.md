## Dor:
A dor é que preciso que cada funcionario de uma etapa produtiva preencha no celular (por isso, mobile first!!) quanto foi produzido ao longo do turno (1 ou 2) de cada produto ou insumo.


## Etapas do processo:

### Etapa 1: pré mistura
- data: pre preenchido com a data de hoje no formulario
- turno: 1 ou 2
- pré-mistura: a pessoa vai preencher o tipo de pré mistura. As opções puxar daqui: @https://docs.google.com/spreadsheets/d/1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI/edit?pli=1&gid=1457002701#gid=1457002701 aba "Pré-Mistura"
- quantidade: aqui a quantidade sempre vai ser um numero inteiro ou um numero inteiro + 1/2
- ao preencher, ele insere linha na planilha https://docs.google.com/spreadsheets/d/1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM/edit?gid=9530816#gid=9530816 aba "1 - Pré Mistura"


### Etapa 2: Massa
- data: pre preenchido com a data de hoje no formulario
- turno: 1 ou 2
- massa: a pessoa vai preencher o tipo de massa. As opções puxar daqui: https://docs.google.com/spreadsheets/d/1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI/edit?pli=1&gid=1314124494#gid=1314124494 aba "Massa"
- quantidade: aqui a quantidade sempre vai ser um numero inteiro ou um numero inteiro + 1/2
- ao preencher, ele insere linha na planilha https://docs.google.com/spreadsheets/d/1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM/edit?gid=0#gid=0 aba "2 - Massa"

### Etapa 3: Fermentação
- data: pre preenchido com a data de hoje no formulario
- turno: 1 ou 2
- fermentação: a pessoa vai preencher o tipo de fermentacao. As opções puxar daqui: https://docs.google.com/spreadsheets/d/1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI/edit?pli=1&gid=1515690120#gid=1515690120 aba "Fermentação" coluna A apenas
- carrinhos: aqui a quantidade sempre vai ser um numero inteiro ou um numero inteiro + 1/2
- assadeiras: numero inteiro. a ideia é que quando ele não complete um carrinho de assadeiras, ele preencha o numero de assadeiras aqui. exemplo preencheu 3 carrinhos e aqui preenche 12 assadeiras
- unidades: numero inteiro. quando não completar uma assadeira ou entao quando o produto não for produzido em assadeiras. exemplo 1: 2 carrinhos + 26 assadeiras + 13 unidades: aqui preenche 13. exemplo 2: 0 carrinhos + 0 assadeiras + 273 unidades
- ao preencher, ele insere linha na planilha https://docs.google.com/spreadsheets/d/1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM/edit?gid=238434264#gid=238434264 aba "3 - Fermentação"

### Etapa 4: Resfriamento
- data: pre preenchido com a data de hoje no formulario
- turno: 1 ou 2
- produto: a pessoa vai preencher o tipo de produto. As opções puxar daqui: https://docs.google.com/spreadsheets/d/1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI/edit?pli=1&gid=0#gid=0 aba "Produtos" coluna A apenas
- carrinhos: aqui a quantidade sempre vai ser um numero inteiro ou um numero inteiro + 1/2
- assadeiras: numero inteiro. a ideia é que quando ele não complete um carrinho de assadeiras, ele preencha o numero de assadeiras aqui. exemplo preencheu 3 carrinhos e aqui preenche 12 assadeiras
- unidades: numero inteiro. quando não completar uma assadeira ou entao quando o produto não for produzido em assadeiras. exemplo 1: 2 carrinhos + 26 assadeiras + 13 unidades: aqui preenche 13. exemplo 2: 0 carrinhos + 0 assadeiras + 273 unidades
- ao preencher, ele insere linha na planilha https://docs.google.com/spreadsheets/d/1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM/edit?gid=309392233#gid=309392233 aba "4 - Resfriamento"

### Etapa 5: Forno
- data: pre preenchido com a data de hoje no formulario
- turno: 1 ou 2
- produto: a pessoa vai preencher o tipo de produto. As opções puxar daqui: https://docs.google.com/spreadsheets/d/1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI/edit?pli=1&gid=0#gid=0 aba "Produtos" coluna A apenas
- carrinhos: aqui a quantidade sempre vai ser um numero inteiro ou um numero inteiro + 1/2
- assadeiras: numero inteiro. a ideia é que quando ele não complete um carrinho de assadeiras, ele preencha o numero de assadeiras aqui. exemplo preencheu 3 carrinhos e aqui preenche 12 assadeiras
- unidades: numero inteiro. quando não completar uma assadeira ou entao quando o produto não for produzido em assadeiras. exemplo 1: 2 carrinhos + 26 assadeiras + 13 unidades: aqui preenche 13. exemplo 2: 0 carrinhos + 0 assadeiras + 273 unidades
- ao preencher, ele insere linha na planilha https://docs.google.com/spreadsheets/d/1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM/edit?gid=1019725603#gid=1019725603 aba "5 - Forno"

### Etapa 6: Embalagem
Essa vamos desenvolver depois

## Outras considerações:
- login: por enquanto nem quero login. se cada formulario estiver em uma url, compartilho uma url com cada usuario separadamente
- você pode usar a mesma estrutura para todas as paginas e em cada url colocar as variaives para distinguir (planilha/aba de origem, de destino, nomes, etc). isso aproveita codigo e evita duplicacao