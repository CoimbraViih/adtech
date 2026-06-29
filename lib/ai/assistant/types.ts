export type AssistantMessage = {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_name?: string;
};

export type ScreenContext = {
  page: string;        // e.g. '/campaigns', '/analytics'
  workspaceId: string;
  organizationId: string;
  campaignId?: string;
};

export type AssistantAction = {
  id: string;
  type: 'pause_campaign' | 'resume_campaign';
  payload: Record<string, unknown>;
  description: string; // human-readable summary shown in confirmation dialog
};

export type StreamEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_result'; name: string; summary: string }
  | { type: 'action_required'; action: AssistantAction }
  | { type: 'done' }
  | { type: 'error'; message: string };
