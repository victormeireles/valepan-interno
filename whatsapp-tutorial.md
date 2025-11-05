Documento passo a passo para implementar o envio de mensagens WhatsApp:

# Guia Completo: Implementação de Envio de Mensagens WhatsApp com Z-API

## 📋 Visão Geral

Este guia explica como implementar o envio de mensagens WhatsApp usando a Z-API (https://z-api.io/). A implementação inclui:

- Envio de mensagens de texto
- Verificação de status da instância
- Formatação de números de telefone brasileiros
- Tratamento de erros

---

## 🔧 Passo 1: Configuração das Variáveis de Ambiente - **JA FEITO**

Adicione as seguintes variáveis no arquivo `.env.local`:

```env
# ==================== Z-API (WhatsApp) ====================
ZAPI_INSTANCE_ID=sua-instancia-id
ZAPI_TOKEN=seu-token-aqui
ZAPI_CLIENT_TOKEN=seu-client-token-aqui
ZAPI_BASE_URL=https://api.z-api.io
```

## 📦 Passo 2: Criar o Manager Z-API

Crie o arquivo `lib/managers/zapi-manager.ts`:

```typescript
/**
 * Z-API Manager
 * Gerencia comunicação com a API do WhatsApp via Z-API
 * 
 * Documentação: https://developer.z-api.io/
 */

import { formatPhoneNumber } from "@/lib/validators/whatsapp";

/**
 * Configuração da Z-API
 */
interface ZApiConfig {
  instanceId: string;
  token: string;
  clientToken: string;
  baseUrl: string;
}

/**
 * Resposta da API Z-API ao enviar mensagem
 */
interface ZApiSendMessageResponse {
  zaapId: string;
  messageId: string;
  id: string;
}

/**
 * Resposta da API Z-API ao checar status
 */
interface ZApiStatusResponse {
  connected: boolean;
  session: string;
  smartphoneConnected: boolean;
}

/**
 * Manager para interações com Z-API
 */
export class ZApiManager {
  private config: ZApiConfig;

  constructor(config?: Partial<ZApiConfig>) {
    // Carrega configuração do ambiente ou usa valores passados
    this.config = {
      instanceId: config?.instanceId ?? process.env.ZAPI_INSTANCE_ID ?? "",
      token: config?.token ?? process.env.ZAPI_TOKEN ?? "",
      clientToken: config?.clientToken ?? process.env.ZAPI_CLIENT_TOKEN ?? "",
      baseUrl: config?.baseUrl ?? process.env.ZAPI_BASE_URL ?? "https://api.z-api.io",
    };

    // Valida que as credenciais estão configuradas
    if (!this.config.instanceId || !this.config.token || !this.config.clientToken) {
      throw new Error(
        "Z-API não configurado. Defina ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN no .env.local"
      );
    }
  }

  /**
   * Monta URL base para requisições à API
   */
  private getBaseUrl(): string {
    return `${this.config.baseUrl}/instances/${this.config.instanceId}/token/${this.config.token}`;
  }

  /**
   * Envia mensagem de texto via WhatsApp
   * 
   * @param phone - Número de telefone no formato +5511999999999
   * @param message - Mensagem a enviar
   * @returns Promise com resposta da API
   */
  async sendMessage(phone: string, message: string): Promise<ZApiSendMessageResponse> {
    const formattedPhone = formatPhoneNumber(phone);

    try {
      const response = await fetch(`${this.getBaseUrl()}/send-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": this.config.clientToken,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Z-API Error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data: ZApiSendMessageResponse = await response.json();
      return data;
    } catch (error) {
      console.error("💥 [Z-API] Erro ao enviar mensagem:", error);
      throw error;
    }
  }

  /**
   * Verifica se a instância está conectada ao WhatsApp
   * 
   * @returns Promise<boolean> - true se conectada, false caso contrário
   */
  async isInstanceConnected(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": this.config.clientToken,
        },
      });

      if (!response.ok) {
        console.error("❌ [Z-API] Erro ao checar status da instância:", response.status);
        return false;
      }

      const data: ZApiStatusResponse = await response.json();
      
      const isConnected = data.connected && data.smartphoneConnected;
      
      console.warn("📱 [Z-API] Status da instância:", {
        connected: data.connected,
        smartphoneConnected: data.smartphoneConnected,
        session: data.session,
      });

      return isConnected;
    } catch (error) {
      console.error("💥 [Z-API] Erro ao verificar conexão:", error);
      return false;
    }
  }

  /**
   * Testa conexão com a API
   * Útil para verificar se as credenciais estão corretas
   * 
   * @returns Promise<boolean> - true se conseguiu se conectar
   */
  async testConnection(): Promise<boolean> {
    try {
      const isConnected = await this.isInstanceConnected();
      if (!isConnected) {
        console.warn("⚠️ [Z-API] Instância não está conectada. Leia o QRCode no painel da Z-API.");
        return false;
      }
      
      console.warn("✅ [Z-API] Conexão OK - Instância conectada e pronta para uso.");
      return true;
    } catch (error) {
      console.error("💥 [Z-API] Erro ao testar conexão:", error);
      return false;
    }
  }
}

/**
 * Instância singleton do ZApiManager
 * Usa as variáveis de ambiente configuradas
 */
export const zapiManager = new ZApiManager();
```

---

## 🔢 Passo 3: Criar Validadores de Telefone

Crie o arquivo `lib/validators/whatsapp.ts`:

```typescript
import { z } from "zod";

/**
 * WhatsApp Validators
 * Validações para telefone brasileiro
 */

/**
 * Formata telefone para padrão brasileiro com DDI
 * Remove caracteres especiais e adiciona +55 se necessário
 * 
 * @example
 * formatPhoneNumber("(11) 99999-9999") // "+5511999999999"
 * formatPhoneNumber("11999999999") // "+5511999999999"
 * formatPhoneNumber("+5511999999999") // "+5511999999999"
 */
export function formatPhoneNumber(phone: string): string {
  // Remove todos os caracteres que não sejam números ou +
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // Remove + do início se existir
  cleaned = cleaned.replace(/^\+/, "");
  
  // Se já começa com 55, apenas adiciona o +
  if (cleaned.startsWith("55")) {
    return `+${cleaned}`;
  }
  
  // Se não começa com 55, adiciona +55
  return `+55${cleaned}`;
}

/**
 * Valida formato de telefone brasileiro
 * Aceita formatos: (11) 99999-9999, 11999999999, +5511999999999
 * 
 * @param phone - Número de telefone a validar
 * @returns true se válido, false caso contrário
 */
export function isValidBrazilianPhone(phone: string): boolean {
  // Remove caracteres especiais
  const cleaned = phone.replace(/[^\d]/g, "");
  
  // Verifica se tem 10 ou 11 dígitos (com DDD)
  // ou 12-13 dígitos (com DDI 55)
  if (cleaned.length === 10 || cleaned.length === 11) {
    return true;
  }
  
  if ((cleaned.length === 12 || cleaned.length === 13) && cleaned.startsWith("55")) {
    return true;
  }
  
  return false;
}

/**
 * Schema Zod para validar telefone
 */
export const whatsappPhoneSchema = z.string()
  .min(10, "Telefone inválido. Use o formato: (11) 99999-9999")
  .max(20, "Telefone muito longo")
  .refine(isValidBrazilianPhone, {
    message: "Telefone inválido. Use o formato: (11) 99999-9999",
  });
```

---

## 🚀 Passo 4: Usar o Manager para Enviar Mensagens

### Exemplo 1: Enviar mensagem simples (Server Action)

Crie um arquivo `app/actions/whatsapp.ts`:

```typescript
"use server";

import { zapiManager } from "@/lib/managers/zapi-manager";
import { formatPhoneNumber } from "@/lib/validators/whatsapp";
import { whatsappPhoneSchema } from "@/lib/validators/whatsapp";

export async function enviarMensagemWhatsApp(
  telefone: string,
  mensagem: string
) {
  try {
    // Valida formato do telefone
    const validationResult = whatsappPhoneSchema.safeParse(telefone);
    if (!validationResult.success) {
      return {
        success: false,
        message: "Telefone inválido. Use o formato: (11) 99999-9999",
      };
    }

    // Verifica se a instância está conectada
    const isConnected = await zapiManager.isInstanceConnected();
    if (!isConnected) {
      return {
        success: false,
        message: "Serviço de WhatsApp temporariamente indisponível.",
      };
    }

    // Envia mensagem
    const response = await zapiManager.sendMessage(telefone, mensagem);

    return {
      success: true,
      message: "Mensagem enviada com sucesso!",
      messageId: response.messageId,
    };
  } catch (error) {
    console.error("Erro ao enviar mensagem WhatsApp:", error);
    return {
      success: false,
      message: "Erro ao enviar mensagem. Tente novamente.",
    };
  }
}
```

### Exemplo 2: Usar diretamente no código

```typescript
import { zapiManager } from "@/lib/managers/zapi-manager";

// Verificar se está conectado
const isConnected = await zapiManager.isInstanceConnected();

if (isConnected) {
  // Enviar mensagem
  const response = await zapiManager.sendMessage(
    "+5511999999999",
    "Olá! Esta é uma mensagem de teste."
  );
  
  console.log("Mensagem enviada:", response.messageId);
} else {
  console.error("Instância não está conectada");
}
```

---

## 📝 Resumo da Estrutura de Arquivos

```
lib/
  ├── managers/
  │   └── zapi-manager.ts          # Manager principal da Z-API
  └── validators/
      └── whatsapp.ts              # Validações de telefone

app/
  └── actions/
      └── whatsapp.ts              # Server Actions (opcional)

.env.local                         # Variáveis de ambiente
```

---

## 🔑 Pontos Importantes

### 1. Formato de Telefone
- O manager aceita telefones em vários formatos: `(11) 99999-9999`, `11999999999`, `+5511999999999`
- A função `formatPhoneNumber()` converte automaticamente para `+5511999999999`

### 2. Headers Obrigatórios
- Todas as requisições precisam do header `Client-Token`
- O `Content-Type` deve ser `application/json`

### 3. Estrutura da URL
```
https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/send-text
https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/status
```

### 4. Tratamento de Erros
- Sempre verificar se a instância está conectada antes de enviar
- Tratar erros de rede e respostas da API
- Validar formato do telefone antes de enviar

---

## 🧪 Testando a Implementação

### 1. Testar conexão:

```typescript
import { zapiManager } from "@/lib/managers/zapi-manager";

const isConnected = await zapiManager.testConnection();
console.log("Conectado:", isConnected);
```

### 2. Enviar mensagem de teste:

```typescript
import { zapiManager } from "@/lib/managers/zapi-manager";

try {
  const response = await zapiManager.sendMessage(
    "+5511999999999", // Seu número de teste
    "Teste de mensagem WhatsApp"
  );
  console.log("✅ Sucesso:", response);
} catch (error) {
  console.error("❌ Erro:", error);
}
```

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Z-API não configurado" | Verificar se as variáveis estão no `.env.local` |
| "Instância não conectada" | Ler QRCode novamente no painel da Z-API |
| "Erro 401" | Verificar se `ZAPI_TOKEN` e `ZAPI_CLIENT_TOKEN` estão corretos |
| "Telefone inválido" | Verificar formato do número (deve ter DDD) |

---

## 📚 Documentação Adicional

- **Z-API Docs**: https://developer.z-api.io/
- **Painel Z-API**: https://z-api.io/

---

## ✅ Checklist de Implementação

- [X] Criar conta na Z-API
- [X] Criar instância e obter credenciais
- [X] Conectar WhatsApp lendo QRCode
- [X] Adicionar variáveis no `.env.local`
- [ ] Criar `lib/managers/zapi-manager.ts`
- [ ] Criar `lib/validators/whatsapp.ts`
- [ ] Testar conexão com `testConnection()`
- [ ] Enviar primeira mensagem de teste

---

Este documento cobre o essencial para enviar mensagens WhatsApp com Z-API. Adapte conforme necessário ao seu projeto.