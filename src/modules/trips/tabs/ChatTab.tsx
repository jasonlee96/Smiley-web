import { useState, useRef, useEffect } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import { useTripChat, useSendChatMessage, useClearChat } from '../../../hooks/useTrips'
import type { ChatMutation } from '../../../types/trips'

const TYPING_SPEED = 10 // ms per character

function MutationChips({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, paddingLeft: 2 }}>
      {items.map((label, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, padding: '2px 8px', borderRadius: 20,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          color: '#10b981', fontFamily: 'IBM Plex Mono',
        }}>
          ✓ {label}
        </span>
      ))}
    </div>
  )
}

export default function ChatTab({ tripId }: { tripId: number }) {
  const qc = useQueryClient()
  const { data: messages = [], isLoading } = useTripChat(tripId)
  const send = useSendChatMessage(tripId)
  const clear = useClearChat()

  const [input, setInput] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)

  // Optimistic user message (shown while waiting for API response)
  const [pendingUserMsg, setPendingUserMsg] = useState<string | null>(null)

  // Typewriter state
  const [typingFull, setTypingFull] = useState<string | null>(null)
  const [typingDisplay, setTypingDisplay] = useState('')
  const [typingMutations, setTypingMutations] = useState<ChatMutation[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  const isTyping = typingFull !== null

  // Typewriter effect — one character at a time, then invalidate query when done
  useEffect(() => {
    if (typingFull === null) return
    if (typingDisplay.length >= typingFull.length) {
      qc.invalidateQueries({ queryKey: ['trips', tripId, 'chat'] })
      setTypingFull(null)
      setTypingDisplay('')
      setPendingUserMsg(null)
      return
    }
    const timer = setTimeout(() => {
      setTypingDisplay(typingFull.slice(0, typingDisplay.length + 1))
    }, TYPING_SPEED)
    return () => clearTimeout(timer)
  }, [typingDisplay, typingFull, tripId, qc])

  // Auto-scroll whenever content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, send.isPending, typingDisplay])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || send.isPending || isTyping) return
    const msg = input.trim()
    setInput('')
    setChatError(null)
    setPendingUserMsg(msg)
    try {
      const data = await send.mutateAsync(msg)
      setTypingMutations(data.mutations ?? [])
      setTypingFull(data.message)
      setTypingDisplay('')
    } catch (err: any) {
      // Restore message to input so user can resend (e.g. after phone lock drops connection)
      setPendingUserMsg(null)
      setInput(msg)
      const errMsg = err?.response?.data?.error ?? err?.message ?? ''
      const isNetworkDrop = !err?.response && errMsg.toLowerCase().includes('network')
      setChatError(isNetworkDrop
        ? 'Connection lost (phone locked?). Message restored — tap Send to retry.'
        : errMsg || 'Something went wrong. Please try again.')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any) }
  }

  function handleClear() {
    if (!confirm('Clear chat history?')) return
    clear.mutate(tripId)
    setTypingFull(null)
    setTypingDisplay('')
    setTypingMutations([])
    setPendingUserMsg(null)
    setChatError(null)
  }

  const isEmpty = messages.length === 0 && !pendingUserMsg && !send.isPending && !isTyping

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {!isEmpty && (
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ef4444' }} onClick={handleClear}>
            <Trash2 size={12} /> Clear chat
          </button>
        )}
      </div>

      <GlassCard style={{ padding: 16, minHeight: 300, maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size={20} /></div>}

        {!isLoading && isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8, padding: '40px 0' }}>
            <div style={{ fontSize: 28 }}>💬</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ask me anything about your trip</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>I can add activities, suggest packing items, and more</div>
          </div>
        )}

        {/* Messages from DB */}
        {messages.map(msg => {
          const isUser = msg.role === 'user'
          const rawCalls = msg.tool_calls
          const toolCalls: Array<{ tool: string; input: any; result: string }> = rawCalls
            ? (typeof rawCalls === 'string' ? JSON.parse(rawCalls) : rawCalls)
            : []
          return (
            <div key={msg.id}>
              <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: 12,
                  fontSize: 13, lineHeight: 1.5,
                  background: isUser ? 'var(--accent-cyan-dim)' : 'var(--bg-elevated)',
                  border: `1px solid ${isUser ? 'var(--border-active)' : 'var(--border)'}`,
                  color: isUser ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
              {!isUser && toolCalls.length > 0 && (
                <MutationChips items={toolCalls.map(tc => tc.result ?? tc.tool)} />
              )}
            </div>
          )
        })}

        {/* Optimistic user message (while API is in flight) */}
        {pendingUserMsg && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              maxWidth: '75%', padding: '10px 14px', borderRadius: 12,
              fontSize: 13, lineHeight: 1.5,
              background: 'var(--accent-cyan-dim)',
              border: '1px solid var(--border-active)',
              color: 'var(--accent-cyan)',
              whiteSpace: 'pre-wrap',
            }}>
              {pendingUserMsg}
            </div>
          </div>
        )}

        {/* Thinking spinner (waiting for API response) */}
        {send.isPending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Spinner size={12} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thinking… (may take up to 60s)</span>
            </div>
          </div>
        )}

        {/* Typewriter bubble */}
        {isTyping && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: 12,
                fontSize: 13, lineHeight: 1.5,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
              }}>
                {typingDisplay}
                <span style={{
                  display: 'inline-block', width: 2, height: '1em',
                  background: 'var(--accent-cyan)', marginLeft: 2,
                  verticalAlign: 'text-bottom',
                  animation: 'cursor-blink 0.8s step-end infinite',
                }} />
              </div>
            </div>
            {typingDisplay.length === typingFull?.length && (
              typingMutations.length > 0
                ? <MutationChips items={typingMutations.map(m => m.description ?? m.tool)} />
                : <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 2, fontFamily: 'IBM Plex Mono' }}>No changes made</div>
            )}
          </div>
        )}

        {/* Error bubble */}
        {chatError && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#ef4444' }}>
              ⚠ {chatError}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </GlassCard>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => { setInput(e.target.value); if (chatError) setChatError(null) }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your trip… (Enter to send, Shift+Enter for newline)"
          rows={2}
          style={{
            flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 12px', fontSize: 13,
            color: 'var(--text-primary)', outline: 'none', fontFamily: 'Inter',
            resize: 'none', colorScheme: 'dark', lineHeight: 1.4,
          }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '10px 14px', flexShrink: 0 }} disabled={!input.trim() || send.isPending || isTyping}>
          <Send size={14} />
        </button>
      </form>

      <style>{`@keyframes cursor-blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }`}</style>
    </div>
  )
}
