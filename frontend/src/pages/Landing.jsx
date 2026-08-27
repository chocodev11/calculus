import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ArrowRight, Compass, Sliders, Cpu, Activity, Lightbulb, 
  ChevronRight, Layers, GraduationCap, Zap, Flame, Check
} from 'lucide-react'
import { TactileButton } from '../components/ui/tactile-button'
import soundFX from '../lib/soundEffects'
import 'katex/dist/katex.min.css'
import * as ReactKatexModule from 'react-katex'
import { getFeaturedCourse } from '../lib/courseRegistry'

const ReactKatex = ReactKatexModule.default || ReactKatexModule
const { InlineMath } = ReactKatex

export default function Landing() {
  const navigate = useNavigate()
  const [selectedGrade, setSelectedGrade] = useState('10')

  const curriculumData = {
    '10': [
      {
        slug: 'menh-de',
        title: 'Mệnh Đề & Logic Toán Học',
        grade: 'Lớp 10',
        topic: 'Đại số & Logic',
        description: 'Khám phá mệnh đề, mệnh đề chứa biến, lượng từ ∀ ∃ và quy tắc chân trị của phép kéo theo.',
        lessonsCount: 7,
        isFeatured: true,
      },
      {
        slug: 'tap-hop',
        title: 'Tập Hợp & Các Phép Toán',
        grade: 'Lớp 10',
        topic: 'Đại số',
        description: 'Trực quan hóa tập con, hợp, giao, hiệu và biểu đồ Venn đa chiều tương tác.',
        lessonsCount: 6,
        isFeatured: false,
      },
      {
        slug: 'bat-phuong-trinh',
        title: 'Bất Phương Trình Bậc Nhất 2 Ẩn',
        grade: 'Lớp 10',
        topic: 'Đại số & Tọa độ',
        description: 'Biểu diễn miền nghiệm trực quan trên mặt phẳng Oxy và bài toán tối ưu tuyến tính.',
        lessonsCount: 5,
        isFeatured: false,
      },
      {
        slug: 'luong-giac-10',
        title: 'Giá Trị Lượng Giác & Hệ Thức Lượng',
        grade: 'Lớp 10',
        topic: 'Hình học',
        description: 'Vòng tròn lượng giác từ 0° đến 180°, định lý sin, cos và diện tích tam giác.',
        lessonsCount: 8,
        isFeatured: false,
      }
    ],
    '11': [
      {
        slug: 'ham-so-luong-giac',
        title: 'Hàm Số Lượng Giác & Phương Trình',
        grade: 'Lớp 11',
        topic: 'Giải tích',
        description: 'Khảo sát tính tuần hoàn, đồ thị sin/cos và phương pháp giải phương trình lượng giác cơ bản.',
        lessonsCount: 8,
        isFeatured: false,
      },
      {
        slug: 'day-so-cap-so',
        title: 'Dãy Số & Cấp Số Cộng, Cấp Số Nhân',
        grade: 'Lớp 11',
        topic: 'Đại số',
        description: 'Quy luật tăng trưởng cấp số, tổng n số hạng và mô hình toán học ứng dụng thực tế.',
        lessonsCount: 6,
        isFeatured: false,
      },
      {
        slug: 'gioi-han-dao-ham',
        title: 'Giới Hạn & Ý Nghĩa Đạo Hàm',
        grade: 'Lớp 11',
        topic: 'Giải tích',
        description: 'Ý nghĩa hình học của tiếp tuyến, vận tốc tức thời và các quy tắc tính đạo hàm.',
        lessonsCount: 9,
        isFeatured: true,
      }
    ],
    '12': [
      {
        slug: 'ung-dung-dao-ham',
        title: 'Ứng Dụng Đạo Hàm Khảo Sát Hàm Số',
        grade: 'Lớp 12',
        topic: 'Giải tích',
        description: 'Đơn điệu, cực trị, tiệm cận và các bài toán tối ưu hóa trong đề thi tốt nghiệp.',
        lessonsCount: 10,
        isFeatured: true,
      },
      {
        slug: 'nguyen-ham-tich-phan',
        title: 'Nguyên Hàm & Tích Phân',
        grade: 'Lớp 12',
        topic: 'Giải tích',
        description: 'Ý nghĩa diện tích hình phẳng, thể tích khối tròn xoay và phương pháp đổi biến.',
        lessonsCount: 8,
        isFeatured: false,
      },
      {
        slug: 'hinh-khong-gian-oxyz',
        title: 'Tọa Độ Trong Không Gian Oxyz',
        grade: 'Lớp 12',
        topic: 'Hình học',
        description: 'Vectơ không gian, phương trình mặt phẳng, đường thẳng và mặt cầu không gian 3D.',
        lessonsCount: 7,
        isFeatured: false,
      }
    ]
  }

  const activeCourses = curriculumData[selectedGrade] || curriculumData['10']

  return (
    <div className="w-full flex flex-col items-center bg-slate-50 overflow-hidden font-sans select-none">
      
      {/* ─── 1. HERO SECTION (Editorial Minimalism) ───────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Typography & Intent */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Minimalist Eyebrow Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-slate-600 text-xs font-bold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <span>TOÁN HỌC TRỰC QUAN · GDPT 2018</span>
            </div>

            {/* Main Headline (Fixed line-height for Vietnamese diacritics - no overlap) */}
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-black text-slate-900 tracking-tight leading-[1.28] pb-1 space-y-1">
              <span className="block text-slate-900">Làm Chủ Toán Học</span>
              <span className="block text-indigo-600">Bằng Trực Giác Hình Học</span>
            </h1>

            {/* Concise Subtitle (Under 15 words) */}
            <p className="text-base sm:text-lg text-slate-600 max-w-lg mx-auto lg:mx-0 leading-relaxed font-normal">
              Hiểu sâu bản chất Toán 10–12 qua mô phỏng tương tác sinh động thay vì học vẹt công thức.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1">
              <TactileButton 
                variant="primary" 
                size="lg" 
                onClick={() => {
                  soundFX.play('tap')
                  navigate('/register')
                }}
                className="w-full sm:w-auto text-base bg-indigo-600 hover:bg-indigo-500 font-bold px-7"
              >
                <span>Bắt đầu học miễn phí</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </TactileButton>

              <TactileButton 
                variant="secondary" 
                size="lg" 
                onClick={() => {
                  soundFX.play('tap')
                  navigate('/explore')
                }}
                className="w-full sm:w-auto text-base font-bold px-7"
              >
                <Compass className="w-4 h-4 mr-2 text-slate-500" />
                <span>Khám phá lộ trình</span>
              </TactileButton>
            </div>
          </div>

          {/* Right Column: Refined Interactive Living Sandbox */}
          <div className="lg:col-span-5 relative flex justify-center">
            <HeroInteractiveSandbox />
          </div>

        </div>
      </section>


      {/* ─── 2. THE 3-PILLAR METHODOLOGY (Flat Bento Minimalist) ───────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-slate-200">
        
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
            Triết lý đào tạo
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Hiểu Sâu Bản Chất Thay Vì Học Vẹt
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-normal">
            Khám phá quy luật toán học thông qua thao tác mô hình trước khi tiếp cận công thức trừu tượng.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-300 transition-colors flex flex-col space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">1. Thao Tác Mô Hình Trực Quan</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Tự tay kéo trượt tham số, bật tắt công tắc mệnh đề và quan sát hình chiếu lượng giác chuyển động để hình thành trực giác toán học tự nhiên.
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-1 text-xs font-bold text-indigo-600">
              <span>Học bằng tương tác vật lý</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-300 transition-colors flex flex-col space-y-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">2. Phản Hồi Tức Thì & Lời Giải</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Mỗi câu hỏi đều phân tích nguyên nhân sai lầm và cung cấp lời giải KaTeX chuẩn hóa từng bước. Không bao giờ rơi vào trạng thái bế tắc.
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-1 text-xs font-bold text-sky-600">
              <span>Khắc phục lỗ hổng tư duy</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-300 transition-colors flex flex-col space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Flame className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">3. Động Lực Học Tập Bền Bỉ</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Hệ thống chuỗi ngày học liên tục (Streak), tích lũy XP, bảo vệ Tim và mở khóa danh hiệu giúp bạn xây dựng thói quen 15 phút học mỗi ngày.
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-1 text-xs font-bold text-amber-600">
              <span>Duy trì kỷ luật học tập</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>
      </section>


      {/* ─── 3. BITE-SIZED LEARNING LOOP ──────────────────────────────── */}
      <section className="w-full bg-slate-100/60 border-y border-slate-200 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600 bg-white px-3 py-1 rounded-md border border-slate-200">
              Quy trình học tập
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              15 Phút Mỗi Ngày Để Làm Chủ
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Chia nhỏ kiến thức phức tạp thành từng bước logic dễ tiếp thu và ghi nhớ lâu dài.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <div className="text-xs font-extrabold text-indigo-600 font-mono tracking-wider">
                01 / THÍ NGHIỆM
              </div>
              <h3 className="text-base font-bold text-slate-900">Mô Phỏng Trực Quan</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Tương tác với mô hình động để tự rút ra trực giác trước khi tiếp cận công thức.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <div className="text-xs font-extrabold text-sky-600 font-mono tracking-wider">
                02 / LÝ THUYẾT
              </div>
              <h3 className="text-base font-bold text-slate-900">Chuẩn Hóa Khái Niệm</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Đọc định nghĩa súc tích và công thức KaTeX chuẩn mực theo chương trình GDPT.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <div className="text-xs font-extrabold text-amber-600 font-mono tracking-wider">
                03 / LUYỆN TẬP
              </div>
              <h3 className="text-base font-bold text-slate-900">Vượt Thử Thách Quiz</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Kiểm tra mức độ hiểu sâu qua các câu hỏi tình huống và nhận phản hồi tức thì.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <div className="text-xs font-extrabold text-emerald-600 font-mono tracking-wider">
                04 / TIẾN BỘ
              </div>
              <h3 className="text-base font-bold text-slate-900">Tích Lũy & Leo Rank</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Thu thập XP, thăng hạng tuần và duy trì chuỗi học tập đều đặn mỗi ngày.
              </p>
            </div>

          </div>

        </div>
      </section>


      {/* ─── 4. CURRICULUM HIGHLIGHTS & GRADE SELECTOR ───────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
              Lộ trình GDPT 2018
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Khóa Học Theo Khối Lớp
            </h2>
            <p className="text-sm text-slate-600 font-normal">
              Chọn khối lớp để khám phá các chủ điểm kiến thức trọng tâm.
            </p>
          </div>

          {/* Grade Selector Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            {['10', '11', '12'].map((grade) => {
              const isActive = selectedGrade === grade
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => {
                    soundFX.play('select')
                    setSelectedGrade(grade)
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lớp {grade}
                </button>
              )
            })}
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCourses.map((course, idx) => (
            <div 
              key={course.slug || idx}
              className={`bg-white border rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all ${
                course.isFeatured ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {course.grade}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600">
                      {course.topic}
                    </span>
                  </div>
                  {course.isFeatured && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Khuyên học
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {course.title}
                </h3>
                <p className="text-xs text-slate-500 font-normal leading-relaxed">
                  {course.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {course.lessonsCount} bài tương tác
                </span>
                <TactileButton
                  variant={course.isFeatured ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    soundFX.play('tap')
                    navigate(`/course/${course.slug}`)
                  }}
                  className="h-8 px-3 text-xs font-bold"
                >
                  <span>Học thử ngay</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </TactileButton>
              </div>
            </div>
          ))}
        </div>

      </section>


      {/* ─── 5. FINAL CALL TO ACTION (Harmonious Light Flat Card) ────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white border-2 border-indigo-200/80 rounded-3xl p-8 sm:p-14 text-center space-y-6 relative shadow-xs">
          
          <div className="space-y-3 relative z-10 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-200">
              Trải nghiệm học tập trực quan
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Sẵn Sàng Học Toán Hiểu Bản Chất?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Bắt đầu với một chủ điểm phù hợp và xây dựng tiến bộ đều đặn cùng TiaMath.
            </p>
          </div>

          <div className="pt-2 relative z-10 flex flex-col sm:flex-row justify-center items-center gap-3.5">
            <TactileButton 
              variant="primary" 
              size="lg" 
              onClick={() => {
                soundFX.play('tap')
                navigate('/register')
              }}
              className="w-full sm:w-auto text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-7"
            >
              <span>Tạo tài khoản miễn phí</span>
            </TactileButton>

            <TactileButton 
              variant="secondary" 
              size="lg" 
              onClick={() => {
                soundFX.play('tap')
                navigate('/course/menh-de')
              }}
              className="w-full sm:w-auto text-base font-bold px-7"
            >
              <span>Vào học thử bài 1</span>
            </TactileButton>
          </div>

          <p className="text-xs text-slate-500 font-medium relative z-10">
            Không cần thẻ tín dụng · Hoàn toàn miễn phí khi bắt đầu
          </p>

        </div>
      </section>

    </div>
  )
}


/**
 * Centerpiece Interactive Sandbox Component (Refined Minimalist Architecture)
 */
function HeroInteractiveSandbox() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('logic')
  const [xpClaimed, setXpClaimed] = useState(false)

  const handleInteractionReward = () => {
    if (!xpClaimed) {
      setXpClaimed(true)
      soundFX.play('correct')
    }
  }

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 space-y-4 relative">
      
      {/* Chrome Top Bar with Integrated Score & Segmented Switcher */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        {/* Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={() => {
              soundFX.play('select')
              setActiveTab('logic')
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'logic' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Logic
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.play('select')
              setActiveTab('trig')
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'trig' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Lượng Giác
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.play('select')
              setActiveTab('tangent')
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tangent' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Đạo Hàm
          </button>
        </div>

        {/* Integrated Score Pill */}
        <div 
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all ${
            xpClaimed 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${xpClaimed ? 'text-emerald-600 fill-emerald-500' : 'text-amber-500 fill-amber-400'}`} />
          <span>{xpClaimed ? '+50 XP' : 'Thử tương tác'}</span>
        </div>
      </div>

      {/* Active Interactive Surface */}
      {activeTab === 'logic' && (
        <LogicGateLab onInteract={handleInteractionReward} />
      )}

      {activeTab === 'trig' && (
        <TrigCircleLab onInteract={handleInteractionReward} />
      )}

      {activeTab === 'tangent' && (
        <TangentConvergenceLab onInteract={handleInteractionReward} />
      )}

      {/* Bottom Minimalist Status & Action */}
      <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-100">
        <span className="text-slate-400 font-medium text-[11px]">
          Mô phỏng trực quan thời gian thực
        </span>
        <button
          type="button"
          onClick={() => navigate('/course/menh-de')}
          className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
        >
          <span>Khám phá bài 1</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  )
}


/**
 * 1. Logic Gate Lab: P => Q Implication Circuit (Minimalist)
 */
function LogicGateLab({ onInteract }) {
  const [p, setP] = useState(true)
  const [q, setQ] = useState(true)

  const implication = !p || q

  const handleToggleP = () => {
    setP(!p)
    soundFX.play('tap')
    onInteract()
  }

  const handleToggleQ = () => {
    setQ(!q)
    soundFX.play('tap')
    onInteract()
  }

  return (
    <div className="space-y-3.5">
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Mệnh đề kéo theo: <InlineMath math="P \implies Q" /></span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
            implication 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {implication ? 'Mệnh đề ĐÚNG' : 'Mệnh đề SAI'}
          </span>
        </div>

        {/* Interactive Switches */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Switch P */}
          <button
            type="button"
            onClick={handleToggleP}
            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              p 
                ? 'bg-white border-indigo-300 text-slate-900 shadow-xs' 
                : 'bg-slate-100/80 border-slate-200 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Giả thiết P</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs font-bold">{p ? 'ĐÚNG' : 'SAI'}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${p ? 'bg-indigo-600' : 'bg-slate-300'}`} />
            </div>
          </button>

          {/* Switch Q */}
          <button
            type="button"
            onClick={handleToggleQ}
            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              q 
                ? 'bg-white border-indigo-300 text-slate-900 shadow-xs' 
                : 'bg-slate-100/80 border-slate-200 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kết luận Q</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs font-bold">{q ? 'ĐÚNG' : 'SAI'}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${q ? 'bg-indigo-600' : 'bg-slate-300'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Logical Intuition Explanation Box */}
      <div className={`p-3 rounded-xl border text-xs leading-relaxed font-normal transition-colors ${
        implication 
          ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900' 
          : 'bg-rose-50/60 border-rose-200/80 text-rose-900'
      }`}>
        {p && !q ? (
          <p>
            <strong className="font-bold text-rose-900">Phản ví dụ xuất hiện:</strong> Giả thiết <InlineMath math="P" /> Đúng nhưng Kết luận <InlineMath math="Q" /> lại Sai, do đó toàn bộ mệnh đề kéo theo là <strong className="font-bold underline">SAI</strong>.
          </p>
        ) : !p ? (
          <p>
            <strong className="font-bold text-emerald-900">Quy ước logic:</strong> Khi giả thiết <InlineMath math="P" /> Sai, mệnh đề <InlineMath math="P \implies Q" /> luôn mặc nhiên là <strong className="font-bold">ĐÚNG</strong> (Vacuous truth).
          </p>
        ) : (
          <p>
            <strong className="font-bold text-emerald-900">Hợp logic:</strong> Giả thiết <InlineMath math="P" /> Đúng và Kết luận <InlineMath math="Q" /> Đúng, mệnh đề kéo theo là <strong className="font-bold">ĐÚNG</strong>.
          </p>
        )}
      </div>
    </div>
  )
}


/**
 * 2. Trigonometry Unit Circle Lab (Minimalist)
 */
function TrigCircleLab({ onInteract }) {
  const [angleDeg, setAngleDeg] = useState(45)
  const canvasRef = useRef(null)

  const angleRad = (angleDeg * Math.PI) / 180
  const cosVal = Math.cos(angleRad)
  const sinVal = Math.sin(angleRad)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const r = 68

    ctx.clearRect(0, 0, width, height)

    // Axes
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(15, cy)
    ctx.lineTo(width - 15, cy)
    ctx.moveTo(cx, 15)
    ctx.lineTo(cx, height - 15)
    ctx.stroke()

    // Unit Circle
    ctx.strokeStyle = '#CBD5E1'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()

    // Point P
    const px = cx + r * cosVal
    const py = cy - r * sinVal

    // Cosine projection on X (Indigo)
    ctx.strokeStyle = '#4F46E5'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(px, cy)
    ctx.stroke()

    // Sine projection on Y (Emerald)
    ctx.strokeStyle = '#10B981'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(px, cy)
    ctx.lineTo(px, py)
    ctx.stroke()

    // Radius line
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(px, py)
    ctx.stroke()

    // Dot at P
    ctx.fillStyle = '#4F46E5'
    ctx.beginPath()
    ctx.arc(px, py, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1.5
    ctx.stroke()

  }, [angleDeg, cosVal, sinVal])

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div className="relative rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center">
        <canvas ref={canvasRef} width={260} height={165} className="block" />
        <div className="absolute top-2 right-2 space-y-1 text-right">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 block tabular-nums">
            cos α = {cosVal.toFixed(2)}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 block tabular-nums">
            sin α = {sinVal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Scrubber */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-700">
          <span>Góc lượng giác α:</span>
          <span className="text-slate-900 font-bold tabular-nums">{angleDeg}° (≈ {(angleRad / Math.PI).toFixed(2)}π)</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="5"
          value={angleDeg}
          onChange={(e) => {
            setAngleDeg(parseInt(e.target.value))
            onInteract()
          }}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

      {/* Quick Presets */}
      <div className="flex items-center justify-between gap-1 pt-0.5">
        {[30, 45, 60, 90, 180, 270].map((deg) => (
          <button
            key={deg}
            type="button"
            onClick={() => {
              setAngleDeg(deg)
              soundFX.play('tap')
              onInteract()
            }}
            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-600 transition-colors cursor-pointer"
          >
            {deg}°
          </button>
        ))}
      </div>
    </div>
  )
}


/**
 * 3. Tangent Convergence Lab: Secant to Tangent delta x -> 0 (Minimalist)
 */
function TangentConvergenceLab({ onInteract }) {
  const [deltaX, setDeltaX] = useState(1.4)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    const toCanvasX = (x) => (x + 1.5) * (width / 5.5)
    const toCanvasY = (y) => height - (y + 0.5) * (height / 6)

    // Grid lines
    ctx.strokeStyle = '#F1F5F9'
    ctx.lineWidth = 1
    for (let x = -1; x <= 4; x += 1) {
      ctx.beginPath()
      ctx.moveTo(toCanvasX(x), 0)
      ctx.lineTo(toCanvasX(x), height)
      ctx.stroke()
    }

    // Parabola Curve f(x) = 0.45 * x^2 + 0.8
    const f = (x) => 0.45 * x * x + 0.8
    ctx.beginPath()
    ctx.strokeStyle = '#4F46E5'
    ctx.lineWidth = 2.5
    for (let i = 0; i <= width; i += 2) {
      const x = -1.5 + (i / width) * 5.5
      const y = f(x)
      const cx = toCanvasX(x)
      const cy = toCanvasY(y)
      if (i === 0) ctx.moveTo(cx, cy)
      else ctx.lineTo(cx, cy)
    }
    ctx.stroke()

    // Fixed point A(x0, y0)
    const x0 = 1.0
    const y0 = f(x0)
    const cx0 = toCanvasX(x0)
    const cy0 = toCanvasY(y0)

    // Moving point B(x0 + deltaX, y(x0 + deltaX))
    const x1 = x0 + deltaX
    const y1 = f(x1)
    const cx1 = toCanvasX(x1)
    const cy1 = toCanvasY(y1)

    // Secant/Tangent line
    const slope = (y1 - y0) / (x1 - x0)
    ctx.beginPath()
    ctx.strokeStyle = deltaX < 0.2 ? '#10B981' : '#0284C7'
    ctx.lineWidth = 2
    ctx.setLineDash(deltaX < 0.2 ? [] : [4, 4])

    const lineXStart = -1.0
    const lineYStart = y0 + slope * (lineXStart - x0)
    const lineXEnd = 3.5
    const lineYEnd = y0 + slope * (lineXEnd - x0)

    ctx.moveTo(toCanvasX(lineXStart), toCanvasY(lineYStart))
    ctx.lineTo(toCanvasX(lineXEnd), toCanvasY(lineYEnd))
    ctx.stroke()
    ctx.setLineDash([])

    // Point A
    ctx.fillStyle = '#4F46E5'
    ctx.beginPath()
    ctx.arc(cx0, cy0, 4.5, 0, Math.PI * 2)
    ctx.fill()

    // Point B
    ctx.fillStyle = deltaX < 0.2 ? '#10B981' : '#0284C7'
    ctx.beginPath()
    ctx.arc(cx1, cy1, 4.5, 0, Math.PI * 2)
    ctx.fill()

  }, [deltaX])

  const slopeValue = (0.45 * (1 + deltaX) ** 2 + 0.8 - (0.45 * 1 + 0.8)) / deltaX
  const exactTangent = 0.90

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} width={340} height={165} className="w-full h-auto block" />
        {deltaX < 0.2 && (
          <div className="absolute top-2 right-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
            Tiếp tuyến chính xác
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs font-semibold">
        <div>
          <span className="text-slate-400 text-[10px] uppercase">Độ dốc cát tuyến m</span>
          <p className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
            {slopeValue.toFixed(3)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-slate-400 text-[10px] uppercase">Đạo hàm f'(1)</span>
          <p className="text-xs sm:text-sm font-bold text-emerald-600 tabular-nums">
            = {exactTangent.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-700">
          <span>Thu hẹp Δx → 0:</span>
          <span className="text-slate-900 font-bold tabular-nums">Δx = {deltaX.toFixed(2)}</span>
        </div>
        <input 
          type="range"
          min="0.05"
          max="2.0"
          step="0.02"
          value={deltaX}
          onChange={(e) => {
            setDeltaX(parseFloat(e.target.value))
            onInteract()
          }}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>
    </div>
  )
}
