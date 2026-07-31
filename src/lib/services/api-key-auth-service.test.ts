import { afterEach, describe, expect, it } from 'vitest';
import { ApiKeyAuthService } from './api-key-auth-service';

const originalApiKey = process.env.API_KEY;
const originalValepanApiKey = process.env.VALEPAN_INTERNO_API_KEY;

afterEach(() => {
  process.env.API_KEY = originalApiKey;
  process.env.VALEPAN_INTERNO_API_KEY = originalValepanApiKey;
});

describe('ApiKeyAuthService', () => {
  it('valida Authorization Bearer usando VALEPAN_INTERNO_API_KEY', () => {
    delete process.env.API_KEY;
    process.env.VALEPAN_INTERNO_API_KEY = 'segredo-valepan';

    const service = new ApiKeyAuthService();
    const request = new Request('http://localhost/api/public/saidas/delete', {
      headers: { Authorization: 'Bearer segredo-valepan' },
    });

    expect(service.validateRequest(request)).toBe(true);
  });
});
