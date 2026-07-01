import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function chatFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${BASE_URL}/api/chat${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

export default function ChatBubble() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('community') // 'community' | 'private'
  const [messages, setMessages] = useState([])
  const [privateMessages, setPrivateMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  // Admin: list of users with private chats
  const [privateUsers, setPrivateUsers] = useState([])
  const [selectedPrivateUser, setSelectedPrivateUser] = useState('')
  const messagesEndRef = useRef(null)
  const lastCommunityId = useRef(0)
  const lastPrivateId = useRef(0)

  // Load initial messages
  useEffect(() => {
    if (!open) return
    loadMessages()
  }, [open, tab, selectedPrivateUser])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!open) return
    const interval = setInterval(pollNewMessages, 5000)
    return () => clearInterval(interval)
  }, [open, tab, selectedPrivateUser])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, privateMessages])

  // Load private users list for admin
  useEffect(() => {
    if (isAdmin && open && tab === 'private') {
      chatFetch('/private/users').then(data => {
        if (Array.isArray(data)) setPrivateUsers(data)
      })
    }
  }, [isAdmin, open, tab])

  async function loadMessages() {
    if (tab === 'community') {
      const data = await chatFetch('/community')
      if (Array.isArray(data)) {
        setMessages(data)
        if (data.length > 0) lastCommunityId.current = data[data.length - 1].id
      }
    } else {
      const target = isAdmin ? (selectedPrivateUser || '') : 'admin'
      if (!target) return
      const data = await chatFetch(`/private?withUser=${encodeURIComponent(target)}`)
      if (Array.isArray(data)) {
        setPrivateMessages(data)
        if (data.length > 0) lastPrivateId.current = data[data.length - 1].id
      }
    }
  }

  async function pollNewMessages() {
    try {
      if (tab === 'community') {
        const data = await chatFetch(`/community?afterId=${lastCommunityId.current}`)
        if (Array.isArray(data) && data.length > 0) {
          setMessages(prev => [...prev, ...data])
          lastCommunityId.current = data[data.length - 1].id
        }
      } else {
        const target = isAdmin ? (selectedPrivateUser || '') : 'admin'
        if (!target) return
        const data = await chatFetch(`/private?withUser=${encodeURIComponent(target)}&afterId=${lastPrivateId.current}`)
        if (Array.isArray(data) && data.length > 0) {
          setPrivateMessages(prev => [...prev, ...data])
          lastPrivateId.current = data[data.length - 1].id
        }
      }
    } catch (e) { /* ignore polling errors */ }
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    if (input.length > 500) return
    setSending(true)
    try {
      if (tab === 'community') {
        const data = await chatFetch('/community', {
          method: 'POST',
          body: JSON.stringify({ message: input.trim() }),
        })
        if (data.id) {
          setMessages(prev => [...prev, data])
          lastCommunityId.current = data.id
        }
      } else {
        const target = isAdmin ? selectedPrivateUser : 'admin'
        const data = await chatFetch('/private', {
          method: 'POST',
          body: JSON.stringify({ message: input.trim(), recipient: target }),
        })
        if (data.id) {
          setPrivateMessages(prev => [...prev, data])
          lastPrivateId.current = data.id
        }
      }
      setInput('')
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  const currentMessages = tab === 'community' ? messages : privateMessages

  const formatTime = (sentAt) => {
    if (!sentAt) return ''
    const d = new Date(sentAt)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  if (!user) return null

  return (
    <>
      {/* Chat Bubble Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[90] w-14 h-14 rounded-full bg-secondary shadow-[0_0_20px_rgba(0,255,204,0.4)] flex items-center justify-center hover:scale-110 transition-transform"
        >
          <span className="material-symbols-outlined text-on-secondary text-2xl">chat</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full flex items-center justify-center text-[10px] font-bold text-white">{unread}</span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-0 right-0 lg:bottom-6 lg:right-6 z-[100] w-full h-[70vh] lg:w-96 lg:h-[500px] lg:rounded-2xl bg-surface-container border border-outline-variant shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-secondary/20 to-tertiary/10 px-4 py-3 border-b border-outline-variant flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">forum</span>
              <span className="font-headline font-bold text-sm">Chat</span>
            </div>
            <button onClick={() => setOpen(false)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface text-sm">close</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-outline-variant shrink-0">
            <button
              onClick={() => setTab('community')}
              className={`flex-1 py-2 font-label text-xs uppercase tracking-wider transition-all ${
                tab === 'community' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant'
              }`}
            >
              Community
            </button>
            <button
              onClick={() => setTab('private')}
              className={`flex-1 py-2 font-label text-xs uppercase tracking-wider transition-all ${
                tab === 'private' ? 'text-tertiary border-b-2 border-tertiary' : 'text-on-surface-variant'
              }`}
            >
              {isAdmin ? 'Private Chats' : 'Chat with Admin'}
            </button>
          </div>

          {/* Admin: user selector for private */}
          {isAdmin && tab === 'private' && (
            <div className="px-3 py-2 border-b border-outline-variant shrink-0">
              <select
                value={selectedPrivateUser}
                onChange={(e) => setSelectedPrivateUser(e.target.value)}
                className="w-full bg-surface-dim border border-outline-variant text-on-surface font-label text-xs px-3 py-2 rounded"
              >
                <option value="">Select user...</option>
                {privateUsers.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {currentMessages.length === 0 && (
              <p className="text-center text-on-surface-variant text-xs py-8">No messages yet. Start the conversation!</p>
            )}
            {currentMessages.map((msg) => {
              const isMe = msg.sender === user?.username
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    isMe
                      ? 'bg-secondary/20 border border-secondary/30 rounded-br-sm'
                      : 'bg-surface-dim border border-outline-variant rounded-bl-sm'
                  }`}>
                    {!isMe && (
                      <p className={`font-label text-[10px] font-bold mb-0.5 ${
                        msg.sender === 'admin' ? 'text-primary' : 'text-tertiary'
                      }`}>{msg.sender}</p>
                    )}
                    <p className="font-label text-xs text-on-surface break-words">{msg.message}</p>
                    <p className="font-label text-[9px] text-on-surface-variant mt-0.5 text-right">{formatTime(msg.sentAt)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-outline-variant shrink-0">
            {(tab === 'private' && isAdmin && !selectedPrivateUser) ? (
              <p className="text-center text-on-surface-variant text-xs">Select a user to chat with</p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 500))}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-surface-dim border border-outline-variant focus:border-secondary focus:ring-0 focus:outline-none text-on-surface font-label text-xs px-3 py-2.5 rounded-lg"
                  maxLength={500}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="px-3 py-2.5 bg-secondary/20 border border-secondary/50 text-secondary rounded-lg hover:bg-secondary/30 transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>
            )}
            <p className="font-label text-[9px] text-on-surface-variant mt-1 text-right">{input.length}/500</p>
          </div>
        </div>
      )}
    </>
  )
}
