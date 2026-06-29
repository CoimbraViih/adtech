'use client'

import { useRef, useEffect, useState, type FormEvent } from 'react'
import { useAssistant } from './assistant-context'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Send, Loader2, Bot } from 'lucide-react'

const QUICK_PROMPTS = [
  'Como estão minhas campanhas?',
  'Quantas conversões tive essa semana?',
  'O que é ROAS?',
] as const

export function AssistantPanel() {
  const {
    isOpen,
    close,
    messages,
    isStreaming,
    pendingAction,
    sendMessage,
    confirmAction,
    rejectAction,
  } = useAssistant()

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    sendMessage(text)
  }

  function handleQuickPrompt(prompt: string) {
    if (isStreaming) return
    sendMessage(prompt)
  }

  const lastMessage = messages[messages.length - 1]

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) close() }}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[480px] flex flex-col p-0"
          style={{
            backgroundColor: 'var(--adflow-surface)',
            borderLeft: '1px solid var(--adflow-border)',
          }}
        >
          {/* Header */}
          <SheetHeader
            className="px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--adflow-border)' }}
          >
            <SheetTitle
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: 'var(--adflow-fg)' }}
            >
              <Bot className="w-4 h-4" style={{ color: 'var(--adflow-accent)' }} />
              Assistente AdFlow
            </SheetTitle>
          </SheetHeader>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.length === 0 && (
              <div
                className="text-center text-sm mt-8 space-y-2"
                style={{ color: 'var(--adflow-fg-muted)' }}
              >
                <Bot
                  className="w-8 h-8 mx-auto opacity-60"
                  style={{ color: 'var(--adflow-accent)' }}
                />
                <p>Olá! Pergunte sobre suas campanhas, métricas ou como usar a plataforma.</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleQuickPrompt(prompt)}
                      disabled={isStreaming}
                      className="px-3 py-1.5 rounded-md text-xs transition-colors disabled:opacity-50"
                      style={{
                        border: '1px solid var(--adflow-border)',
                        color: 'var(--adflow-fg-muted)',
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isLastAssistant =
                msg.role === 'assistant' && msg === lastMessage && isStreaming

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className="max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
                    style={
                      msg.role === 'user'
                        ? {
                            backgroundColor: 'var(--adflow-accent)',
                            color: '#ffffff',
                          }
                        : {
                            backgroundColor: 'var(--adflow-border)',
                            color: 'var(--adflow-fg)',
                          }
                    }
                  >
                    {msg.content}
                    {isLastAssistant && (
                      <span
                        className="inline-block w-1 h-3 ml-1 animate-pulse rounded-sm align-middle"
                        style={{ backgroundColor: 'var(--adflow-accent)' }}
                      />
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={bottomRef} />
          </div>

          {/* Input form */}
          <form
            onSubmit={handleSubmit}
            className="px-4 py-3 flex gap-2 shrink-0"
            style={{ borderTop: '1px solid var(--adflow-border)' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo..."
              disabled={isStreaming}
              className="flex-1 rounded-md px-3 py-2 text-sm outline-none disabled:opacity-50"
              style={{
                backgroundColor: 'var(--adflow-border)',
                color: 'var(--adflow-fg)',
              }}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isStreaming || !input.trim()}
              style={{
                backgroundColor: 'var(--adflow-accent)',
                color: '#ffffff',
              }}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Action confirmation dialog */}
      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => { if (!open) rejectAction() }}
      >
        <DialogContent
          style={{
            backgroundColor: 'var(--adflow-surface)',
            border: '1px solid var(--adflow-border)',
            color: 'var(--adflow-fg)',
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--adflow-fg)' }}>
              Confirmar ação
            </DialogTitle>
            <DialogDescription style={{ color: 'var(--adflow-fg-muted)' }}>
              {pendingAction?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={rejectAction}
              style={{
                borderColor: 'var(--adflow-border)',
                color: 'var(--adflow-fg-muted)',
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmAction}
              style={{
                backgroundColor: 'var(--adflow-accent)',
                color: '#ffffff',
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
