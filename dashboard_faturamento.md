### Documento de Arquitetura e Funcionalidades — Dashboard de Vendas (ValePan Insights)

Este documento descreve, em alto nível e com detalhes operacionais, como o dashboard de vendas está implementado para que você possa replicá‑lo em outro projeto. Abrange autenticação, integração com Google Sheets, estrutura dos dados, camadas de UI/UX, lógica de negócio, gráficos, filtros e requisitos de configuração.

---

## Visão Geral

- **Arquivos principais**
  - `dashboards/vendas.html`: entrada HTML, estrutura da página e imports de libs.
  - `dashboards/config.js`: configurações do projeto (OAuth, allowlist e planilha).
  - `dashboards/styles.css`: tema e estilos (dark glassmorphism).
  - `dashboards/scripts/app.js`: lógica do app (login, consultas, KPIs, gráficos, filtros).
- **Bibliotecas**
  - Chart.js 4.4.3 via CDN.
  - chartjs-plugin-datalabels 2.2.0 via CDN.
  - Google Identity Services (GSI) para login e token OAuth2 (Sheets API).
- **Funcionamento**
  - Web app totalmente estático, roda no navegador.
  - Login Google com allowlist de e‑mails.
  - Lê os dados diretamente do Google Sheets (REST) com token OAuth de leitura.
  - Renderiza KPIs, gráficos e tabela com interações ricas (filtros por período e cliente).

---

## Configuração e Integração com Google

### Configuração do projeto (arquivo `dashboards/config.js`)
- **CLIENT_ID**: Client ID do OAuth Web do Google (GIS).
- **ALLOWLIST**: lista de e‑mails autorizados a acessar o dashboard.
- **SPREADSHEET_ID**: ID da Planilha Google que será lida.
- **RANGE**: intervalo lido (colunas), no formato A1. Ex.: `"M:Q"`.
- **TOP_CLIENTES**: número alvo para “top clientes” (no código atual, a rosca usa Top 5 fixo).

Exemplo:
- CLIENT_ID: `"558843850394-...apps.googleusercontent.com"`
- ALLOWLIST: `["victor@valepan.com", "osir@valepan.com", ...]`
- SPREADSHEET_ID: `"1Wy43sOqHVKPTx7U634U9kYRDeANE-61kxpQm4-Bg9Xo"`
- RANGE: `"M:Q"`

### Requisitos no Google Cloud
- Criar um projeto GCP com:
  - OAuth 2.0 Client ID (tipo Web) para GIS.
  - Google Sheets API habilitada.
  - Authorized JavaScript origins com o domínio onde o app ficará hospedado (ex.: GitHub Pages).
- Ajustar a tela de consentimento OAuth (escopos: `spreadsheets.readonly`, `openid`, `email`, `profile`).
- A Planilha deve estar acessível para o usuário que fará login (permissão de leitura).

---

## Estrutura dos Dados (Planilha Google)

- Intervalo lido: `M:Q`, esperado com as seguintes colunas:

| Coluna | Nome esperado     | Tipo/Exemplo                 | Uso no app |
|-------|--------------------|------------------------------|------------|
| M     | NF Válida          | TRUE/FALSE                   | Linhas com `TRUE` são consideradas; demais são descartadas |
| N     | AnoMês             | YYYYMM (ex.: 202501)         | Usado para apoio; se ausente, é inferido da data |
| O     | Data               | dd/mm/aaaa ou ISO/parseável | Base para todas as janelas/agrupamentos |
| P     | Cliente            | string                       | Agrupamentos, filtros, KPIs |
| Q     | Valor              | número no formato BR (1.234,56) | Convertido para número (parse BR) |

- Normalização:
  - Apenas linhas com `NF Válida = TRUE`.
  - Data aceita em `dd/mm/aaaa` ou outro parse válido do JS.
  - Valor: converte “ponto milhar + vírgula decimal” para número JS (float).
  - Filtro de cliente (se ativo) já é aplicado ao normalizar.

---

## Autenticação e Autorização

- Carrega `gsi/client` (Google Identity Services).
- Fluxo:
  1. Renderiza botão de login na landing.
  2. Ao concluir login, extrai e‑mail do ID token JWT (sem backend).
  3. Verifica `ALLOWLIST`. Se não autorizado, bloqueia.
  4. Se autorizado, solicita token OAuth (Sheets) por `google.accounts.oauth2.initTokenClient`.
  5. Com o token, faz `fetch` à Sheets API REST.
- Persistência local:
  - Armazena o e‑mail no `localStorage` para auto-login visual (sem token).
  - Nenhum token é persistido.

- Modo iOS (Demo):
  - Detecta iOS e ativa “modo demonstração”: pula login real, gera dados fictícios consistentes (últimos ~90 dias), renderiza tudo igual ao modo real.
  - Botão “Ver Dashboard (Demo)” na landing.

---

## Seções do Dashboard (UI)

### 1) Landing de Acesso
- Título/branding “Valepan Insights”.
- Botão Google (GSI) para login.
- Em iOS: aviso e botão “Ver Dashboard (Demo)”.

### 2) Header
- Branding.
- Badge “Período” com painel de seleção de datas:
  - Presets: “Este mês” e “Mês passado”.
  - Inputs `date` para início e fim.
  - Botões “Aplicar” e “Padrão”.
- Badge “Clientes” com painel:
  - Busca por texto (filtro local).
  - Lista com checkboxes de todos os clientes (preenchida na primeira carga).
  - “Aplicar” e “Limpar”.
- Ambos badges ficam ocultos até haver login/dados (ou demo).

### 3) KPIs (cards)
- “Faturamento do período”
  - Valor atual (k formatado).
  - Variação vs período anterior (% com cor).
  - Projeção do mês (quando aplicável).
- “Pedidos”
  - Contagem atual.
  - Variação vs período anterior.
  - Projeção do mês (quando aplicável).
- “Ticket médio”
  - Valor do período (total/pedidos).
  - Variação vs período anterior.
- “Clientes únicos”
  - Contagem atual.
  - Variação vs período anterior.
- “Faturamento [Ano atual]”
  - YTD (ano até a data).
  - YoY vs ano anterior.
  - Projeção anual (média diária YTD × dias do ano).

Observações:
- Formatação numérica: `pt-BR`.
- `formatK`: exibe em milhares com 0–2 casas dependendo da escala.

### 4) Gráficos (seção Charts)
- “Faturamento por semanas (últimas 8)”
  - Barra (1 dataset: faturamento por semana).
  - Labels `dd/mm–dd/mm` retroativas a partir da data final do período atual.
  - Interação: clicar numa barra define o período para aquela semana (preenche os inputs e refaz a busca).
  - Datalabels exibem valores quando cabem.
- “Top clientes”
  - Gráfico de rosca: Top 5 clientes + “Outros”.
  - Legenda lateral com dot + cliente + valor (%).
  - Interações:
    - Clicar em um segmento ou item da legenda filtra imediatamente por aquele cliente.
    - Clicar em “Outros” abre o painel de clientes para refinamento manual.

### 5) Insights
- “Variação por cliente (vs período anterior)”
  - Listas “Quem mais cresceu” (Top 5) e “Quem mais caiu” (Bottom 5).
  - Cada item mostra delta em valor (k) e % vs período anterior.
  - Interação: clicar em um cliente aplica filtro por cliente.
  - Título do card é atualizado com o período comparado (datas atuais vs datas de comparação).
- “Engajamento (últimas 2 semanas)”
  - Barras: Novos, Ativos, Quase inativo, Inativos.
  - Interação: clicar em uma barra abre um modal com a lista de clientes daquela categoria, ordenada por “última compra”.

Definições (baseadas no fim do período atual `curEnd`):
- Ativos: compraram nos últimos 14 dias (D‑13 a D).
- Quase inativo: compraram entre D‑27 e D‑14, excluindo os ativos.
- Inativos: compraram entre D‑55 e D‑28, excluindo os anteriores.
- Novos: primeira compra na história do dataset ocorreu dentro do período selecionado (curStart..curEnd).
- Observação: “Ativos” exclui “Novos”, por design.

### 6) Tabela de Últimas Vendas
- Colunas: Data, Cliente, Valor (BRL).
- Ordenada por Data decrescente (render).
- Busca instantânea por cliente (campo no cabeçalho).

### 7) Modal
- Tabela para listar clientes associados a categorias (ex.: ao clicar no gráfico de Engajamento).
- Colunas: Cliente, Última compra, Histórico (total).
- Fechamento por botão “Fechar” ou clique fora.

### 8) Loading Overlay
- Overlay com spinner e texto “Processando dados…”.
- Mostrado durante carregamentos e re‑filtros.

---

## Regras de Período, Comparações e Projeções

- Período atual:
  - Por padrão, começa no 1º dia do mês da última venda e termina no “mesmo dia do mês” que a última venda (ex.: até dia 12).
  - Se o usuário aplicar datas no painel ou via interações (barra semanal), o período passa a ser customizado.
- Período anterior:
  - Em geral: mesmo intervalo de dias, porém no mês anterior (ex.: 01–12 do mês anterior).
  - Se a seleção tiver 7 dias e não começar no dia 1, compara com a semana imediatamente anterior (D‑13 a D‑7).
- Projeções (aparecem apenas quando o período atual começa no dia 1 do mês corrente):
  - Faturamento: `totalAtual × (totalMêsPassado / totalAnterior)`.
    - “totalAnterior” é o valor no período anterior comparável do mês corrente até o dia de hoje.
  - Pedidos: `pedidosAtual × (pedidosMêsPassado / pedidosAnteriorAnálogo)`.
  - YTD (card “Faturamento [Ano atual]”): projeção anual = `média diária YTD × número de dias do ano (considera bissexto)`.

- Semanas (gráfico):
  - Considera 8 janelas semanais retroativas de 7 dias, terminando em `curEnd`.
  - Rótulos calculados como `dd/mm–dd/mm`.

---

## Lógica de Negócio (resumo técnico)

- Normalização de linhas:
  - Filtra NF Válida = TRUE.
  - Parse de Data (dd/mm/aaaa → Date local).
  - Parse de Valor (formato BR → número).
  - Aplica `clientFilter` ainda nessa fase para reduzir memória/CPU.
- KPIs:
  - Total, Pedidos, Clientes únicos (período atual).
  - Variações vs período anterior (%).
  - Ticket médio atual vs anterior.
  - YTD, YoY e projeção anual.
- Top Clientes:
  - Agrupa por cliente, ordena por valor, pega Top 5, soma “Outros”.
- “Novos vs Recorrentes”:
  - Descobre a primeira compra histórica por cliente.
  - No período atual, soma quanto veio de “novos” e quanto de “recorrentes”.
- Ranking de variação por cliente:
  - Compara soma por cliente no período atual vs anterior.
  - Ordena por delta; exibe topo e fundo (5 cada).
- Engajamento:
  - Constrói conjuntos para janelas definidas.
  - “Ativos” removem “Novos”.

---

## UX, Estilo e Design

- Tema escuro com glassmorphism e microinterações.
- Cores principais (CSS vars):
  - Fundo: `--bg: #0a0e14`.
  - Accent ValePan: `--accent: #e67e22`, dourado: `--accent-2: #f4c27a`.
  - Sucesso: verde `#00d3a7`; Alerta: `#ff6b6b`.
- Layout responsivo:
  - Grids automáticos para KPIs e Cards.
  - `topcli` alterna colunas/linhas em telas menores.
  - Tabela com cabeçalho sticky e scroll interno.
- Acessibilidade e hints:
  - Dicas e subtítulos nos gráficos para guiar interações (“Clique nas barras…”).
  - Badges com indicador visual quando há filtro ativo.
- Background decorativo:
  - “orbs” animados e uma malha (grid) com blend overlay.

---

## Interações e Estados

- Login:
  - Auto prompt quando não é localhost.
  - Auto exibição do app quando já há e‑mail salvo.
- Filtro de Período:
  - Preset “Este mês”: 1º dia do mês atual até ontem (ou mês anterior se hoje for dia 1).
  - Preset “Mês passado”: 1º ao último dia do mês anterior.
  - Datas manuais com validação (início ≤ fim).
  - Abrir o painel repopula os inputs com o período atualmente aplicado.
- Filtro de Cliente:
  - Busca por texto aplica “display: none” nos itens da lista, não altera o conjunto.
  - “Aplicar” cria um `Set` com os selecionados.
  - “Limpar” zera o filtro e marca “Clientes: Todos”.
- Gráficos:
  - Barra semanal: clique define o período para aquela semana.
  - Rosca top clientes: clique filtra por cliente; “Outros” abre painel.
  - Engajamento: clique abre modal com lista de clientes daquela categoria.
- Tabela:
  - Busca instantânea no campo “Buscar cliente…” filtra as linhas renderizadas.
- Loading:
  - Ativo em todas as leituras/refetch.

---

## Segurança e Privacidade

- `meta` robots/bots: `noindex, nofollow, noarchive` (evita indexação).
- Permissão de acesso restrita por allowlist.
- Escopo de planilha somente leitura.
- LocalStorage armazena apenas o e‑mail (para conveniência de UX).
- Sem backend: os tokens são mantidos somente em memória de runtime do navegador.

---

## Como Replicar em Outro Projeto

1) Preparar a Planilha
- Crie/ajuste uma planilha com colunas `M:Q` no formato descrito.
- Garanta que o usuário que fará login tenha acesso de leitura.

2) Configurar Google Cloud / OAuth
- Habilite “Google Sheets API”.
- Crie um OAuth Client ID (Web) para GIS.
- Configure Authorized JavaScript origins (seu domínio/Pages).
- Preencha `CLIENT_ID` em `dashboards/config.js`.

3) Ajustar Configurações
- Edite `dashboards/config.js` com:
  - `CLIENT_ID`, `ALLOWLIST`, `SPREADSHEET_ID`, `RANGE`.
- Se quiser parametrizar a quantidade de top clientes:
  - Hoje a rosca usa Top 5 no código; adapte `app.js` para usar `APP_CONFIG.TOP_CLIENTES` na fatia `.slice(0, TOP_CLIENTES)`.

4) Publicar
- O app é estático; basta hospedar os arquivos (ex.: GitHub Pages).
- Se usar domínio customizado, configure `CNAME`.

5) Testar Fluxos
- Login Google (desktop e mobile).
- Leitura da planilha e render (ver “Processando dados…”).
- Filtros de período e cliente.
- Cliques nos gráficos (barras, rosca e engajamento).
- Modo iOS (deve exibir DEMO).

---

## Padrões Técnicos Importantes

- Datas de inputs (`type="date"`) são parseadas em “modo local” para evitar offset de timezone.
- Comparação semanal inteligente: se a janela é de 7 dias e não começa no dia 1, o período anterior vira a semana imediatamente anterior.
- Projeções mensais só aparecem para o mês corrente iniciado no dia 1.
- O badge de período exibe a janela aplicada (ex.: `01/05–12/05/2025`).
- Sempre que filtros mudam, o app refaz a leitura/normalização e rerender completa.

---

## Personalizações Comuns

- Cores e tema: `dashboards/styles.css` (variáveis CSS e classes de card/grid).
- Títulos e textos: `dashboards/vendas.html`.
- Quantidade de itens em Top Clientes: alterar no `app.js` (e opcionalmente ligar ao `APP_CONFIG.TOP_CLIENTES`).
- Títulos dinâmicos dos gráficos e cards: localizados em `renderCharts` e `fetchAndRender`.
- Fonte e espaçamentos: tokens e utilitários no CSS (ex.: `.container`, `.card`, `.kpi`).

---

## Limitações e Observações

- Dependência de rede/CDN para Chart.js e GIS (sem bundler).
- Sem backend: limites de cota/consentimento OAuth aplicam‑se por usuário.
- Dados DEMO são randômicos, mas com distribuição realista para validação de UX.
- Considera apenas NF “TRUE” — defina corretamente na planilha se tiver regras distintas.
- “TOP_CLIENTES” no `config.js` não está conectado ao gráfico de rosca nesta versão (usa Top 5).

---

## Troubleshooting Rápido

- “Chart is not defined”: garantir que o script do Chart.js esteja carregando (SRI removido no HTML para evitar bloqueio por CDN).
- “Acesso negado”: verifique `ALLOWLIST` e e‑mail do usuário autenticado.
- “Sem dados na planilha”: confirme ID e RANGE, e se há linhas com “NF Válida = TRUE”.
- “Erro na autorização”: revisar CLIENT_ID, origins e escopos; conferir se Sheets API está habilitada.

---

## Estrutura de Pastas (módulo de dashboards)

- `dashboards/vendas.html`: estrutura, meta tags anti‑indexação, imports de CSS/JS/CDNs e containers de UI.
- `dashboards/styles.css`: tema, layout, estados (hidden/overlays), responsividade e componentes visuais.
- `dashboards/config.js`: credenciais e parâmetros do projeto.
- `dashboards/scripts/app.js`: inicialização, login, leitura de planilha, normalização, cálculos, gráficos, filtros e interações.

---

- Implementações chave
  - Autenticação e tokenização: `window.onload` → `initGIS` → `initTokenClient`.
  - Leitura de dados: `fetchSheetValues(spreadsheetId, range)`.
  - Normalização: `normalizeRows(values)`.
  - Período e métricas: `computePeriod(rows)` e derivados.
  - KPIs: `renderKPIs(kpis, meta)`.
  - Gráficos: `renderCharts(period)`.
  - Tabela: `renderTable(rowsAtual)`.
  - Insights/Modal: partes dentro de `renderInsights(period)` e blocos em `fetchAndRender()`.

---

### Checklist para replicar

- Configurar `CLIENT_ID`, `ALLOWLIST`, `SPREADSHEET_ID`, `RANGE`.
- Habilitar Sheets API e ajustar Authorized Origins.
- Garantir planilha com colunas `M:Q` conforme mapeamento (NF TRUE, Data válida, Valor BR).
- Publicar arquivos estáticos (HTML/CSS/JS) e testar fluxos de filtro e gráficos.
- Se necessário, conectar `TOP_CLIENTES` à rosca no `app.js`.

---

- Ajustei o documento detalhando integrações (OAuth/Sheets), estrutura da planilha, todas as seções de UI, lógicas de período/comparação, projeções, interações dos gráficos, design/UX e passos de replicação. Se quiser, posso conectar `APP_CONFIG.TOP_CLIENTES` ao gráfico de rosca e/ou gerar um template de README.md pronto no repositório.