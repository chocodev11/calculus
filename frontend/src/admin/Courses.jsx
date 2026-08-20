import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { CourseIcon } from '../components/ui/semantic-icon'

const API_URL = '/api/v1'

export default function AdminCourses() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/stories`)
      return res.json()
    }
  })

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Courses Management</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm">
          <Plus size={18} />
          New Course
        </button>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Difficulty</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Chapters</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses?.map(course => (
              <tr key={course.id} className="hover:bg-slate-50/60">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                      <CourseIcon course={course} className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{course.title}</p>
                      <p className="text-xs text-slate-400 font-medium">{course.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">
                  {course.category?.name || '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                    course.difficulty === 'beginner' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    course.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {course.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-600 tabular-nums">
                  {course.chapter_count || 0}
                </td>
                <td className="px-6 py-4 text-xs font-bold">
                  {course.is_published ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Eye size={15} /> Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400">
                      <EyeOff size={15} /> Draft
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/courses/${course.slug}`}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </Link>
                    <button className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
