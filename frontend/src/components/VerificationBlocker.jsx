import { useState, useEffect } from 'react'
import { Mail, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react'
import { useAuthStore, useUIStore } from '../lib/store'
import api from '../lib/api'
import { TactileButton } from './ui/tactile-button'

export default function VerificationBlocker() {
  const { user, logout, fetchUser } = useAuthStore()
  const { showToast } = useUIStore()
  const [isResending, setIsResending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Show blocker only if user logged in but not verified
  const shouldBlock = user && !user.is_active

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  if (!shouldBlock) {
    return null
  }

  const handleResendEmail = async () => {
    setIsResending(true)
    try {
      await api.post('/auth/resend-verification')
      showToast('Đã gửi lại email xác thực! Vui lòng kiểm tra hộp thư.', 'success')
      setCountdown(60) // 60 seconds cooldown
    } catch (error) {
      showToast(error.message || 'Không thể gửi email xác thực', 'error')
    } finally {
      setIsResending(false)
    }
  }

  const handleCheckVerification = async () => {
    setIsChecking(true)
    try {
      await fetchUser() // Refresh user data
    } catch (error) {
      showToast('Không thể kiểm tra trạng thái xác thực', 'error')
    } finally {
      setIsChecking(false)
    }
  }

  const handleLogout = () => {
    logout()
    showToast('Đã đăng xuất', 'info')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header with Euler Indigo theme */}
        <div className="bg-indigo-600 px-6 py-8 text-center text-white space-y-2">
          <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center text-indigo-600">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold">
            Xác Thực Địa Chỉ Email
          </h2>
          <p className="text-indigo-100 text-xs font-medium">
            Vui lòng xác thực email để mở khóa toàn bộ khóa học
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-1">
            <p className="text-xs text-slate-500 font-medium">
              Chúng tôi đã gửi liên kết kích hoạt đến:
            </p>
            <p className="text-sm font-extrabold text-slate-900">
              {user.email}
            </p>
            <p className="text-[11px] text-slate-400 font-medium pt-1">
              Kiểm tra hộp thư đến (và thư rác) rồi bấm vào nút xác nhận.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <TactileButton
              variant="success"
              size="md"
              onClick={handleCheckVerification}
              disabled={isChecking}
              className="w-full"
            >
              <CheckCircle2 className={`w-4 h-4 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Đang kiểm tra...' : 'Tôi đã xác thực'}
            </TactileButton>

            <TactileButton
              variant="secondary"
              size="md"
              onClick={handleResendEmail}
              disabled={isResending || countdown > 0}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? 'Đang gửi lại...' : countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại email xác thực'}
            </TactileButton>

            <TactileButton
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full text-slate-500"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Đăng xuất
            </TactileButton>
          </div>
        </div>

      </div>
    </div>
  )
}
