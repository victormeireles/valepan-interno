# 📄 PRD – SaaS de Dashboards para Fábrica de Pães

## 1. Visão Geral

Aplicação SaaS simples que conecta a bases de dados no **Google Sheets** para gerar dashboards operacionais e gerenciais para a fábrica de pães.
A aplicação será acessada por poucos usuários (3–4), com **login via Google** e hospedagem em infraestrutura gratuita.

---

## 2. Stack Sugerida

* **Frontend & Backend:** Next.js (App Router) + Vercel (serverless)
* **Auth:** Auth.js (Google OAuth)
* **Banco de Dados:** Google Sheets como fonte primária; variáveis de ambiente na Vercel para IDs de planilhas.
* **UI:** TailwindCSS + shadcn/ui
* **Gráficos:** Recharts ou Chart.js
* **Controle de Acesso:** Allowlist de e-mails autorizados
* **Integração com Sheets:** API oficial Google Sheets + Service Account

---

## 3. Funcionalidades por Fase

### **Fase 1 – MVP**

Objetivo: Centralizar indicadores básicos já disponíveis e validar uso.

#### 3.1 Login e Controle de Acesso

* Login via conta Google (OAuth)
* Restrição de acesso por e-mail autorizado
* Logout seguro

#### 3.2 Estrutura de Navegação

* **Página de Login**
* **Home** com visão geral dos dashboards disponíveis
* **Menu lateral** para acesso rápido aos dashboards

#### 3.3 Dashboards

1. **Dashboard de Faturamento** (já existente, apenas integração)

   * Importar código já pronto
   * Atualização periódica via ISR (Incremental Static Regeneration) a cada 15 minutos
2. **Dashboard de Vendas**

   * Faturamento por produto
   * Custo por produto
   * Margem bruta (% e R\$)
   * Quebra por produto/cliente

---

### **Fase 2 – Produção**

Objetivo: Monitorar em tempo real o desempenho da produção.

#### 3.4 Dashboard de Produção

Conectar a planilha com as 6 abas (etapas do processo):

1. Pré-mistura
2. Massa
3. Fermentação
4. Resfriamento
5. Forno
6. Embalagem

Para cada etapa:

* Quantidade produzida (unidades ou lotes)
* Tempo de início e término
* Eficiência (realizado vs planejado)
* Gargalos (ex.: lotes atrasados ou com rejeição)

#### 3.5 Relacionamento Produção x Vendas

* Comparar produção diária com vendas e pedidos
* Alertar quando a produção não cobre pedidos confirmados

---

### **Fase 3 – Evolução e Inteligência**

Objetivo: Aumentar poder de análise e previsibilidade.

#### 3.6 Projeção de Demanda

* Analisar vendas históricas e sazonalidade
* Propor produção ideal para os próximos dias

#### 3.7 Alertas e Monitoramento

* Notificações de estoque baixo ou produção insuficiente
* Identificação de produtos de baixa margem

#### 3.8 Indicadores Avançados

* Margem de contribuição por cliente
* Tempo médio por etapa de produção
* Desperdício/retrabalho

---

## 4. Requisitos Técnicos

* **Segurança:** autenticação Google, HTTPS, dados sensíveis apenas em env vars.
* **Performance:** cache com revalidação periódica para evitar excesso de chamadas à API do Google.
* **Manutenção:** código versionado no GitHub, deploy automático via Vercel.

---

## 5. Entregáveis

* Código fonte completo (frontend + backend)
* Documentação de configuração
* Variáveis de ambiente para IDs de planilhas
* Guia de manutenção e inclusão de novos dashboards