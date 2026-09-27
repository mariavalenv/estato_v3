import { useEffect, useMemo, useState } from 'react'
import { ArrowUp, Bot, MessageSquare, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getConversationParticipants,
  getV3Messages,
  listMyV3Conversations,
  requestAgentResponse,
  sendHumanMessage,
} from '../lib/v3Conversations'

function participantLabel(participant, currentUserId) {
  if (participant.participant_type === 'agent') {
    if (participant.agent?.owner_user_id === currentUserId) return 'Your agent'
    return participant.agent?.name || 'Agent'
  }

  if (participant.human_user_id === currentUserId) return 'You'
  return participant.human_profile?.display_name || 'Matched member'
}

export function Chats() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(searchParams.get('conversation') || '')
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [agentThinking, setAgentThinking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    listMyV3Conversations(user.id)
      .then((rows) => {
        if (cancelled) return
        setConversations(rows)

        const requested = searchParams.get('conversation')
        const nextSelected =
          requested && rows.some((conversation) => conversation.id === requested)
            ? requested
            : rows[0]?.id || ''

        setSelectedId(nextSelected)
        if (nextSelected) setSearchParams({ conversation: nextSelected }, { replace: true })
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })

    return () => { cancelled = true }
  }, [user.id])

  useEffect(() => {
    if (!selectedId) {
      setParticipants([])
      setMessages([])
      return
    }

    let cancelled = false
    setLoadingThread(true)
    setError('')

    Promise.all([
      getConversationParticipants(selectedId),
      getV3Messages(selectedId),
    ])
      .then(([participantRows, messageRows]) => {
        if (cancelled) return
        setParticipants(participantRows)
        setMessages(messageRows)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false)
      })

    return () => { cancelled = true }
  }, [selectedId])

  const otherHuman = useMemo(
    () => participants.find(
      (participant) =>
        participant.participant_type === 'human'
        && participant.human_user_id !== user.id
    ),
    [participants, user.id]
  )

  const agentParticipants = useMemo(
    () => participants.filter((participant) => participant.participant_type === 'agent'),
    [participants]
  )

  function selectConversation(id) {
    setSelectedId(id)
    setSearchParams({ conversation: id })
  }

  async function send() {
    const text = input.trim()
    if (!text || !selectedId || sending) return

    setSending(true)
    setError('')

    try {
      const message = await sendHumanMessage(selectedId, user.id, text)
      if (message) setMessages((current) => [...current, message])
      setInput('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function askAgent() {
    if (!selectedId || agentThinking) return

    setAgentThinking(true)
    setError('')

    try {
      const message = await requestAgentResponse(selectedId)
      if (message) setMessages((current) => [...current, message])
    } catch (err) {
      setError(err.message)
    } finally {
      setAgentThinking(false)
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  function messageAuthor(message) {
    if (message.sender_type === 'agent') {
      const participant = participants.find(
        (row) => row.agent_id === message.sender_agent_id
      )
      return participantLabel(participant || { participant_type: 'agent', agent: message.agent }, user.id)
    }

    if (message.sender_user_id === user.id) return 'You'

    const participant = participants.find(
      (row) => row.human_user_id === message.sender_user_id
    )
    return participantLabel(participant || { participant_type: 'human' }, user.id)
  }

  function isOwnSide(message) {
    if (message.sender_type === 'human') return message.sender_user_id === user.id

    const participant = participants.find(
      (row) => row.agent_id === message.sender_agent_id
    )
    return participant?.agent?.owner_user_id === user.id
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Chats</h1>
      <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>
        Humans and their agents share the same conversation, with clear authorship on every message.
      </p>

      {error && (
        <div className="mt-5 rounded-card p-4" style={{ background: 'rgba(239,68,68,0.08)' }}>
          <p className="text-body" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      <div className="mt-8 grid md:grid-cols-[280px_minmax(0,1fr)] gap-4 min-h-[620px]">
        <aside className="rounded-card overflow-hidden h-fit" style={{ background: 'var(--surface)' }}>
          <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>Conversations</p>
          </div>

          {loadingList ? (
            <p className="p-4 text-body" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          ) : conversations.length === 0 ? (
            <div className="p-5">
              <MessageSquare size={20} style={{ color: 'var(--text-secondary)' }} />
              <p className="mt-3 text-body font-medium" style={{ color: 'var(--text-primary)' }}>No mutual matches yet</p>
              <p className="mt-1 text-meta" style={{ color: 'var(--text-secondary)' }}>
                When two real Estato members both choose Interested, one shared human + agent conversation appears here automatically.
              </p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const active = selectedId === conversation.id
              return (
                <button
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  className="w-full p-4 text-left"
                  style={{
                    background: active ? 'rgba(99,134,241,0.12)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <p className="text-body font-medium">Flatmate match</p>
                  <p className="text-meta mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Humans + personal agents
                  </p>
                </button>
              )
            })
          )}
        </aside>

        <section className="rounded-card overflow-hidden flex flex-col min-h-[620px]" style={{ background: 'var(--surface)' }}>
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <Bot size={24} className="mx-auto" style={{ color: 'var(--text-secondary)' }} />
                <p className="mt-3 text-body" style={{ color: 'var(--text-secondary)' }}>
                  Choose a conversation once you have a mutual match.
                </p>
              </div>
            </div>
          ) : loadingThread ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-body" style={{ color: 'var(--text-secondary)' }}>Loading conversation…</p>
            </div>
          ) : (
            <>
              <header className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {otherHuman?.human_profile?.display_name || 'Mutual flatmate match'}
                    </p>
                    <p className="text-meta mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {participants.filter((p) => p.participant_type === 'human').length} humans · {agentParticipants.length} agents
                    </p>
                  </div>
                  <div className="flex -space-x-1">
                    {participants.slice(0, 4).map((participant) => (
                      <div
                        key={participant.id}
                        title={participantLabel(participant, user.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          background: participant.participant_type === 'agent'
                            ? 'rgba(99,134,241,0.18)'
                            : 'rgba(255,255,255,0.08)',
                          border: '2px solid var(--surface)',
                          color: participant.participant_type === 'agent' ? 'var(--accent)' : 'var(--text-secondary)',
                        }}
                      >
                        {participant.participant_type === 'agent' ? <Bot size={14} /> : <UserRound size={14} />}
                      </div>
                    ))}
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="max-w-md mx-auto mt-10 text-center">
                    <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>The match is mutual.</p>
                    <p className="mt-2 text-meta leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      Both personal agents are already participants. Human messages and future agent-authored messages will remain visibly distinct.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((message) => {
                      const ownSide = isOwnSide(message)
                      const isAgent = message.sender_type === 'agent'

                      return (
                        <div key={message.id} className={'flex ' + (ownSide ? 'justify-end' : 'justify-start')}>
                          <div className="max-w-[78%]">
                            <p
                              className={'text-meta mb-1 ' + (ownSide ? 'text-right' : 'text-left')}
                              style={{ color: isAgent ? 'var(--accent)' : 'var(--text-secondary)' }}
                            >
                              {isAgent ? '◆ ' : ''}{messageAuthor(message)}
                            </p>
                            <div
                              className="px-4 py-2.5 rounded-card text-body"
                              style={{
                                background: ownSide ? 'var(--accent)' : 'var(--background)',
                                color: ownSide ? '#fff' : 'var(--text-primary)',
                                border: isAgent ? '1px solid rgba(99,134,241,0.30)' : '1px solid transparent',
                              }}
                            >
                              {message.content}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  disabled={agentThinking}
                  onClick={askAgent}
                  className="shrink-0 px-3 py-2.5 rounded-btn text-meta font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(99,134,241,0.12)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(99,134,241,0.20)',
                    opacity: agentThinking ? 0.6 : 1,
                  }}
                >
                  <Bot size={14} />
                  {agentThinking ? 'Agent thinking…' : 'Ask my agent'}
                </button>
                <div className="flex flex-1 min-w-0 items-center gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Message as yourself…"
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-chip outline-none"
                  style={{ background: 'var(--background)', border: 'none', color: 'var(--text-primary)' }}
                />
                <button
                  disabled={!input.trim() || sending}
                  onClick={send}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: input.trim() ? 'var(--accent)' : 'var(--background)',
                    color: input.trim() ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    opacity: sending ? 0.6 : 1,
                  }}
                >
                  <ArrowUp size={16} />
                </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
