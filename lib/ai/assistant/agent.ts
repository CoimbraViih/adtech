import { getCredentialField } from '@/lib/integrations/credentials'
import { ASSISTANT_TOOLS, WRITE_TOOLS, executeTool } from './tools'
import { getKnowledgeContext } from './knowledge'
import type { AssistantMessage, ScreenContext, StreamEvent, AssistantAction } from './types'

type RunParams = {
  orgId: string
  messages: AssistantMessage[]
  context: ScreenContext
}

type OpenAIMessage = {
  role: string
  content: string | null
  tool_call_id?: string
  name?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

type OpenAIStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null
      tool_calls?: Array<{
        index: number
        id?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string | null
  }>
}

function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

function toolNameToActionType(toolName: string): AssistantAction['type'] {
  if (toolName === 'pauseCampaign') return 'pause_campaign'
  if (toolName === 'resumeCampaign') return 'resume_campaign'
  // Fallback — should never happen if WRITE_TOOLS stays in sync with AssistantAction['type']
  return 'pause_campaign'
}

function buildActionDescription(toolName: string, args: Record<string, unknown>): string {
  const name = args.campaignName ?? args.campaignId ?? 'campanha desconhecida'
  if (toolName === 'pauseCampaign') return `Pausar campanha "${String(name)}"`
  if (toolName === 'resumeCampaign') return `Ativar campanha "${String(name)}"`
  return toolName
}

export async function runAssistantStream(params: RunParams): Promise<ReadableStream<Uint8Array>> {
  const { orgId, messages, context } = params
  const apiKey = await getCredentialField(orgId, 'openai', 'api_key', 'OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada.')

  const system = `Você é o Assistente AdFlow, um especialista em marketing digital e campanhas pagas integrado à plataforma AdFlow.
Você tem acesso a dados reais do workspace do usuário via tools. Sempre cite a fonte dos dados (ex: "Com base nos dados de campaign_metrics_daily...").
Quando responder sobre métricas, seja específico e mencione os valores exatos retornados pelas tools.
Quando propor ações que modifiquem dados (pausar/ativar campanhas), use as tools correspondentes — elas serão enviadas para confirmação do usuário antes de executar.
Tela atual do usuário: ${context.page}
Workspace ID: ${context.workspaceId}

${getKnowledgeContext()}
`

  const openaiMessages: OpenAIMessage[] = [
    { role: 'system', content: system },
    ...messages.map((m): OpenAIMessage => {
      if (m.role === 'tool') {
        return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id ?? '', name: m.tool_name }
      }
      return { role: m.role, content: m.content }
    }),
  ]

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await runLoop(controller, openaiMessages, apiKey, context)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro inesperado'
        controller.enqueue(encodeEvent({ type: 'error', message: msg }))
      } finally {
        controller.enqueue(encodeEvent({ type: 'done' }))
        controller.close()
      }
    },
  })
}

async function runLoop(
  controller: ReadableStreamDefaultController<Uint8Array>,
  messages: OpenAIMessage[],
  apiKey: string,
  context: ScreenContext,
  depth = 0
): Promise<void> {
  if (depth > 5) throw new Error('Limite de chamadas de tool atingido.')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      stream: true,
      messages,
      tools: ASSISTANT_TOOLS,
      tool_choice: 'auto',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[assistant] OpenAI error', res.status, err)
    throw new Error('Erro ao processar requisição com IA.')
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // Accumulate streaming response
  let fullContent = ''
  const toolCalls: Array<{ id: string; name: string; args: string }> = []
  let currentToolIdx = -1

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      let chunk: OpenAIStreamChunk
      try {
        chunk = JSON.parse(trimmed.slice(6)) as OpenAIStreamChunk
      } catch {
        continue
      }

      const delta = chunk.choices?.[0]?.delta
      if (!delta) continue

      if (delta.content) {
        fullContent += delta.content
        controller.enqueue(encodeEvent({ type: 'text_delta', content: delta.content }))
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.index === undefined || tc.index === null) continue
          if (tc.index !== currentToolIdx) {
            currentToolIdx = tc.index
            toolCalls[tc.index] = { id: tc.id ?? '', name: tc.function?.name ?? '', args: '' }
          }
          if (tc.function?.name) toolCalls[tc.index].name = tc.function.name
          if (tc.id) toolCalls[tc.index].id = tc.id
          if (tc.function?.arguments) toolCalls[tc.index].args += tc.function.arguments
        }
      }
    }
  }

  // No tool calls — we're done
  if (toolCalls.length === 0) return

  // Process each tool call
  const assistantMessage: OpenAIMessage = {
    role: 'assistant',
    content: fullContent || null,
    tool_calls: toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.name, arguments: tc.args },
    })),
  }

  const toolResults: OpenAIMessage[] = []

  for (const tc of toolCalls) {
    let args: Record<string, unknown> = {}
    try { args = JSON.parse(tc.args || '{}') as Record<string, unknown> } catch { /* ignore */ }

    if (WRITE_TOOLS.has(tc.name)) {
      // Emit action_required — client will confirm before execution
      const action: AssistantAction = {
        id: tc.id,
        type: toolNameToActionType(tc.name),
        payload: { ...args },
        description: buildActionDescription(tc.name, args),
      }
      controller.enqueue(encodeEvent({ type: 'action_required', action }))
      // Return a synthetic tool result so the conversation stays coherent
      toolResults.push({
        role: 'tool',
        tool_call_id: tc.id,
        name: tc.name,
        content: JSON.stringify({ status: 'awaiting_user_confirmation' }),
      })
    } else {
      try {
        const result = await executeTool(tc.name, args, context)
        controller.enqueue(encodeEvent({ type: 'tool_result', name: tc.name, summary: `Dados de ${tc.name} carregados.` }))
        toolResults.push({ role: 'tool', tool_call_id: tc.id, name: tc.name, content: result })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Erro'
        toolResults.push({ role: 'tool', tool_call_id: tc.id, name: tc.name, content: JSON.stringify({ error: errMsg }) })
      }
    }
  }

  // If every tool call was a write-tool, the loop waits for user confirmation — don't recurse
  if (toolCalls.every((tc) => WRITE_TOOLS.has(tc.name))) return

  await runLoop(
    controller,
    [...messages, assistantMessage, ...toolResults],
    apiKey,
    context,
    depth + 1
  )
}
