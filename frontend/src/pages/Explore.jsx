import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, GraduationCap, Compass, BookOpen } from 'lucide-react'
import api from '../lib/api'
import { t } from '../lib/locale'

export default function Explore() {
  const [learningPaths, setLearningPaths] = useState([])
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
        setLearningPaths([
          {
            id: 'calculus-core',
            title: 'Hành trình Giải tích',
            description: 'Khám phá giải tích từ giới hạn, đạo hàm đến vi tích phân trực quan.',
            courses: storiesData || []
          }
        ])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-8 font-sans">
        <div className="h-8 bg-slate-200 rounded-2xl w-64" />
        <div className="h-4 bg-slate-200 rounded-xl w-96" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10 font-sans">
      
      {/* ─── Page Header ──────────────────────────────────────────────── */}
      <div className="space-y-2 max-w-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
          <Compass className="w-3.5 h-3.5" />
          <span>Thư viện khóa học</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t.explore?.title || 'Khám Phá Các Học Phần'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
          {t.explore?.subtitle || 'Lộ trình bài bản từ trực quan hình học cơ bản đến kỹ thuật giải tích nâng cao.'}
        </p>
      </div>

      {/* ─── Learning Paths List ──────────────────────────────────────── */}
      <div className="space-y-12">
        {learningPaths.map((path, index) => (
          <div key={path.id || index} className="space-y-5">
            
            {/* Path Header */}
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
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{path.title}</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">{path.description}</p>
              </div>
            </div>

            {/* Courses Tray */}
            <div className="bg-slate-100/70 border border-slate-200 rounded-3xl p-5 sm:p-7 flex items-center gap-5 overflow-x-auto scrollbar-hide">
              {path.courses.map((course, cIdx) => (
                <div key={course.slug || cIdx} className="flex items-center gap-5 shrink-0">
                  <CourseCard course={course} />
                  {cIdx !== path.courses.length - 1 && (
                    <div className="w-6 h-1 bg-slate-300/80 rounded-full shrink-0 -translate-y-3 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}

function CourseCard({ course }) {
  return (
    <Link 
      to={`/course/${course.slug}`} 
      className="flex-shrink-0 w-44 sm:w-48 flex flex-col gap-3 group no-underline"
    >
      {/* Visual Tile */}
      <motion.div
        whileHover={{ y: -3 }}
        whileTap={{ y: 0 }}
        className="relative w-44 h-44 sm:w-48 sm:h-48 bg-white border-2 border-slate-200 rounded-3xl group-hover:border-indigo-400 flex flex-col items-center justify-center p-4 transition-colors duration-150 cursor-pointer"
      >
        {course.isNew && (
          <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t.explore?.new || 'MỚI'}
          </div>
        )}
        
        {course.illustration ? (
          <img 
            src={course.illustration} 
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
            alt={course.title}
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <GraduationCap className="w-10 h-10" />
          </div>
        )}
      </motion.div>
      
      {/* Title */}
      <div className="text-center font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug px-1">
        {course.title}
      </div>
    </Link>
  )
}
