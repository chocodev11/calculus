import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../lib/store'
import { Eye, EyeOff, Loader2, Check, X, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react'
import { TactileButton } from '../components/ui/tactile-button'

/* ─── Reusable Input Field ─────────────────────────────────────────── */
function InputField({ icon: Icon, label, hint, right, ...props }) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</label>
      <div className="relative group">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <input
          {...props}
          className={`w-full py-3.5 border rounded-2xl bg-slate-50 focus:bg-white outline-none transition-all
            focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 border-slate-200 text-sm font-medium text-slate-800
            placeholder:text-slate-400 ${Icon ? 'pl-10' : 'pl-4'} ${right ? 'pr-12' : 'pr-4'}`}
        />
        {right}
      </div>
      {hint && <p className="text-xs text-slate-400 font-medium">{hint}</p>}
    </div>
  )
}

/* ─── Login Form ─────────────────────────────────────────────────────── */
function LoginForm({ onSwitch }) {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const { showToast } = useUIStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    if (!email.trim() || !password.trim()) {
      showToast('Vui lòng nhập đầy đủ thông tin', 'error')
      return
    }
    try {
      await login(email, password, remember)
      showToast('Đăng nhập thành công!', 'success')
      navigate('/')
    } catch (err) {
      showToast(err.message || 'Đăng nhập thất bại', 'error')
    }
  }

  const toggleBtn = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-xs font-semibold">
          <X className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <InputField
        icon={Mail}
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        required
        autoComplete="email"
      />

      <InputField
        icon={Lock}
        label="Mật khẩu"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
        autoComplete="current-password"
        right={toggleBtn}
      />

      <div className="flex items-center justify-between pt-1">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 accent-indigo-600"
          />
          Ghi nhớ đăng nhập
        </label>
      </div>

      <TactileButton
        type="submit"
        disabled={isLoading}
        variant="primary"
        size="lg"
        className="w-full text-base mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Đang đăng nhập…
          </>
        ) : (
          <>
            <span>Đăng nhập</span>
            <ArrowRight className="w-5 h-5 ml-1.5" />
          </>
        )}
      </TactileButton>

      <p className="text-center text-xs text-slate-500 font-medium pt-2">
        Chưa có tài khoản?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-indigo-600 font-bold hover:underline cursor-pointer"
        >
          Đăng ký ngay
        </button>
      </p>
    </form>
  )
}

/* ─── Register Form ─────────────────────────────────────────────────── */
function RegisterForm({ onSwitch }) {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuthStore()
  const { showToast } = useUIStore()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const passwordChecks = {
    length: password.length >= 6,
    match: password === confirmPassword && confirmPassword.length > 0,
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()

    if (!displayName.trim() || !email.trim() || !password) {
      showToast('Vui lòng điền đầy đủ các trường', 'error')
      return
    }
    if (!passwordChecks.length) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error')
      return
    }
    if (!passwordChecks.match) {
      showToast('Mật khẩu xác nhận không khớp', 'error')
      return
    }

    try {
      const result = await register({
        email,
        username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20),
        password,
        display_name: displayName,
      })

      if (result?.requires_verification) {
        showToast('Đăng ký thành công! Vui lòng kiểm tra email để xác thực.', 'info')
      } else {
        showToast('Đăng ký thành công! Chào mừng bạn.', 'success')
      }
      navigate('/')
    } catch (err) {
      showToast(err.message || 'Đăng ký thất bại. Vui lòng thử lại.', 'error')
    }
  }

  const toggleBtn = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-xs font-semibold">
          <X className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <InputField
        icon={User}
        label="Họ và tên"
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Nguyễn Văn A"
        required
        autoComplete="name"
      />

      <InputField
        icon={Mail}
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        required
        autoComplete="email"
      />

      <InputField
        icon={Lock}
        label="Mật khẩu"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Tối thiểu 6 ký tự"
        required
        autoComplete="new-password"
        right={toggleBtn}
      />

      <InputField
        icon={Lock}
        label="Xác nhận mật khẩu"
        type={showPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Nhập lại mật khẩu"
        required
        autoComplete="new-password"
      />

      {/* Password criteria checklist */}
      {password && (
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 text-xs font-medium">
          <div className={`flex items-center gap-2 ${passwordChecks.length ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
            {passwordChecks.length ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
            <span>Tối thiểu 6 ký tự</span>
          </div>
          {confirmPassword && (
            <div className={`flex items-center gap-2 ${passwordChecks.match ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
              {passwordChecks.match ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
              <span>Mật khẩu xác nhận khớp</span>
            </div>
          )}
        </div>
      )}

      <TactileButton
        type="submit"
        disabled={isLoading}
        variant="primary"
        size="lg"
        className="w-full text-base mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Đang tạo tài khoản…
          </>
        ) : (
          <>
            <span>Đăng ký tài khoản</span>
            <ArrowRight className="w-5 h-5 ml-1.5" />
          </>
        )}
      </TactileButton>

      <p className="text-center text-xs text-slate-500 font-medium pt-2">
        Đã có tài khoản?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-indigo-600 font-bold hover:underline cursor-pointer"
        >
          Đăng nhập
        </button>
      </p>
    </form>
  )
}

/* ─── Mathematical Background Glyphs ────────────────────────────────── */
const SYMBOLS = [
  { s: '∫', x: '6%', y: '12%', size: '3.5rem', rot: '-12deg', op: 0.08 },
  { s: 'lim', x: '88%', y: '10%', size: '2.5rem', rot: '8deg', op: 0.08 },
  { s: 'dx', x: '8%', y: '75%', size: '2.5rem', rot: '-6deg', op: 0.08 },
  { s: '∑', x: '86%', y: '80%', size: '3rem', rot: '12deg', op: 0.08 },
  { s: 'f\'(x)', x: '80%', y: '45%', size: '2.2rem', rot: '-8deg', op: 0.07 },
  { s: 'Δx', x: '12%', y: '45%', size: '2rem', rot: '15deg', op: 0.07 },
]

/* ─── Main Login Page ───────────────────────────────────────────────── */
export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { clearError } = useAuthStore()
  const tab = searchParams.get('tab') === 'register' ? 'register' : 'login'

  const switchTab = (newTab) => {
    clearError()
    setSearchParams(newTab === 'register' ? { tab: 'register' } : {})
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 math-grid-bg overflow-hidden font-sans">
      
      {/* Subtle Math Background Symbols */}
      {SYMBOLS.map(({ s, x, y, size, rot, op }) => (
        <span
          key={s}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: x,
            top: y,
            fontSize: size,
            transform: `rotate(${rot})`,
            opacity: op,
            userSelect: 'none',
            pointerEvents: 'none',
            fontWeight: 800,
            color: '#4F46E5',
            fontFamily: 'serif'
          }}
        >
          {s}
        </span>
      ))}

      <div className="relative w-full max-w-md my-8">
        
        {/* Brand Header */}
        <div className="text-center mb-6 space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group mb-1">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 border-b-2 border-indigo-800 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <span className="font-serif italic font-extrabold text-2xl leading-none">∫</span>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              Calculus<span className="text-indigo-600">.app</span>
            </span>
          </Link>
          <p className="text-slate-500 text-xs sm:text-sm font-semibold">
            {tab === 'login' 
              ? 'Chào mừng bạn quay lại! Tiếp tục chuỗi học tập.'
              : 'Tạo tài khoản để mở khóa toàn bộ lộ trình tương tác.'}
          </p>
        </div>

        {/* 2.5D Tactile Card Container */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100/70 border-b border-slate-200/80 gap-1.5">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`py-3 text-xs sm:text-sm font-extrabold rounded-2xl transition-all cursor-pointer select-none ${
                tab === 'login'
                  ? 'bg-white text-indigo-600 border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`py-3 text-xs sm:text-sm font-extrabold rounded-2xl transition-all cursor-pointer select-none ${
                tab === 'register'
                  ? 'bg-white text-indigo-600 border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tạo tài khoản
            </button>
          </div>

          {/* Form Content Area */}
          <div className="p-6 sm:p-8">
            {tab === 'login' ? (
              <LoginForm onSwitch={() => switchTab('register')} />
            ) : (
              <RegisterForm onSwitch={() => switchTab('login')} />
            )}
          </div>

        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link to="/" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            ← Quay lại trang chủ
          </Link>
        </div>

      </div>
    </div>
  )
}
