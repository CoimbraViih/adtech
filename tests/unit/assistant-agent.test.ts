import { describe, it, expect, vi } from 'vitest'
import type { StreamEvent } from '@/lib/ai/assistant/types'

vi.mock('@/lib/integrations/credentials', () => ({
  getCredentialField: vi.fn().mockResolvedValue('test-key'),
}))

vi.mock('@/lib/ai/assistant/tools', () => ({
  ASSISTANT_TOOLS: [],
  WRITE_TOOLS: new Set(),
  executeTool: vi.fn(),
}))

vi.mock('@/lib/ai/assistant/knowledge', () => ({
  getKnowledgeContext: () => 'AdFlow knowledge',
}))

// Mock fetch for OpenAI
global.fetch = vi.fn()

import { runAssistantStream } from '@/lib/ai/assistant/agent'

function buildSseChunk(delta: object): string {
  return `data: ${JSON.stringify({ choices: [{ delta, finish_reason: null }] })}\n\n`
}

function buildDoneChunk(): string {
  return `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`
}

async function collectEvents(stream: ReadableStream<Uint8Array>): Promise<StreamEvent[]> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const events: StreamEvent[] = []
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value)
    const lines = buffer.split('\n\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.replace(/^data: /, '').trim()
      if (trimmed && trimmed !== '[DONE]') {
        try { events.push(JSON.parse(trimmed) as StreamEvent) } catch { /* ignore */ }
      }
    }
  }
  return events
}

describe('runAssistantStream', () => {
  it('streams text_delta events and done', async () => {
    const body = [
      buildSseChunk({ content: 'Olá' }),
      buildSseChunk({ content: ', tudo bem?' }),
      buildDoneChunk(),
      'data: [DONE]\n\n',
    ].join('')

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(body))
          controller.close()
        },
      }),
    } as unknown as Response)

    const stream = await runAssistantStream({
      orgId: 'org-1',
      messages: [{ role: 'user', content: 'Olá' }],
      context: { page: '/dashboard', workspaceId: 'ws-1', organizationId: 'org-1' },
    })

    const events = await collectEvents(stream)
    const textEvents = events.filter((e) => e.type === 'text_delta')
    expect(textEvents.length).toBeGreaterThan(0)
    const doneEvents = events.filter((e) => e.type === 'done')
    expect(doneEvents.length).toBe(1)
  })
})
