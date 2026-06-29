'use client'

import { Bot } from 'lucide-react'
import { useAssistant } from './assistant-context'
import { cn } from '@/lib/utils'

export function AssistantTrigger() {
  const { open, isOpen } = useAssistant()

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Abrir assistente IA"
      className={cn(
        'fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200',
        isOpen && 'opacity-0 pointer-events-none'
      )}
      style={{
        backgroundColor: 'var(--adflow-accent)',
        color: '#ffffff',
      }}
    >
      <Bot className="w-5 h-5" />
    </button>
  )
}
