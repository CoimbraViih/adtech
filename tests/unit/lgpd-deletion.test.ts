import { describe, it, expect } from 'vitest';

// Testa lógica de PII strip pura — sem I/O
describe('LGPD PII strip logic', () => {
  function stripPiiFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const { session_id: _s, ip: _i, user_agent: _u, ...safe } = payload;
    return safe;
  }

  it('removes session_id, ip, user_agent from payload', () => {
    const payload = {
      event_id: 'abc',
      session_id: 'sid-123',
      ip: '1.2.3.x',
      user_agent: 'Mozilla/5.0',
      event_type: 'page_view',
    };
    const stripped = stripPiiFromPayload(payload);
    expect(stripped).not.toHaveProperty('session_id');
    expect(stripped).not.toHaveProperty('ip');
    expect(stripped).not.toHaveProperty('user_agent');
    expect(stripped).toHaveProperty('event_id', 'abc');
    expect(stripped).toHaveProperty('event_type', 'page_view');
  });

  it('leaves payloads without PII fields unchanged in shape', () => {
    const payload = { event_id: 'xyz', event_type: 'purchase', value: 99 };
    const stripped = stripPiiFromPayload(payload);
    expect(stripped).toEqual(payload);
  });
});
