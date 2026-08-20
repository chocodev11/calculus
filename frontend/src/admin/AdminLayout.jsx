import { NavLink, Outlet, Link } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BookOpen, 
  Database, 
  Server, 
  Settings,
  Menu,
  X,
  ArrowLeft,
  Sigma
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
  { to: '/admin/data', icon: Database, label: 'Data Manager' },
  { to: '/admin/server', icon: Server, label: 'Server Status' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-slate-950 text-white border-r border-slate-800 transition-[width] duration-200",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
          {sidebarOpen && (
            <span className="flex items-center gap-2 text-xl font-bold">
              <Sigma size={20} aria-hidden="true" />
              Admin
            </span>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label={sidebarOpen ? 'Thu gọn thanh điều hướng' : 'Mở thanh điều hướng'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                isActive 
                  ? "bg-indigo-600 text-white border-b-2 border-indigo-800"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon size={20} />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
          
          {/* Back to App */}
          <div className="pt-4 border-t border-slate-800 mt-4">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              {sidebarOpen && <span>Back to App</span>}
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className={cn(
        "transition-[margin] duration-200",
        sidebarOpen ? "ml-64" : "ml-16"
      )}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <h1 className="text-xl font-semibold text-slate-900">
            Calculus Admin Panel
          </h1>
        </header>
        
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
