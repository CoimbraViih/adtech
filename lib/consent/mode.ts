import type { ConsentState } from '@/lib/events/schema';

export type GcmSignals = {
  analytics_storage?: 'granted' | 'denied';
  ad_storage?: 'granted' | 'denied';
  ad_user_data?: 'granted' | 'denied';
  ad_personalization?: 'granted' | 'denied';
};

// analytics_storage é o sinal primário para rastreamento de eventos
// ad_* signals controlam publicidade mas não afetam consent de analytics
export function gcmToConsentState(signals: GcmSignals): ConsentState {
  if (signals.analytics_storage === 'granted') return 'granted';
  if (signals.analytics_storage === 'denied') return 'denied';
  return 'unknown';
}

export function normalizeConsentState(raw: unknown): ConsentState {
  if (raw === 'granted' || raw === 'denied' || raw === 'unknown') return raw;
  return 'unknown';
}
