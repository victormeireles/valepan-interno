import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { resolveReferenceEndMs } from './painel-producao-areas';

describe('resolveReferenceEndMs', () => {
  it('usa a hora atual na data civil, não 07:00 + relógio', () => {
    const agoraMin = 14 * 60 + 30;
    expect(resolveReferenceEndMs('2026-08-17', agoraMin)).toBe(
      brazilClockUtcMs('2026-08-17', '14:30'),
    );
  });
});
