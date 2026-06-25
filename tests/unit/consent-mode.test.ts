import { describe, it, expect } from 'vitest';
import { gcmToConsentState, normalizeConsentState } from '@/lib/consent/mode';

describe('gcmToConsentState', () => {
  it('returns granted when analytics_storage is granted', () => {
    expect(gcmToConsentState({ analytics_storage: 'granted' })).toBe('granted');
  });

  it('returns denied when analytics_storage is denied', () => {
    expect(gcmToConsentState({ analytics_storage: 'denied' })).toBe('denied');
  });

  it('returns unknown when analytics_storage is absent', () => {
    expect(gcmToConsentState({})).toBe('unknown');
  });

  it('returns unknown when only ad_storage is denied and analytics_storage is absent', () => {
    expect(gcmToConsentState({ ad_storage: 'denied' })).toBe('unknown');
  });

  it('returns granted even if ad signals are denied', () => {
    expect(gcmToConsentState({ analytics_storage: 'granted', ad_storage: 'denied' })).toBe('granted');
  });
});

describe('normalizeConsentState', () => {
  it('passes through valid states', () => {
    expect(normalizeConsentState('granted')).toBe('granted');
    expect(normalizeConsentState('denied')).toBe('denied');
    expect(normalizeConsentState('unknown')).toBe('unknown');
  });

  it('returns unknown for invalid values', () => {
    expect(normalizeConsentState('yes')).toBe('unknown');
    expect(normalizeConsentState(null)).toBe('unknown');
    expect(normalizeConsentState(undefined)).toBe('unknown');
    expect(normalizeConsentState(1)).toBe('unknown');
    expect(normalizeConsentState({})).toBe('unknown');
  });
});
