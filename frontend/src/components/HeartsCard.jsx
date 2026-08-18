import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Plus, Clock } from 'lucide-react'
import api from '../lib/api'
import { t } from '../lib/locale'

const MAX_HEARTS = 5
const RESTORE_SECONDS = 6 * 3600 // 6 hours

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
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-[0_4px_0_0_#E2E8F0] space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-b-2 ${
            isFull ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-rose-50 border-rose-200 text-rose-500'
          }`}>
            <Heart className="w-5 h-5 fill-rose-500" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900 leading-tight">
              {t.heartsCard?.heartLabel || 'Năng lượng Tim'}
            </p>
            <p className="text-xs text-slate-500 font-semibold leading-tight tabular-nums mt-0.5">
              {displayHearts} / {maxHearts} Tim
            </p>
          </div>
        </div>
        <Link
          to="/shop"
          className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1.5 rounded-xl border border-rose-200 transition-colors"
        >
          {t.heartsCard?.outOfHeart || 'Nạp thêm'}
        </Link>
      </div>

      {/* Hearts visual row */}
      <div className="flex items-center justify-center gap-2 py-1 bg-slate-50 rounded-2xl border border-slate-100">
        {Array.from({ length: maxHearts }).map((_, i) => {
          const active = i < displayHearts
          return (
            <div
              key={i}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                active 
                  ? 'bg-rose-500 text-white border-b-2 border-rose-700 shadow-sm' 
                  : 'bg-slate-200 text-slate-400 border-b-2 border-slate-300'
              }`}
            >
              <Heart className={`w-5 h-5 ${active ? 'fill-white' : 'fill-slate-300 text-slate-300'}`} />
            </div>
          )
        })}
      </div>

      {/* Countdown / full status */}
      {isFull ? (
        <p className="text-xs text-center text-emerald-600 font-bold">
          ✓ {t.heartsCard?.heartFull || 'Tim đã đầy! Sẵn sàng học.'}
        </p>
      ) : secondsLeft !== null ? (
        <div className="space-y-1.5 pt-1">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-1000"
              style={{ width: `${restoreProgress * 100}%` }}
            />
          </div>
          <p className="text-xs text-center text-slate-500 font-medium tabular-nums flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Hồi phục 1 tim sau:</span>
            <span className="font-extrabold text-rose-600">{formatCountdown(secondsLeft)}</span>
          </p>
        </div>
      ) : null}

      {/* Inventory item usage */}
      {invCount > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-600">
            Túi đồ: <span className="text-rose-600 font-extrabold">×{invCount} Tim</span>
          </span>
          <button
            onClick={handleUse}
            disabled={using || isFull}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-500 text-white
              border-b-2 border-rose-700 active:border-b-0 active:translate-y-0.5
              transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {using ? 'Đang dùng...' : 'Sử dụng'}
          </button>
        </div>
      )}
    </div>
  )
}
