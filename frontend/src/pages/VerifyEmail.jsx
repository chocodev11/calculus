import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'
import { TactileButton } from '../components/ui/tactile-button'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { fetchUser } = useAuthStore()
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')
      
      if (!token) {
        setStatus('error')
        setMessage('Token xác minh không hợp lệ hoặc đã thiếu.')
        return
      }

      try {
        const response = await api.get(`/auth/verify-email?token=${token}`)
        setStatus('success')
        setMessage(response.message || 'Email đã được xác minh thành công!')
        
        // Update user data
        await fetchUser()
        
        // Auto redirect after 3 seconds
        setTimeout(() => {
          navigate('/')
        }, 3000)
      } catch (error) {
        setStatus('error')
        setMessage(error.message || 'Không thể xác minh email. Token có thể đã hết hạn.')
      }
    }

    verifyEmail()
  }, [searchParams, navigate, fetchUser])

  return (
    <div className="min-h-screen math-grid-bg flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-[0_8px_0_0_#E2E8F0] p-8 text-center space-y-6">
          
          {status === 'verifying' && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-indigo-50 border-2 border-indigo-200 rounded-2xl flex items-center justify-center text-indigo-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Đang xác minh email...
                </h1>
                <p className="text-sm font-medium text-slate-500">
                  Vui lòng chờ trong giây lát
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-5">
              <div className="w-16 h-16 mx-auto bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Xác minh thành công!
                </h1>
                <p className="text-sm text-slate-600 font-medium">
                  {message}
                </p>
                <p className="text-xs text-slate-400 font-medium pt-1">
                  Đang tự động chuyển hướng về trang chủ sau 3 giây...
                </p>
              </div>
              <TactileButton
                variant="primary"
                size="md"
                onClick={() => navigate('/')}
                className="w-full"
              >
                Về trang chủ ngay <ArrowRight className="w-4 h-4 ml-1.5" />
              </TactileButton>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-5">
              <div className="w-16 h-16 mx-auto bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center justify-center text-rose-600">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Xác minh thất bại
                </h1>
                <p className="text-sm text-slate-600 font-medium">
                  {message}
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <TactileButton
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Về trang chủ
                </TactileButton>
                <TactileButton
                  variant="secondary"
                  size="md"
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Đăng nhập lại
                </TactileButton>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <Mail className="w-4 h-4" />
            <span>Calculus.app • Nền tảng học toán tương tác</span>
          </div>

        </div>
      </div>
    </div>
  )
}
