import { useQuery } from '@tanstack/react-query'
import { BookOpen, Users, Award, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CourseIcon } from '../components/ui/semantic-icon'

const API_URL = '/api/v1'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
          <p className="text-2xl font-extrabold text-slate-800 tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: courses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/stories`)
      return res.json()
    }
  })

  const stats = [
    { icon: BookOpen, label: 'Total Courses', value: courses?.length || 0, color: 'bg-indigo-600' },
    { icon: Users, label: 'Active Users', value: '—', color: 'bg-emerald-600' },
    { icon: Award, label: 'Achievements', value: 17, color: 'bg-amber-500' },
    { icon: TrendingUp, label: 'Total XP Earned', value: '—', color: 'bg-indigo-500' },
  ]

  return (
    <div className="space-y-6 font-sans">
      <h2 className="text-2xl font-extrabold text-slate-900">Dashboard</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/admin/courses" className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-700 font-bold transition-colors text-center text-sm">
            + New Course
          </Link>
          <Link to="/admin/data" className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-700 font-bold transition-colors text-center text-sm">
            Sync Data
          </Link>
          <button className="p-4 bg-amber-50 hover:bg-amber-100 rounded-xl text-amber-700 font-bold transition-colors text-sm cursor-pointer">
            Backup DB
          </button>
          <Link to="/admin/server" className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-700 font-bold transition-colors text-center text-sm">
            View Status
          </Link>
        </div>
      </div>

      {/* Recent Courses */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Courses</h3>
        <div className="space-y-3">
          {courses?.map(course => (
            <Link 
              key={course.id}
              to={`/admin/courses/${course.slug}`}
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <CourseIcon course={course} className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-bold text-sm text-slate-800">{course.title}</p>
                  <p className="text-xs text-slate-400 font-medium">{course.difficulty}</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                course.is_published 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {course.is_published ? 'Published' : 'Draft'}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
