import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Compass, BookOpen, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import { t } from '../lib/locale'
import soundFX from '../lib/soundEffects'
import { TactileButton } from '../components/ui/tactile-button'
import { getFallbackLearningPaths } from '../lib/courseRegistry'

const GRADES = [
  { id: 'all', label: 'Tất cả các lớp' },
  { id: '10', label: 'Lớp 10' },
  { id: '11', label: 'Lớp 11' },
  { id: '12', label: 'Lớp 12' }
]

export default function Explore() {
  const [learningPaths, setLearningPaths] = useState([])
  const [selectedGrade, setSelectedGrade] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLearningPaths()
  }, [])

  const loadLearningPaths = async () => {
    try {
      const data = await api.get('/courses/learning-paths')
      if (Array.isArray(data) && data.length > 0) {
        setLearningPaths(data)
      } else {
        const storiesData = await api.get('/courses')
        if (Array.isArray(storiesData) && storiesData.length > 0) {
          setLearningPaths([
            {
              id: 'toan-10',
              grade: '10',
              title: 'Toán Lớp 10',
              description: 'Các chủ điểm kiến thức trọng tâm Toán 10: Mệnh đề, Tập hợp, Bất phương trình...',
              iconUrl: 'https://ds055uzetaobb.cloudfront.net/category-images/Foundations_of_Algebra-6MUKk8.png?width=204',
              courses: storiesData
            }
          ])
        } else {
          setLearningPaths(getFallbackLearningPaths())
        }
      }
    } catch (e) {
      console.error('Failed to load learning paths:', e)
      setLearningPaths(getFallbackLearningPaths())
    } finally {
      setLoading(false)
    }
  }

  const filteredPaths = useMemo(() => {
    if (selectedGrade === 'all') return learningPaths
    return learningPaths.filter(p => p.grade === selectedGrade || p.id === `toan-${selectedGrade}`)
  }, [learningPaths, selectedGrade])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-8 font-sans">
        <div className="h-8 bg-slate-200 rounded-2xl w-64" />
        <div className="h-4 bg-slate-200 rounded-xl w-96" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-20 sm:pb-28 space-y-10 sm:space-y-12 font-sans">
      
      {/* ─── Page Header ──────────────────────────────────────────────── */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold select-none">
          <Compass className="w-3.5 h-3.5" />
          <span>Thư viện khóa học</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t.explore?.title || 'Khám Phá Các Khóa Học'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
          Học toán tương tác từng bước qua các khối <strong className="text-slate-900 font-bold">Lớp 10, 11, 12</strong> và hệ thống <strong className="text-indigo-600 font-bold">Chủ điểm chuyên sâu</strong>.
        </p>
      </div>

      {/* ─── Grade Filter Pills (2.5D Tactile Mechanical Bevels) ────────── */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {GRADES.map(grade => {
          const isActive = selectedGrade === grade.id
          return (
            <button
              key={grade.id}
              type="button"
              onClick={() => {
                soundFX.pop()
                setSelectedGrade(grade.id)
              }}
              className={isActive ? 'pill-tactile-active' : 'pill-tactile-inactive'}
            >
              {grade.label}
            </button>
          )
        })}
      </div>

      {/* ─── Content Area ─────────────────────────────────────────────── */}
      <div className="space-y-12">
        <AnimatePresence mode="wait">
          {filteredPaths.length > 0 ? (
            filteredPaths.map((path, index) => (
              <motion.div 
                key={path.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Path Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    {path.iconUrl ? (
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 p-2 shrink-0 flex items-center justify-center">
                        <img src={path.iconUrl} alt={path.title} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{path.title}</h2>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">{path.description}</p>
                    </div>
                  </div>
                </div>

                {/* Courses Grid / Tray */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {path.courses.map((course, cIdx) => (
                    <CourseCard key={course.slug || cIdx} course={course} />
                  ))}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-8 sm:p-10 text-center space-y-4 max-w-xl mx-auto"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900">Khóa học đang được chuẩn bị</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  Nội dung cho khối {GRADES.find(g => g.id === selectedGrade)?.label} đang được hoàn thiện theo chương trình chuẩn hóa. Hãy trải nghiệm ngay chương trình Toán Lớp 10!
                </p>
              </div>
              <TactileButton 
                variant="primary" 
                size="sm"
                onClick={() => setSelectedGrade('10')}
              >
                Xem Toán Lớp 10
              </TactileButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}

function CourseCard({ course }) {
  const gradeDisplay = course.grade_title || (course.grade ? `Lớp ${course.grade}` : 'Lớp 10')
  const topicDisplay = course.topic_title || (course.topic === 'menh-de' ? 'Mệnh đề' : 'Chủ điểm trọng tâm')
  const progressPercent = Math.round(course.progress_percent ?? course.progress ?? 0)
  const isCompleted = progressPercent >= 100
  const hasStarted = progressPercent > 0

  return (
    <Link 
      to={`/course/${course.slug}`} 
      onClick={() => soundFX.click()}
      className="card-flat-interactive flex flex-col group no-underline relative"
    >
      {/* Badges Bar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            {gradeDisplay}
          </span>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
            Chủ điểm: {topicDisplay}
          </span>
        </div>

        {course.isNew && (
          <div className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
            {t.explore?.new || 'MỚI'}
          </div>
        )}
      </div>

      {/* Visual & Info */}
      <div className="flex items-start gap-4 mb-4">
        {course.illustration ? (
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50/50 border border-indigo-100 p-2 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 duration-150">
            <img 
              src={course.illustration} 
              className="w-full h-full object-contain"
              alt={course.title}
            />
          </div>
        ) : (
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 transition-transform group-hover:scale-105 duration-150">
            <GraduationCap className="w-9 h-9" />
          </div>
        )}

        <div className="space-y-1.5 flex-1 min-w-0">
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
            {course.title}
          </h3>
          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
            {course.description || 'Làm chủ lý thuyết, ví dụ trực quan và bài tập vận dụng qua từng bài học tương tác.'}
          </p>
        </div>
      </div>

      {/* Progress if started */}
      {hasStarted && (
        <div className="mb-3.5 space-y-1">
          <div className="flex justify-between items-center text-[11px] font-bold">
            <span className="text-slate-400">Tiến độ</span>
            <span className={isCompleted ? 'text-emerald-600' : 'text-indigo-600 tabular-nums'}>
              {isCompleted ? 'Đã hoàn thành' : `${progressPercent}%`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
              style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer CTA with Tactile Affordance */}
      <div className="mt-auto pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">
          {course.chapters?.length ? `${course.chapters.length} Chương` : '1 Chương'} • 7 Bài học tương tác
        </span>
        <span className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold text-xs flex items-center gap-1 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-700 transition-all">
          <span>{hasStarted ? (isCompleted ? 'Ôn tập' : 'Học tiếp') : 'Học ngay'}</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  )
}


