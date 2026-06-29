'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { AssistantAction, AssistantMessage, ScreenContext, StreamEvent } from '@/lib/ai/assistant/types'

export type UIMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

type State = {
  isOpen: boolean
  messages: UIMessage[]
  isStreaming: boolean
  pendingAction: AssistantAction | null
  screenContext: ScreenContext
}

type Action =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'ADD_USER_MESSAGE'; id: string; content: string }
  | { type: 'START_ASSISTANT_MESSAGE'; id: string }
  | { type: 'APPEND_ASSISTANT_DELTA'; id: string; delta: string }
  | { type: 'FINISH_STREAMING' }
  | { type: 'SET_PENDING_ACTION'; action: AssistantAction }
  | { type: 'CLEAR_PENDING_ACTION' }
  | { type: 'SET_SCREEN_CONTEXT'; ctx: Partial<ScreenContext> }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true }
    case 'CLOSE':
      return { ...state, isOpen: false }
    case 'ADD_USER_MESSAGE':
      return { ...state, messages: [...state.messages, { id: action.id, role: 'user', content: action.content }] }
    case 'START_ASSISTANT_MESSAGE':
      return { ...state, isStreaming: true, messages: [...state.messages, { id: action.id, role: 'assistant', content: '' }] }
    case 'APPEND_ASSISTANT_DELTA': {
      const msgs = state.messages.map((m) =>
        m.id === action.id ? { ...m, content: m.content + action.delta } : m
      )
      return { ...state, messages: msgs }
    }
    case 'FINISH_STREAMING':
      return { ...state, isStreaming: false }
    case 'SET_PENDING_ACTION':
      return { ...state, pendingAction: action.action }
    case 'CLEAR_PENDING_ACTION':
      return { ...state, pendingAction: null }
    case 'SET_SCREEN_CONTEXT':
      return { ...state, screenContext: { ...state.screenContext, ...action.ctx } }
    default:
      return state
  }
}

type ContextValue = {
  isOpen: boolean
  open: () => void
  close: () => void
  messages: UIMessage[]
  isStreaming: boolean
  pendingAction: AssistantAction | null
  sendMessage: (text: string) => void
  confirmAction: () => void
  rejectAction: () => void
  screenContext: ScreenContext
  setScreenContext: (ctx: Partial<ScreenContext>) => void
}

const AssistantCtx = createContext<ContextValue | null>(null)

export function useAssistant(): ContextValue {
  const ctx = useContext(AssistantCtx)
  if (!ctx) throw new Error('useAssistant must be used inside AssistantProvider')
  return ctx
}

type ProviderProps = {
  children: ReactNode
  orgId: string
  workspaceId: string
}

export function AssistantProvider({ children, orgId, workspaceId }: ProviderProps) {
  const [state, dispatch] = useReducer(reducer, {
    isOpen: false,
    messages: [],
    isStreaming: false,
    pendingAction: null,
    screenContext: { page: '/', workspaceId, organizationId: orgId },
  })

  // Track API messages for context
  const apiMessagesRef = useRef<AssistantMessage[]>([])
  const assistantIdRef = useRef<string>('')

  const sendMessage = useCallback(async (text: string) => {
    if (state.isStreaming) return

    const userMsg: AssistantMessage = { role: 'user', content: text }
    apiMessagesRef.current = [...apiMessagesRef.current, userMsg]

    const userId = crypto.randomUUID()
    const assistantId = crypto.randomUUID()
    assistantIdRef.current = assistantId

    dispatch({ type: 'ADD_USER_MESSAGE', id: userId, content: text })
    dispatch({ type: 'START_ASSISTANT_MESSAGE', id: assistantId })

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          messages: apiMessagesRef.current,
          context: state.screenContext,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Falha na resposta do servidor')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullAssistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.replace(/^data: /, '').trim()
          if (!trimmed) continue

          let event: StreamEvent
          try { event = JSON.parse(trimmed) } catch { continue }

          if (event.type === 'text_delta') {
            fullAssistantContent += event.content
            dispatch({ type: 'APPEND_ASSISTANT_DELTA', id: assistantId, delta: event.content })
          } else if (event.type === 'action_required') {
            dispatch({ type: 'SET_PENDING_ACTION', action: event.action })
          } else if (event.type === 'done') {
            apiMessagesRef.current = [
              ...apiMessagesRef.current,
              { role: 'assistant', content: fullAssistantContent },
            ]
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de conexão'
      dispatch({ type: 'APPEND_ASSISTANT_DELTA', id: assistantId, delta: `\n\nErro: ${msg}` })
    } finally {
      dispatch({ type: 'FINISH_STREAMING' })
    }
  }, [state.isStreaming, state.screenContext, orgId])

  const confirmAction = useCallback(async () => {
    const action = state.pendingAction
    if (!action) return
    dispatch({ type: 'CLEAR_PENDING_ACTION' })

    const errorId = crypto.randomUUID()
    try {
      const res = await fetch('/api/assistant/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: action.type,
          payload: action.payload,
          orgId,
          workspaceId,
        }),
      })

      if (!res.ok) {
        dispatch({ type: 'START_ASSISTANT_MESSAGE', id: errorId })
        dispatch({ type: 'APPEND_ASSISTANT_DELTA', id: errorId, delta: 'Erro ao executar ação. Verifique as configurações da campanha e tente novamente.' })
        dispatch({ type: 'FINISH_STREAMING' })
      }
    } catch {
      dispatch({ type: 'START_ASSISTANT_MESSAGE', id: errorId })
      dispatch({ type: 'APPEND_ASSISTANT_DELTA', id: errorId, delta: 'Erro ao executar ação. Verifique as configurações da campanha e tente novamente.' })
      dispatch({ type: 'FINISH_STREAMING' })
    }
  }, [state.pendingAction, orgId, workspaceId])

  const rejectAction = useCallback(() => {
    dispatch({ type: 'CLEAR_PENDING_ACTION' })
  }, [])

  const setScreenContext = useCallback((ctx: Partial<ScreenContext>) => {
    dispatch({ type: 'SET_SCREEN_CONTEXT', ctx })
  }, [])

  return (
    <AssistantCtx.Provider value={{
      isOpen: state.isOpen,
      open: () => dispatch({ type: 'OPEN' }),
      close: () => dispatch({ type: 'CLOSE' }),
      messages: state.messages,
      isStreaming: state.isStreaming,
      pendingAction: state.pendingAction,
      sendMessage,
      confirmAction,
      rejectAction,
      screenContext: state.screenContext,
      setScreenContext,
    }}>
      {children}
    </AssistantCtx.Provider>
  )
}
