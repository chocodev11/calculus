import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../lib/store'
import { Eye, EyeOff, Loader2, Check, X, Mail, Lock, User, UserCircle2, ArrowRight } from 'lucide-react'

/* ─── reusable input with icon ─────────────────────────────────────── */
function InputField({ icon: Icon, label, hint, right, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      <div className="relative group">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors pointer-events-none">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <input
          {...props}
          className={`w-full py-3 border-2 rounded-xl bg-slate-50 focus:bg-white outline-none transition-all
            focus:border-primary-500 focus:ring-4 focus:ring-primary-100 border-slate-200
            ${Icon ? 'pl-10' : 'pl-4'} ${right ? 'pr-12' : 'pr-4'}`}
        />
        {right}
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

/* ─── Login ─────────────────────────────────────────────────────────── */
function LoginForm({ onSwitch }) {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const { showToast } = useUIStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)

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
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <X className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <InputField
        icon={Mail} label="Email"
        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com" required autoComplete="email"
      />

      <InputField
        icon={Lock} label="Mật khẩu"
        type={showPassword ? 'text' : 'password'} value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••" required autoComplete="current-password"
        right={toggleBtn}
      />

      <label className="inline-flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none">
        <input
          type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-primary-600 accent-primary-600"
        />
        Ghi nhớ đăng nhập
      </label>

      <button
        type="submit" disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white
          bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400
          shadow-lg shadow-primary-200 hover:shadow-primary-300 hover:-translate-y-0.5
          disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
          transition-all duration-200"
      >
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Đang đăng nhập…</> : <><span>Đăng nhập</span><ArrowRight className="w-4 h-4" /></>}
      </button>

      <p className="text-center text-sm text-slate-500 pt-1">
        Chưa có tài khoản?{' '}
        <button type="button" onClick={onSwitch} className="text-primary-600 font-bold hover:underline">
          Đăng ký ngay
        </button>
      </p>
    </form>
  )
}

/* ─── Register ───────────────────────────────────────────────────────── */
function RegisterForm({ onSwitch }) {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuthStore()
  const { showToast } = useUIStore()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
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
    if (!username.trim() || !email.trim() || !password.trim()) {
      showToast('Vui lòng nhập đầy đủ thông tin', 'error')
      return
    }
    if (password !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'error')
      return
    }
    if (password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error')
      return
    }
    try {
      await register(username, email, password, displayName || username)
      showToast('Đăng ký thành công! Chào mừng bạn!', 'success')
      navigate('/')
    } catch (err) {
      showToast(err.message || 'Đăng ký thất bại', 'error')
    }
  }

  const toggleBtn = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <X className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <InputField
        icon={User} label="Tên đăng nhập *"
        hint="Chỉ chữ thường, số và dấu gạch dưới"
        type="text" value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
        placeholder="username" required autoComplete="username"
      />

      <InputField
        icon={UserCircle2} label="Tên hiển thị"
        type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Nguyễn Văn A" autoComplete="name"
      />

      <InputField
        icon={Mail} label="Email *"
        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com" required autoComplete="email"
      />

      <InputField
        icon={Lock} label="Mật khẩu *"
        type={showPassword ? 'text' : 'password'} value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••" required minLength={6} autoComplete="new-password"
        right={toggleBtn}
      />

      <InputField
        icon={Lock} label="Xác nhận mật khẩu *"
        type={showPassword ? 'text' : 'password'} value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="••••••••" required autoComplete="new-password"
      />

      {password.length > 0 && (
        <div className="flex gap-4 px-1 text-xs">
          <span className={`flex items-center gap-1 font-semibold ${passwordChecks.length ? 'text-green-600' : 'text-slate-400'}`}>
            {passwordChecks.length ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            Ít nhất 6 ký tự
          </span>
          {confirmPassword.length > 0 && (
            <span className={`flex items-center gap-1 font-semibold ${passwordChecks.match ? 'text-green-600' : 'text-red-500'}`}>
              {passwordChecks.match ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              Mật khẩu khớp
            </span>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !passwordChecks.length || (confirmPassword.length > 0 && !passwordChecks.match)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white
          bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400
          shadow-lg shadow-primary-200 hover:shadow-primary-300 hover:-translate-y-0.5
          disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
          transition-all duration-200"
      >
        {isLoading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo tài khoản…</>
          : <><span>Tạo tài khoản</span><ArrowRight className="w-4 h-4" /></>}
      </button>

      <p className="text-center text-sm text-slate-500 pt-1">
        Đã có tài khoản?{' '}
        <button type="button" onClick={onSwitch} className="text-primary-600 font-bold hover:underline">
          Đăng nhập
        </button>
      </p>
    </form>
  )
}

/* ─── Decorative math symbols ────────────────────────────────────────── */
const SYMBOLS = [
  { s: '∫', x: '8%',  y: '12%', size: '4rem', rot: '-15deg', op: 0.07 },
  { s: '∑', x: '88%', y: '8%',  size: '3rem', rot: '10deg',  op: 0.06 },
  { s: 'π', x: '5%',  y: '72%', size: '3.5rem',rot: '-8deg', op: 0.07 },
  { s: '∞', x: '85%', y: '78%', size: '3rem', rot: '12deg',  op: 0.06 },
  { s: '√', x: '78%', y: '42%', size: '2.8rem',rot: '-5deg', op: 0.05 },
  { s: 'Δ', x: '14%', y: '44%', size: '2.5rem',rot: '20deg', op: 0.05 },
  { s: '∂', x: '55%', y: '5%',  size: '2.2rem',rot: '-12deg',op: 0.05 },
  { s: 'θ', x: '42%', y: '90%', size: '2.5rem',rot: '8deg',  op: 0.05 },
]

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { clearError } = useAuthStore()
  const tab = searchParams.get('tab') === 'register' ? 'register' : 'login'

  const switchTab = (newTab) => {
    clearError()
    setSearchParams(newTab === 'register' ? { tab: 'register' } : {})
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden
      bg-gradient-to-br from-primary-50 via-white to-blue-50">

      {/* floating math decorations */}
      {SYMBOLS.map(({ s, x, y, size, rot, op }) => (
        <span
          key={s}
          aria-hidden="true"
          style={{
            position: 'absolute', left: x, top: y,
            fontSize: size, transform: `rotate(${rot})`,
            opacity: op, userSelect: 'none', pointerEvents: 'none',
            fontWeight: 900, color: '#2563eb',
          }}
        >
          {s}
        </span>
      ))}

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group mb-5">
            <span className="font-bebas text-5xl text-foreground group-hover:text-primary-600 transition-colors">Calculus</span>
          </Link>
          <p className="text-slate-500 text-sm">
            {tab === 'login' ? 'Welcome back!' : 'Create your account to start your learning journey!'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-100">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-4 text-sm font-bold transition-all relative
                  ${tab === t ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                {tab === t && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-primary-500" />
                )}
              </button>
            ))}
          </div>

          {/* Form area */}
          <div className="p-7 pt-6">
            {tab === 'login'
              ? <LoginForm onSwitch={() => switchTab('register')} />
              : <RegisterForm onSwitch={() => switchTab('login')} />}
          </div>
        </div>
      </div>
    </div>
  )
}
