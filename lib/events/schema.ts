export type ConsentState = 'granted' | 'denied' | 'unknown';

export type AdFlowEvent = {
  event_id:        string;
  organization_id: string;
  workspace_id:    string;
  pixel_id:        string;
  event_type:      string;
  event_name:      string | null;
  session_id:      string | null;
  url:             string | null;
  referrer:        string | null;
  ip:              string | null;
  user_agent:      string | null;
  value:           number | null;
  currency:        string | null;
  properties:      Record<string, unknown>;
  consent_state:   ConsentState;
  event_time:      string; // ISO8601
};
