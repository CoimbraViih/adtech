import { describe, it, expect } from 'vitest';
import { parsePixelEvent } from '@/lib/pixel/validate';

describe('parsePixelEvent — consent fields', () => {
  const base = { event_type: 'page_view' };

  it('accepts consent_state granted', () => {
    const r = parsePixelEvent({ ...base, consent_state: 'granted' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.consent_state).toBe('granted');
  });

  it('accepts consent_state denied', () => {
    const r = parsePixelEvent({ ...base, consent_state: 'denied' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.consent_state).toBe('denied');
  });

  it('defaults consent_state to unknown when absent', () => {
    const r = parsePixelEvent(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.consent_state).toBe('unknown');
  });

  it('rejects invalid consent_state', () => {
    const r = parsePixelEvent({ ...base, consent_state: 'yes' });
    expect(r.success).toBe(false);
  });

  it('accepts valid gcm_signals', () => {
    const r = parsePixelEvent({
      ...base,
      gcm_signals: { analytics_storage: 'granted', ad_storage: 'denied' },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.gcm_signals?.analytics_storage).toBe('granted');
  });

  it('accepts missing gcm_signals', () => {
    const r = parsePixelEvent(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.gcm_signals).toBeUndefined();
  });
});
