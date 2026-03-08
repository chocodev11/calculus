import { useState, useRef, useEffect } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'

const PROMPT = '>'
const WELCOME = `Dev Terminal v1.0
Type /help for available commands.
─────────────────────────────`

const SUGGESTIONS = [
  '/give xp 100',
  '/give coins 500',
  '/give hearts 5',
  '/give streak 7',
  '/set coins 9999',
  '/advance 1',
  '/advance 2',
  '/simulate 7',
  '/simulate 7 3 5',
  '/simulate 30',
  '/time',
  '/status',
  '/help',
]

export default function DevTerminal() {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState([{ type: 'system', text: WELCOME }])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const { fetchUser } = useAuthStore()

  // Auto-scroll on new line
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const push = (text, type = 'output') =>
    setLines(prev => [...prev, { type, text }])

  const runCommand = async (raw) => {
    const cmd = raw.trim()
    if (!cmd) return
    push(`${PROMPT} ${cmd}`, 'input')
    setHistory(prev => [cmd, ...prev.slice(0, 49)])
    setHistIdx(-1)
    setInput('')

    if (cmd === '/clear') {
      setLines([{ type: 'system', text: WELCOME }])
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/admin/command', { command: cmd })
      push(res.output, res.ok === false ? 'error' : 'output')
      // Refresh user data so XP/coins/hearts update in the UI
      if (res.ok !== false) await fetchUser()
    } catch (e) {
      push(e.message || 'Command failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      runCommand(input)
      setShowSuggestions(false)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setInput(history[next] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setInput(next === -1 ? '' : history[next])
    } else if (e.key === 'Tab' && input) {
      e.preventDefault()
      const match = SUGGESTIONS.find(s => s.startsWith(input))
      if (match) setInput(match)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const filtered = input
    ? SUGGESTIONS.filter(s => s.toLowerCase().includes(input.toLowerCase()))
    : []

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Dev Terminal"
        className={`fixed bottom-5 right-5 z-[9999] w-12 h-12 rounded-full flex items-center justify-center
          font-mono font-bold text-sm shadow-lg transition-all duration-200
          ${open
            ? 'bg-[#1e1e2e] text-[#a6e3a1] ring-2 ring-[#a6e3a1]/40 rotate-45'
            : 'bg-[#1e1e2e] text-[#cdd6f4] hover:ring-2 hover:ring-[#cdd6f4]/30'
          }`}
      >
        {open ? '✕' : '>_'}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-[9998] flex flex-col
            w-[420px] h-[520px] max-h-[80vh]
            rounded-2xl overflow-hidden shadow-2xl
            border border-[#313244]"
          style={{ background: '#1e1e2e' }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#313244] flex-shrink-0"
               style={{ background: '#181825' }}>
            <span className="w-3 h-3 rounded-full bg-[#f38ba8]" />
            <span className="w-3 h-3 rounded-full bg-[#fab387]" />
            <span className="w-3 h-3 rounded-full bg-[#a6e3a1]" />
            <span className="ml-2 text-xs font-mono text-[#6c7086] select-none">dev-terminal</span>
            <button
              onClick={() => setLines([{ type: 'system', text: WELCOME }])}
              className="ml-auto text-[10px] font-mono text-[#6c7086] hover:text-[#cdd6f4] transition-colors px-1.5 py-0.5 rounded hover:bg-[#313244]"
            >
              clear
            </button>
          </div>

          {/* Output area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-[1.6] space-y-0.5">
            {lines.map((line, i) => (
              <pre key={i} className={`whitespace-pre-wrap break-words m-0
                ${line.type === 'input'   ? 'text-[#89b4fa]'
                : line.type === 'error'   ? 'text-[#f38ba8]'
                : line.type === 'system'  ? 'text-[#6c7086]'
                : 'text-[#cdd6f4]'}`}>
                {line.text}
              </pre>
            ))}
            {loading && (
              <pre className="text-[#f9e2af] animate-pulse m-0">...</pre>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && filtered.length > 0 && (
            <div className="px-4 pb-1 flex flex-wrap gap-1.5 border-t border-[#313244]"
                 style={{ background: '#181825' }}>
              {filtered.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#313244] text-[#a6e3a1]
                    hover:bg-[#45475a] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[#313244] flex-shrink-0"
               style={{ background: '#181825' }}>
            <span className="text-[#a6e3a1] font-mono text-sm select-none">{PROMPT}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
              onKeyDown={onKeyDown}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="type a command..."
              spellCheck={false}
              autoComplete="off"
              disabled={loading}
              className="flex-1 bg-transparent font-mono text-[13px] text-[#cdd6f4]
                placeholder-[#45475a] outline-none caret-[#a6e3a1] disabled:opacity-50"
            />
            <button
              onClick={() => { runCommand(input); setShowSuggestions(false) }}
              disabled={loading || !input.trim()}
              className="text-[#a6e3a1] font-mono text-sm disabled:opacity-30 hover:text-white transition-colors"
            >
              ↵
            </button>
          </div>
        </div>
      )}
    </>
  )
}
