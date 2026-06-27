import { describe, it, expect } from 'vitest';
import { eventsToCSV } from '@/lib/export/csv';
import type { EventRow } from '@/lib/events/query';

describe('eventsToCSV', () => {
  it('produces correct CSV headers', () => {
    const csv = eventsToCSV([]);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toBe('id,event_type,url,referrer,campaign_id,value,currency,consent_state,event_time');
  });

  it('escapes commas in values', () => {
    const row: EventRow = {
      id: 'evt-1',
      event_type: 'pageview',
      url: 'https://example.com/path?a=1,b=2',
      referrer: null,
      campaign_id: null,
      value: null,
      currency: null,
      consent_state: 'granted',
      event_time: '2026-06-01T10:00:00Z',
    };
    const csv = eventsToCSV([row]);
    const dataLine = csv.split('\n')[1];
    // url contains a comma so it should be wrapped in quotes
    expect(dataLine).toContain('"https://example.com/path?a=1,b=2"');
  });

  it('handles null values as empty string', () => {
    const row: EventRow = {
      id: 'evt-2',
      event_type: 'conversion',
      url: null,
      referrer: null,
      campaign_id: null,
      value: null,
      currency: null,
      consent_state: 'denied',
      event_time: '2026-06-01T11:00:00Z',
    };
    const csv = eventsToCSV([row]);
    const dataLine = csv.split('\n')[1];
    // Nulls should render as empty — check that the line has the right number of commas
    // id,event_type,url,referrer,campaign_id,value,currency,consent_state,event_time
    const parts = dataLine.split(',');
    // url, referrer, campaign_id, value, currency are null → empty
    expect(parts[2]).toBe('');   // url
    expect(parts[3]).toBe('');   // referrer
    expect(parts[4]).toBe('');   // campaign_id
    expect(parts[5]).toBe('');   // value
    expect(parts[6]).toBe('');   // currency
  });
});
