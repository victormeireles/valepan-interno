import { describe, expect, it } from 'vitest';
import { InternoAppUrlResolver } from './interno-app-url-resolver';

describe('InternoAppUrlResolver', () => {
  const resolver = new InternoAppUrlResolver();

  it('usa AUTH_URL quando presente', () => {
    expect(
      resolver.resolve({ AUTH_URL: 'https://interno.valepan.com/' }),
    ).toBe('https://interno.valepan.com');
  });

  it('cai em localhost no desenvolvimento', () => {
    expect(resolver.resolve({ NODE_ENV: 'development' })).toBe(
      'http://localhost:3001',
    );
  });
});
