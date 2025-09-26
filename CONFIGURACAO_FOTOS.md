# 📸 Configuração do Sistema de Fotos

## 🚀 Configuração Inicial

### 1. Criar Pasta no Google Drive

1. Acesse o [Google Drive](https://drive.google.com)
2. Crie uma nova pasta chamada: `Valepan-Producao-Embalagem-Fotos`
3. Clique com o botão direito na pasta → "Compartilhar"
4. Adicione o email da service account (mesmo usado nas planilhas)
5. Defina permissão como "Editor"
6. Copie o ID da pasta da URL (ex: `1ABC123DEF456GHI789JKL`)

### 2. Configurar Variáveis de Ambiente

Crie ou edite o arquivo `.env.local` na raiz do projeto:

```bash
# Google Drive - Fotos de Produção
GOOGLE_DRIVE_FOLDER_ID=1ABC123DEF456GHI789JKL
```

**⚠️ IMPORTANTE:** Use `.env.local` (não `.env`) para manter as credenciais seguras.

### 3. Estrutura de Pastas Automática

O sistema criará automaticamente a seguinte estrutura:

```
/Valepan-Producao-Embalagem-Fotos/
  /202401/          # Ano e mês (YYYYMM)
    /2024-01-15/    # Data específica (YYYY-MM-DD)
      /123.jpg      # rowId.jpg
      /124.jpg
  /202402/
    /2024-02-01/
      /125.jpg
```

## 🔧 Funcionalidades

### Upload de Fotos
- **Drag & Drop**: Arraste fotos diretamente para o modal
- **Validação**: Apenas imagens (JPG, PNG, WebP) até 5MB
- **Preview**: Visualização antes do envio
- **Nomenclatura**: `{rowId}.jpg` (ex: `123.jpg`)

### Gerenciamento
- **Visualização**: Clique na foto para ver em tela cheia
- **Remoção**: Botão de remover com confirmação
- **Indicador**: Ícone 📷 nos cards que têm foto

### Limpeza Automática
- **API**: `POST /api/photo/cleanup`
- **Configuração**: `{ "daysToKeep": 30 }` (padrão: 30 dias)
- **Ação**: Remove fotos antigas do Drive e limpa planilha

## 📊 Colunas da Planilha

As seguintes colunas foram adicionadas na planilha de destino:

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| R | `photo_url` | URL pública da foto no Google Drive |
| S | `photo_id` | ID do arquivo no Drive para gerenciamento |
| T | `photo_uploaded_at` | Timestamp do upload (ISO 8601) |

## 🛠️ APIs Disponíveis

### Upload de Foto
```bash
POST /api/upload/photo
Content-Type: multipart/form-data

photo: File
rowId: number
```

### Gerenciar Foto
```bash
GET /api/photo/[rowId]     # Buscar dados da foto
DELETE /api/photo/[rowId]  # Remover foto
```

### Limpeza
```bash
POST /api/photo/cleanup
Content-Type: application/json

{ "daysToKeep": 30 }
```

## 🔒 Segurança

- **Service Account**: Usa as mesmas credenciais das planilhas
- **Permissões**: Apenas leitura/escrita na pasta específica
- **URLs Públicas**: Fotos são tornadas públicas para visualização
- **Validação**: Tipo e tamanho de arquivo validados

## 🐛 Troubleshooting

### Erro: "GOOGLE_DRIVE_FOLDER_ID não configurado"
- Verifique se a variável está no `.env.local`
- Reinicie o servidor após adicionar a variável

### Erro: "Falha ao criar estrutura de pastas"
- Verifique se a service account tem permissão na pasta
- Confirme se o ID da pasta está correto

### Foto não aparece
- Verifique se a foto foi salva na planilha (coluna R)
- Confirme se a URL está acessível publicamente

## 📈 Monitoramento

- **Logs**: Console do servidor mostra erros de upload
- **Planilha**: Colunas R, S, T mostram status das fotos
- **Drive**: Estrutura de pastas organiza por data

## 🔄 Manutenção

### Limpeza Manual
```bash
curl -X POST http://localhost:3000/api/photo/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 30}'
```

### Verificar Fotos de um Item
```bash
curl http://localhost:3000/api/photo/123
```

---

**✅ Sistema pronto para uso!** Configure a variável `GOOGLE_DRIVE_FOLDER_ID` e comece a usar o upload de fotos.
