import { useNavigate } from 'react-router-dom'
import { Home, Search } from 'lucide-react'
import { TactileButton } from '../components/ui/tactile-button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
          <Search className="w-10 h-10" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
          <p className="text-slate-500 text-sm font-medium">Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.</p>
        </div>
        <div className="pt-2">
          <TactileButton variant="primary" size="md" onClick={() => navigate('/')} className="mx-auto">
            <Home className="w-4 h-4 mr-2" />
            <span>Về trang chủ</span>
          </TactileButton>
        </div>
      </div>
    </div>
  )
}
