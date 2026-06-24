import { describe, it, expect } from 'vitest';
import type { AdFlowEvent, ConsentState } from '@/lib/events/schema';

describe('AdFlowEvent schema', () => {
  it('accepts a fully-populated event object', () => {
    const event: AdFlowEvent = {
      event_id: 'uuid-1', organization_id: 'org-1', workspace_id: 'ws-1',
      pixel_id: 'px-1', event_type: 'pageview', event_name: null,
      session_id: 's-1', url: 'https://example.com', referrer: null,
      ip: '1.2.3.x', user_agent: 'Mozilla', value: 99.90, currency: 'BRL',
      properties: { campaign_id: 'c-1' }, consent_state: 'unknown',
      event_time: '2026-06-23T00:00:00.000Z',
    };
    expect(event.event_id).toBe('uuid-1');
    expect(event.consent_state).toBe('unknown');
    expect(event.properties).toEqual({ campaign_id: 'c-1' });
  });

  it('accepts all three consent_state values', () => {
    const states: ConsentState[] = ['granted', 'denied', 'unknown'];
    expect(states).toHaveLength(3);
  });

  it('accepts null for all optional fields', () => {
    const event: AdFlowEvent = {
      event_id: 'uuid-2', organization_id: 'org-2', workspace_id: 'ws-2',
      pixel_id: 'px-2', event_type: 'conversion', event_name: null,
      session_id: null, url: null, referrer: null, ip: null,
      user_agent: null, value: null, currency: null, properties: {},
      consent_state: 'granted', event_time: '2026-06-23T00:00:00.000Z',
    };
    expect(event.value).toBeNull();
    expect(event.properties).toEqual({});
  });
});
