# API de Deleção de Saídas - Documentação de Integração

Esta documentação descreve como integrar seu sistema externo com a API de deleção de saídas do sistema Valepan.

## Visão Geral

A API permite que sistemas externos deletem saídas registradas, que serão automaticamente:
- Removidas da planilha de saídas
- Terão o estoque creditado de volta (se houver quantidades realizadas e o cliente tiver tipo de estoque definido)

## Endpoint

```
DELETE /api/public/saidas/delete
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
  "quantidade": {
    "caixas": 10,
    "pacotes": 0,
    "unidades": 0,
    "kg": 0
  }
}
```

### Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data` | string | Data da saída no formato `YYYY-MM-DD` (ex: "2024-01-15") |
| `cliente` | string | Nome do cliente da saída |
| `produto` | string | Nome do produto da saída |
| `quantidade` | object | Quantidades da saída (veja detalhes abaixo) |

### Objeto `quantidade`

O objeto `quantidade` deve conter as quantidades exatas da saída que você deseja deletar:

```json
{
  "caixas": 10,    // Número de caixas
  "pacotes": 0,    // Número de pacotes
  "unidades": 0,   // Número de unidades
  "kg": 0          // Quantidade em quilogramas
}
```

**Importante:** A quantidade deve corresponder exatamente à quantidade da saída na planilha (campo `meta`). A busca é feita por correspondência exata de data, cliente, produto e quantidade.

## Respostas

### Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Saída removida com sucesso",
  "data": {
    "rowId": 123,
    "cliente": "Nome do Cliente",
    "produto": "Nome do Produto",
    "data": "2024-01-15",
    "estoqueCreditado": true
  }
}
```

**Campos da resposta:**
- `rowId`: ID da linha que foi deletada
- `cliente`: Nome do cliente da saída deletada
- `produto`: Nome do produto da saída deletada
- `data`: Data da saída deletada
- `estoqueCreditado`: Indica se o estoque foi creditado de volta (true) ou não (false)

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
- `"Quantidade é obrigatória"`

### Saída Não Encontrada (404 Not Found)

```json
{
  "error": "Saída não encontrada com os critérios fornecidos"
}
```

### Múltiplas Saídas Encontradas (409 Conflict)

```json
{
  "error": "Múltiplas saídas encontradas com os critérios fornecidos. Use critérios mais específicos ou forneça o rowId.",
  "encontradas": 2
}
```

**Nota:** Se houver múltiplas saídas com os mesmos critérios (data, cliente, produto e quantidade), a API retornará erro 409. Neste caso, você precisará usar critérios mais específicos ou fornecer o rowId diretamente.

### Erro do Servidor (500 Internal Server Error)

```json
{
  "error": "Mensagem de erro descritiva"
}
```

## Exemplos de Uso

### Exemplo 1: Requisição Básica (cURL)

```bash
curl -X DELETE https://seu-dominio.com/api/public/saidas/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sua-api-key-aqui" \
  -d '{
    "data": "2024-01-15",
    "cliente": "Cliente ABC",
    "produto": "Pão Francês",
    "quantidade": {
      "caixas": 20,
      "pacotes": 0,
      "unidades": 0,
      "kg": 0
    }
  }'
```

### Exemplo 2: JavaScript/TypeScript (fetch)

```javascript
async function deletarSaida(data, cliente, produto, quantidade) {
  const response = await fetch('https://seu-dominio.com/api/public/saidas/delete', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sua-api-key-aqui'
    },
    body: JSON.stringify({
      data,
      cliente,
      produto,
      quantidade
    })
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('Sucesso:', result.message);
    console.log('Estoque creditado:', result.data.estoqueCreditado);
  } else {
    console.error('Erro:', result.error);
  }
  
  return result;
}

// Uso
deletarSaida('2024-01-15', 'Cliente ABC', 'Pão Francês', {
  caixas: 20,
  pacotes: 0,
  unidades: 0,
  kg: 0
});
```

### Exemplo 3: Python (requests)

```python
import requests

def deletar_saida(data, cliente, produto, quantidade):
    url = 'https://seu-dominio.com/api/public/saidas/delete'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sua-api-key-aqui'
    }
    data_payload = {
        'data': data,
        'cliente': cliente,
        'produto': produto,
        'quantidade': quantidade
    }
    
    response = requests.delete(url, json=data_payload, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print('Sucesso:', result['message'])
        print('Estoque creditado:', result['data']['estoqueCreditado'])
        return result
    else:
        print('Erro:', response.json()['error'])
        return None

# Uso
deletar_saida('2024-01-15', 'Cliente ABC', 'Pão Francês', {
    'caixas': 20,
    'pacotes': 0,
    'unidades': 0,
    'kg': 0
})
```

### Exemplo 4: Com Tratamento de Erros Completo

```javascript
async function deletarSaidaComTratamento(data, cliente, produto, quantidade) {
  try {
    const response = await fetch('https://seu-dominio.com/api/public/saidas/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sua-api-key-aqui'
      },
      body: JSON.stringify({
        data,
        cliente,
        produto,
        quantidade
      })
    });

    const result = await response.json();

    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new Error('Não autorizado. Verifique sua API key.');
        case 404:
          throw new Error('Saída não encontrada. Verifique os critérios fornecidos.');
        case 409:
          throw new Error(`Múltiplas saídas encontradas (${result.encontradas}). Use critérios mais específicos.`);
        case 400:
          throw new Error(`Dados inválidos: ${result.error}`);
        default:
          throw new Error(`Erro do servidor: ${result.error}`);
      }
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error) {
    console.error('Erro ao deletar saída:', error);
    throw error;
  }
}
```

## Comportamento do Sistema

Quando uma saída é deletada com sucesso, o sistema:

1. **Remove da planilha**: A linha da saída é removida permanentemente da planilha de saídas
2. **Credita estoque (se aplicável)**: 
   - Se a saída tinha quantidades realizadas (caixas, pacotes, unidades ou kg > 0)
   - E o cliente possui um tipo de estoque definido
   - O estoque é creditado de volta automaticamente
   - Se o cliente não tiver tipo de estoque, o estoque não é creditado (evita criar estoque no nome do cliente)

**Importante:** A deleção é permanente e não pode ser desfeita. Certifique-se de que realmente deseja deletar a saída antes de fazer a requisição.

## Como Identificar a Saída

A API identifica a saída através de:
- **Data**: Data da saída no formato `YYYY-MM-DD`
- **Cliente**: Nome exato do cliente
- **Produto**: Nome exato do produto
- **Quantidade**: Quantidades exatas (caixas, pacotes, unidades, kg) que correspondem ao campo `meta` da saída

**Importante:** 
- A busca é feita por correspondência exata (case-insensitive para cliente e produto)
- A quantidade deve corresponder exatamente à quantidade da saída na planilha
- Se houver múltiplas saídas com os mesmos critérios, a API retornará erro 409
- Use os mesmos valores que você usou ao criar a saída para garantir a correspondência

## Tratamento de Erros

### Códigos de Status HTTP

| Código | Significado | Ação Recomendada |
|--------|-------------|------------------|
| 200 | Deletado com sucesso | Nenhuma ação necessária |
| 400 | Erro de validação | Verifique se os dados estão no formato correto |
| 401 | Não autorizado | Verifique se a API key está correta |
| 404 | Saída não encontrada | Verifique se os critérios correspondem a uma saída existente |
| 409 | Múltiplas saídas encontradas | Use critérios mais específicos ou forneça o rowId |
| 500 | Erro interno do servidor | Entre em contato com o suporte |

### Boas Práticas

1. **Sempre trate erros**: Implemente tratamento de erros adequado no seu código
2. **Use os mesmos valores da criação**: Use exatamente os mesmos valores (data, cliente, produto, quantidade) que você usou ao criar a saída
3. **Confirme antes de deletar**: Em sistemas críticos, implemente uma confirmação antes de deletar
4. **Mantenha logs**: Registre todas as deleções para auditoria
5. **Armazene os dados da criação**: Quando criar uma saída, armazene os dados (data, cliente, produto, quantidade) para poder deletá-la depois se necessário
6. **Trate múltiplas correspondências**: Se receber erro 409, você pode precisar adicionar mais critérios (como observação) ou usar o rowId diretamente

## Limitações e Considerações

- A deleção é permanente e irreversível
- O estoque só é creditado se o cliente tiver tipo de estoque definido
- Se a saída não tinha quantidades realizadas, o estoque não será afetado
- A foto associada à saída (se houver) não é deletada do Google Drive automaticamente
- A busca é feita por correspondência exata de data, cliente, produto e quantidade
- Se houver múltiplas saídas com os mesmos critérios, você receberá erro 409
- A comparação de cliente e produto é case-insensitive (não diferencia maiúsculas/minúsculas)
- A quantidade deve corresponder exatamente à quantidade da saída (campo `meta`)

## Suporte

Para dúvidas, problemas ou solicitação de API keys, entre em contato com o administrador do sistema.

## Changelog

### Versão 1.0.0 (2024-01-15)
- Versão inicial da API pública de deleção de saídas
- Suporte a autenticação por API key
- Remoção de saídas com ajuste automático de estoque
- Resposta detalhada com informações da saída deletada

