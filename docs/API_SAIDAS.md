# API de Saídas - Documentação de Integração

Esta documentação descreve como integrar seu sistema externo com a API de criação de saídas do sistema Valepan.

## Visão Geral

A API permite que sistemas externos registrem saídas de produtos, que serão automaticamente:
- Registradas na planilha de saídas
- Debitadas do estoque correspondente
- Notificadas via WhatsApp (opcional)

## Endpoint

```
POST /api/public/saidas
```

## Autenticação

A API utiliza autenticação por API Key. Você deve fornecer a API key em uma das seguintes formas:

### Opção 1: Header Authorization (Recomendado)
```
Authorization: Bearer <sua-api-key>
```

### Opção 2: Header X-API-Key
```
X-API-Key: <sua-api-key>
```

**Importante:** Entre em contato com o administrador do sistema para obter sua API key.

## Formato da Requisição

### Headers
```
Content-Type: application/json
Authorization: Bearer <sua-api-key>
```

### Body (JSON)

```json
{
  "data": "2024-01-15",
  "cliente": "Nome do Cliente",
  "produto": "Nome do Produto",
  "meta": {
    "caixas": 10,
    "pacotes": 0,
    "unidades": 0,
    "kg": 0
  },
  "observacao": "Observação opcional sobre a saída",
  "skipNotification": false,
  "fotoUrl": "https://exemplo.com/foto.jpg",
  "fotoId": "id-da-foto-opcional"
}
```

### Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data` | string | Data da saída no formato `YYYY-MM-DD` (ex: "2024-01-15") |
| `cliente` | string | Nome do cliente que receberá a saída |
| `produto` | string | Nome do produto que será entregue |
| `meta` | object | Quantidades da saída (veja detalhes abaixo) |

### Campos Opcionais

| Campo | Tipo | Descrição | Padrão |
|-------|------|-----------|--------|
| `observacao` | string | Observação adicional sobre a saída | `""` (vazio) |
| `skipNotification` | boolean | Se `true`, não envia notificação WhatsApp | `false` |
| `fotoUrl` | string | URL da foto da saída (opcional). Se fornecida, será salva na planilha e incluída na notificação WhatsApp | `undefined` |
| `fotoId` | string | ID identificador da foto (opcional). Usado para referência interna | `undefined` |

### Objeto `meta` (Quantidades)

O objeto `meta` deve conter pelo menos uma quantidade maior que zero:

```json
{
  "caixas": 10,    // Número de caixas (pode ser 0)
  "pacotes": 5,    // Número de pacotes (pode ser 0)
  "unidades": 0,   // Número de unidades (pode ser 0)
  "kg": 0          // Quantidade em quilogramas (pode ser 0)
}
```

**Regra:** Pelo menos um dos campos (`caixas`, `pacotes`, `unidades` ou `kg`) deve ser maior que zero.

## Respostas

### Sucesso (201 Created)

```json
{
  "success": true,
  "message": "Saída registrada com sucesso",
  "data": {
    "data": "2024-01-15",
    "cliente": "Nome do Cliente",
    "produto": "Nome do Produto",
    "quantidade": {
      "caixas": 10,
      "pacotes": 0,
      "unidades": 0,
      "kg": 0
    }
  }
}
```

### Erro de Autenticação (401 Unauthorized)

```json
{
  "error": "Não autorizado. Forneça uma API key válida no header Authorization ou X-API-Key"
}
```

### Erro de Validação (400 Bad Request)

```json
{
  "error": "Data inválida. Use o formato YYYY-MM-DD"
}
```

Outros exemplos de erros de validação:
- `"Cliente e produto são obrigatórios"`
- `"Informe pelo menos uma quantidade válida (caixas, pacotes, unidades ou kg > 0)"`

### Erro do Servidor (500 Internal Server Error)

```json
{
  "error": "Mensagem de erro descritiva"
}
```

## Exemplos de Uso

### Exemplo 1: Requisição Básica (cURL)

```bash
curl -X POST https://seu-dominio.com/api/public/saidas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sua-api-key-aqui" \
  -d '{
    "data": "2024-01-15",
    "cliente": "Cliente ABC",
    "produto": "Pão Francês",
    "meta": {
      "caixas": 20,
      "pacotes": 0,
      "unidades": 0,
      "kg": 0
    }
  }'
```

### Exemplo 2: JavaScript/TypeScript (fetch)

```javascript
async function criarSaida() {
  const response = await fetch('https://seu-dominio.com/api/public/saidas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sua-api-key-aqui'
    },
    body: JSON.stringify({
      data: '2024-01-15',
      cliente: 'Cliente ABC',
      produto: 'Pão Francês',
      meta: {
        caixas: 20,
        pacotes: 0,
        unidades: 0,
        kg: 0
      },
      observacao: 'Entrega urgente'
    })
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('Sucesso:', result.message);
  } else {
    console.error('Erro:', result.error);
  }
}
```

### Exemplo 3: Python (requests)

```python
import requests

url = 'https://seu-dominio.com/api/public/saidas'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sua-api-key-aqui'
}
data = {
    'data': '2024-01-15',
    'cliente': 'Cliente ABC',
    'produto': 'Pão Francês',
    'meta': {
        'caixas': 20,
        'pacotes': 0,
        'unidades': 0,
        'kg': 0
    },
    'observacao': 'Entrega urgente'
}

response = requests.post(url, json=data, headers=headers)

if response.status_code == 201:
    print('Sucesso:', response.json()['message'])
else:
    print('Erro:', response.json()['error'])
```

### Exemplo 4: Sem Notificação WhatsApp

```json
{
  "data": "2024-01-15",
  "cliente": "Cliente ABC",
  "produto": "Pão Francês",
  "meta": {
    "caixas": 20,
    "pacotes": 0,
    "unidades": 0,
    "kg": 0
  },
  "skipNotification": true
}
```

### Exemplo 5: Com Foto (URL)

```json
{
  "data": "2024-01-15",
  "cliente": "Cliente ABC",
  "produto": "Pão Francês",
  "meta": {
    "caixas": 20,
    "pacotes": 0,
    "unidades": 0,
    "kg": 0
  },
  "fotoUrl": "https://exemplo.com/fotos/saida-2024-01-15.jpg",
  "fotoId": "foto-12345"
}
```

**Nota:** Quando `fotoUrl` é fornecida:
- A URL é salva diretamente na planilha (não é feito upload para o Google Drive)
- A foto é incluída automaticamente na notificação WhatsApp (se `skipNotification` for `false`)
- O campo `fotoId` é opcional e pode ser usado para referência interna do sistema externo

## Comportamento do Sistema

Quando uma saída é criada com sucesso, o sistema:

1. **Registra na planilha**: A saída é adicionada à planilha de saídas com data, cliente, produto e quantidades
2. **Salva foto (se fornecida)**: Se `fotoUrl` for fornecida, ela é salva diretamente na planilha (sem upload para o Google Drive)
3. **Atualiza o estoque**: O estoque do cliente (ou tipo de estoque associado) é debitado automaticamente
4. **Envia notificação**: Uma notificação é enviada via WhatsApp para o grupo de saídas (a menos que `skipNotification` seja `true`). Se `fotoUrl` foi fornecida, a foto é incluída na notificação

## Tratamento de Erros

### Códigos de Status HTTP

| Código | Significado | Ação Recomendada |
|--------|-------------|------------------|
| 201 | Criado com sucesso | Nenhuma ação necessária |
| 400 | Erro de validação | Verifique os dados enviados |
| 401 | Não autorizado | Verifique se a API key está correta |
| 500 | Erro interno do servidor | Entre em contato com o suporte |

### Boas Práticas

1. **Sempre trate erros**: Implemente tratamento de erros adequado no seu código
2. **Valide dados antes de enviar**: Verifique se os dados estão no formato correto antes de fazer a requisição
3. **Use retry com backoff**: Em caso de erro 500, considere implementar retry com backoff exponencial
4. **Mantenha logs**: Registre todas as requisições e respostas para facilitar debugging

## Limitações e Considerações

- A API não suporta criação de múltiplas saídas em uma única requisição. Faça uma requisição por saída.
- O estoque pode ficar negativo se a quantidade solicitada for maior que o disponível (comportamento padrão do sistema).
- As notificações WhatsApp são enviadas apenas se o sistema estiver configurado corretamente.

## Suporte

Para dúvidas, problemas ou solicitação de API keys, entre em contato com o administrador do sistema.

## Changelog

### Versão 1.1.0 (2024-01-15)
- Adicionado suporte para campo `fotoUrl` opcional
- Quando `fotoUrl` é fornecida, a foto é salva na planilha e incluída na notificação WhatsApp
- Não é necessário fazer upload da foto para o Google Drive quando a URL é fornecida diretamente

### Versão 1.0.0 (2024-01-15)
- Versão inicial da API pública de saídas
- Suporte a autenticação por API key
- Registro de saídas com atualização automática de estoque
- Notificações WhatsApp opcionais

