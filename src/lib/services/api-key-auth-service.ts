/**
 * Serviço responsável por validar API keys para autenticação de requisições externas
 */
export class ApiKeyAuthService {
  private readonly validApiKey: string | undefined;

  constructor() {
    this.validApiKey = process.env.API_KEY;
  }

  /**
   * Valida se a API key fornecida é válida
   * @param apiKey - API key fornecida na requisição
   * @returns true se a API key for válida, false caso contrário
   */
  public isValid(apiKey: string | null | undefined): boolean {
    if (!this.validApiKey) {
      // Se não houver API_KEY configurada, rejeita todas as requisições
      return false;
    }

    if (!apiKey) {
      return false;
    }

    return apiKey === this.validApiKey;
  }

  /**
   * Extrai a API key do header Authorization ou do header X-API-Key
   * @param request - Requisição HTTP
   * @returns API key encontrada ou null
   */
  public extractApiKey(request: Request): string | null {
    const authHeader = request.headers.get('Authorization');
    
    // Suporta "Bearer <token>" ou apenas o token
    if (authHeader) {
      const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      if (bearerMatch) {
        return bearerMatch[1];
      }
      return authHeader;
    }

    // Também suporta header X-API-Key
    const apiKeyHeader = request.headers.get('X-API-Key');
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    return null;
  }

  /**
   * Valida a requisição e retorna se é autenticada
   * @param request - Requisição HTTP
   * @returns true se autenticada, false caso contrário
   */
  public validateRequest(request: Request): boolean {
    const apiKey = this.extractApiKey(request);
    return this.isValid(apiKey);
  }
}

export const apiKeyAuthService = new ApiKeyAuthService();



