import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Save, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { CourseIcon } from '../components/ui/semantic-icon'

const API_URL = '/api/v1'

export default function AdminCourseEditor() {
  const { slug } = useParams()
  const [expandedChapters, setExpandedChapters] = useState({})

  const { data: course, isLoading } = useQuery({
    queryKey: ['admin-course', slug],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/courses/${slug}`)
      return res.json()
    }
  })

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }))
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>
  }

  if (!course) {
    return <div className="text-center py-10">Course not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <CourseIcon course={course} className="w-7 h-7" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{course.title}</h2>
            <p className="text-gray-500">{course.slug}</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm transition-colors">
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Course Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Course Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                <input
                  type="text"
                  defaultValue={course.title}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  defaultValue={course.description}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Difficulty</label>
                <select 
                  defaultValue={course.difficulty}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="published"
                  defaultChecked={course.is_published}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <label htmlFor="published" className="text-sm font-bold text-slate-700">Published</label>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Chapters & Steps */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Chapters & Steps</h3>
              <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors">
                <Plus size={15} />
                Add Chapter
              </button>
            </div>

            <div className="space-y-3">
              {course.chapters?.map((chapter, chIdx) => (
                <div key={chapter.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                    onClick={() => toggleChapter(chapter.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedChapters[chapter.id] ? (
                        <ChevronDown size={18} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={18} className="text-slate-400" />
                      )}
                      <span className="font-bold text-sm text-slate-800">Ch {chIdx + 1}: {chapter.title}</span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({chapter.steps?.length || 0} steps)
                      </span>
                    </div>
                    <button 
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {expandedChapters[chapter.id] && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-2">
                      {chapter.steps?.map((step, sIdx) => (
                        <div key={step.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium">
                          <span>{sIdx + 1}. {step.title}</span>
                          <span className="text-slate-400 font-mono">{step.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
