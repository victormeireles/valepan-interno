# Sistema de Produção Valepan

Sistema mobile-first para registro de produção por etapas, integrado com Google Sheets.

## Funcionalidades

- **5 Etapas de Produção**: Pré-Mistura, Massa, Fermentação, Resfriamento e Forno
- **Mobile First**: Interface otimizada para dispositivos móveis
- **Integração Google Sheets**: Leitura de opções e escrita de dados automaticamente
- **Validação de Dados**: Validação robusta com suporte a números inteiros e meios (ex: 3 1/2)
- **Sem Login**: URLs diretas para cada equipe

## Configuração

### 1. Variáveis de Ambiente

Copie o arquivo `env.example` para `.env.local` e configure:

```bash
cp env.example .env.local
```

Preencha as credenciais da Google Service Account:

```env
GOOGLE_SA_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 2. Google Service Account

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione um existente
3. Ative a Google Sheets API
4. Crie uma Service Account
5. Baixe o arquivo JSON com as credenciais
6. Extraia o `client_email` e `private_key` do JSON

### 3. Permissões nas Planilhas

Adicione o e-mail da Service Account como **Editor** nas seguintes planilhas:

#### Planilha de Origem (Opções):
- **ID**: `1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI`
- **Abas**: Pré-Mistura, Massa, Fermentação, Produtos

#### Planilha de Destino (Dados):
- **ID**: `1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM`
- **Abas**: 1 - Pré Mistura, 2 - Massa, 3 - Fermentação, 4 - Resfriamento, 5 - Forno

## Instalação e Execução

```bash
# Navegar para a pasta interno
cd interno

# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar em produção
npm start
```

## URLs das Etapas

- **Menu Principal**: `http://localhost:3001`
- **Pré-Mistura**: `http://localhost:3001/pre-mistura`
- **Massa**: `http://localhost:3001/massa`
- **Fermentação**: `http://localhost:3001/fermentacao`
- **Resfriamento**: `http://localhost:3001/resfriamento`
- **Forno**: `http://localhost:3001/forno`

## Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   ├── options/[stage]/route.ts    # API para buscar opções
│   │   └── submit/[stage]/route.ts     # API para salvar dados
│   ├── [stage]/page.tsx               # Página dinâmica das etapas
│   └── page.tsx                       # Página inicial
├── components/
│   ├── FormControls/                  # Componentes de formulário
│   ├── GenericStageForm.tsx           # Formulário genérico
│   └── LoadingOverlay.tsx             # Loading compartilhado
├── config/
│   └── stages.ts                      # Configuração das etapas
├── domain/
│   ├── types.ts                       # Tipos TypeScript
│   └── validation.ts                  # Validações Zod
└── lib/
    └── googleSheets.ts                # Conector Google Sheets
```

## Validações

### Números com Meios
- Aceita: `3`, `3.5`, `3 1/2`
- Usado em: Quantidade, Carrinhos

### Números Inteiros
- Aceita apenas números inteiros
- Usado em: Assadeiras, Unidades

### Campos Obrigatórios
- Data (preenchida automaticamente com hoje)
- Turno (1 ou 2)
- Campos específicos de cada etapa

## Deploy

### Vercel
1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Outros Provedores
- Configure as variáveis de ambiente
- Use Node.js runtime
- Build: `npm run build`
- Start: `npm start`

## Troubleshooting

### Erro de Permissão
- Verifique se a Service Account tem acesso às planilhas
- Confirme se o e-mail está correto

### Erro de Validação
- Verifique se os dados estão no formato correto
- Números com meios devem usar o formato `3 1/2` ou `3.5`

### Erro de Conexão
- Verifique as credenciais da Service Account
- Confirme se a Google Sheets API está ativada