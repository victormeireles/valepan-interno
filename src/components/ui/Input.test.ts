import { describe, expect, it } from 'vitest';
import { controlInputClassName } from './input-class-name';

describe('controlInputClassName', () => {
  it('usa w-full por padrão', () => {
    expect(controlInputClassName({})).toContain('w-full');
  });

  it('omite w-full quando fullWidth é false', () => {
    const cls = controlInputClassName({ fullWidth: false });
    expect(cls).not.toContain('w-full');
    expect(cls).toContain('w-auto');
    expect(cls).toContain('shrink-0');
  });
});
