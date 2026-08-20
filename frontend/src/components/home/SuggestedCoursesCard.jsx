import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Compass, ArrowRight, ArrowUpRight, BookOpen, Sparkles, Layers } from 'lucide-react'

export default function SuggestedCoursesCard({ courses = [], loading = false }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <section aria-label="Đang tải khóa học đề xuất" className="space-y-3.5">
        <div className="h-5 w-48 bg-slate-200 rounded-md animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-36 bg-white border border-slate-200 rounded-2xl p-4 animate-pulse" />
          <div className="h-36 bg-white border border-slate-200 rounded-2xl p-4 animate-pulse" />
        </div>
      </section>
    )
  }

  if (!courses || courses.length === 0) {
    return null
  }

  return (
    <section aria-label="Khóa học đề xuất và đang học khác" className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-600" aria-hidden="true" />
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Khóa học đề xuất & Chưa hoàn thành
          </h3>
        </div>
        <Link
          to="/explore"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-0.5 transition-colors"
        >
          <span>Xem tất cả</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {courses.map((course) => {
          const progressPercent = Math.round(course.progress_percent ?? course.progress ?? 0)
          const isEnrolled = course.is_enrolled || progressPercent > 0
          const gradeLabel = course.grade_title || (course.grade ? `Lớp ${course.grade}` : 'Lớp 10')
          const chapterCount = course.chapter_count || course.chapters?.length || 1

          return (
            <div
              key={course.slug || course.id}
              onClick={() => navigate(`/course/${course.slug}`)}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-4.5 hover:border-indigo-300 hover:bg-slate-50/40 transition-all cursor-pointer flex flex-col justify-between group space-y-3"
            >
              {/* Header tags */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 truncate max-w-[130px]">
                  {gradeLabel}
                </span>

                {progressPercent > 0 ? (
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 tabular-nums shrink-0">
                    {progressPercent}% xong
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                    <Layers className="w-3 h-3" />
                    <span>{chapterCount} chương</span>
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {course.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {course.description || 'Làm chủ kiến thức với mô phỏng và các bài học toán trực quan.'}
                </p>
              </div>

              {/* Footer / Progress or CTA */}
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                {progressPercent > 0 ? (
                  <div className="w-full space-y-1.5">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, progressPercent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 font-medium">Đang học</span>
                      <span className="font-bold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                        Học tiếp <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Chưa bắt đầu</span>
                    <span className="font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                      <span>Bắt đầu học</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
