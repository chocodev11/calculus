import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Card, CardContent } from './ui/card'

const MAX_HEARTS = 5
const RESTORE_SECONDS = 6 * 3600 // 6 hours

function HeartIcon({ filled, size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#FF4B4B' : 'none'}
      stroke={filled ? '#FF4B4B' : '#d1d5db'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function formatCountdown(seconds) {
  if (!seconds || seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function HeartsCard() {
  const [hearts, setHearts] = useState(null)
  const [maxHearts] = useState(MAX_HEARTS)
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [invCount, setInvCount] = useState(0)
  const [using, setUsing] = useState(false)
  const intervalRef = useRef(null)

  const fetchHearts = async () => {
    try {
      const res = await api.get('/shop/hearts')
      setHearts(res.hearts)
      setSecondsLeft(res.seconds_until_restore ?? null)
    } catch (e) {
      // silently ignore
    }
  }

  const fetchInventory = async () => {
    try {
      const inv = await api.get('/shop/inventory')
      const heartRow = inv.find(r => r.item?.item_type === 'heart')
      setInvCount(heartRow ? heartRow.quantity : 0)
    } catch (e) { }
  }

  useEffect(() => {
    fetchHearts()
    fetchInventory()
  }, [])

  // Tick countdown every second
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (secondsLeft !== null && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            fetchHearts()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(intervalRef.current)
  }, [secondsLeft])

  const handleUse = async () => {
    if (using) return
    setUsing(true)
    try {
      const res = await api.post('/shop/use-heart', {})
      setHearts(res.hearts)
      setSecondsLeft(res.seconds_until_restore ?? null)
      setInvCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      // silently ignore
    } finally {
      setUsing(false)
    }
  }

  const isFull = hearts !== null && hearts >= maxHearts
  const displayHearts = hearts ?? maxHearts

  const restoreProgress = (secondsLeft !== null && !isFull)
    ? Math.max(0, Math.min(1, (RESTORE_SECONDS - secondsLeft) / RESTORE_SECONDS))
    : 1

  return (
    <Card className="border-2 border-red-200/50 bg-gradient-to-br from-white to-red-50/50">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isFull ? 'bg-red-100' : 'bg-red-50'}`}>
              <HeartIcon filled size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">Heart</p>
              <p className="text-xs text-slate-400 leading-tight">{displayHearts}/{maxHearts} hearts</p>
            </div>
          </div>
          <Link
            to="/quests"
            className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            Out of heart?
          </Link>
        </div>

        {/* Hearts row */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {Array.from({ length: maxHearts }).map((_, i) => (
            <HeartIcon key={i} filled={i < displayHearts} size={28} />
          ))}
        </div>

        {/* Countdown / full message */}
        {isFull ? (
          <p className="text-xs text-center text-red-500 font-semibold">❤️ Heart full!</p>
        ) : secondsLeft !== null ? (
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-red-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-pink-400 rounded-full transition-all duration-1000"
                style={{ width: `${restoreProgress * 100}%` }}
              />
            </div>
            <p className="text-xs text-center text-slate-500 tabular-nums">
              +1 heart after <span className="font-bold text-red-500">{formatCountdown(secondsLeft)}</span>
            </p>
          </div>
        ) : null}

        {/* Inventory + Use button */}
        {invCount > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-red-100">
            <span className="text-xs text-slate-500">
              <span className="font-bold text-red-500">×{invCount}</span> in bag
            </span>
            <button
              onClick={handleUse}
              disabled={using || isFull}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-500 text-white
                shadow-[0_2px_0_#C53030] active:shadow-none active:translate-y-[1px]
                transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {using ? '...' : 'Use ❤️'}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
