import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Sparkles, ArrowRight, CheckCircle2, Flame, Zap, Trophy, Heart, 
  Layers, Compass, Check, Star, ShieldCheck, Play, ArrowUpRight,
  TrendingUp, BookOpen, Clock, Activity, Cpu, Sliders, Rocket
} from 'lucide-react'
import { TactileButton } from '../components/ui/tactile-button'
import { GamifyBadge } from '../components/ui/gamify-badge'
import 'katex/dist/katex.min.css'
import * as ReactKatexModule from 'react-katex'

const ReactKatex = ReactKatexModule.default || ReactKatexModule
const { InlineMath, BlockMath } = ReactKatex

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="w-full flex flex-col items-center bg-slate-50 overflow-hidden font-sans select-none">
      
      {/* ─── 1. HERO SECTION ────────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headline & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs sm:text-sm font-bold">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600" />
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Phương pháp trực quan hóa toán học tương tác</span>
            </div>

            {/* Main Headline (Pure solid typography - NO text gradient) */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Làm Chủ Giải Tích <br className="hidden sm:inline" />
              <span className="text-indigo-600">
                Bằng Trực Giác Hình Học
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Không còn những trang giáo trình khô khan và học vẹt công thức. Tự tay kéo trượt đồ thị, chứng kiến cát tuyến hội tụ thành tiếp tuyến và làm chủ <strong className="text-slate-900 font-bold">Giới hạn, Đạo hàm & Tích phân</strong> qua từng thử thách tương tác ngắn gọn.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <TactileButton 
                variant="primary" 
                size="lg" 
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto text-base"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                <span>Bắt đầu học miễn phí</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </TactileButton>

              <TactileButton 
                variant="secondary" 
                size="lg" 
                onClick={() => navigate('/explore')}
                className="w-full sm:w-auto text-base"
              >
                <Compass className="w-5 h-5 mr-2 text-sky-500" />
                <span>Khám phá lộ trình</span>
              </TactileButton>
            </div>

            {/* Trust Micro-bar */}
            <div className="flex items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-500 pt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Miễn phí 100% khi bắt đầu
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Không cần thẻ tín dụng
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Tương tác thời gian thực
              </span>
            </div>
          </div>

          {/* Right Column: Live Interactive Mini-Lab */}
          <div className="lg:col-span-5 relative flex justify-center">
            <HeroInteractiveDemo />
          </div>

        </div>
      </section>


      {/* ─── 2. SOCIAL PROOF & METRICS STRIP (PrepEdu style) ───────────── */}
      <section className="w-full bg-white border-y border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600 tabular-nums">10,000+</p>
              <p className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">Học viên tiến bộ</p>
            </div>

            <div className="space-y-1 border-l border-slate-200">
              <p className="text-3xl sm:text-4xl font-extrabold text-sky-500 tabular-nums">95%</p>
              <p className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">Hiểu sâu bản chất</p>
            </div>

            <div className="space-y-1 border-l border-slate-200">
              <p className="text-3xl sm:text-4xl font-extrabold text-amber-500 tabular-nums">50+</p>
              <p className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">Bài học tương tác</p>
            </div>

            <div className="space-y-1 border-l border-slate-200">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-500 tabular-nums flex items-center justify-center gap-1">
                4.9 <Star className="w-6 h-6 fill-amber-400 text-amber-400 inline" />
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">Đánh giá trung bình</p>
            </div>

          </div>
        </div>
      </section>


      {/* ─── 3. THE 3-PILLAR METHODOLOGY ─────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-20">
        
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            Phương pháp học tập trực quan
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Hiểu Sâu Bản Chất Thay Vì Học Thuộc
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Tự tay khám phá quy luật toán học thông qua mô phỏng động trước khi tiếp cận công thức đại số.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 hover:border-indigo-400 transition-colors flex flex-col space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-600">
              <Sliders className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">1. Trực Quan Hóa Hình Học</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tự tay kéo trượt đồ thị và quan sát sự hội tụ của cát tuyến thành tiếp tuyến. Hình thành trực giác trước khi học định lý.
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-indigo-600">
              <span>Học bằng tương tác vật lý</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 hover:border-sky-400 transition-colors flex flex-col space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 border-2 border-sky-200 flex items-center justify-center text-sky-600">
              <Cpu className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">2. Phản Hồi Tức Thì</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Mỗi câu đố đều có hệ thống phân tích lỗi sai và lời giải LaTeX chi tiết ngay lập tức. Không bao giờ rơi vào trạng thái bế tắc.
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-sky-600">
              <span>Khắc phục lỗ hổng tư duy</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 hover:border-amber-400 transition-colors flex flex-col space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600">
              <Flame className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">3. Gamification Gây Nghiện</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Hệ thống chuỗi ngày học liên tục (Streak), tích lũy XP, bảo vệ Tim và mở khóa danh hiệu giúp bạn duy trì kỷ luật học tập mỗi ngày.
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-amber-600">
              <span>Duy trì thói quen học tập</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

        </div>
      </section>


      {/* ─── 4. STEP-BY-STEP LEARNING LOOP (Duolingo-like bite-sized) ──── */}
      <section className="w-full bg-slate-100/70 border-y border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              Quy trình học tập 4 bước
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              15 Phút Mỗi Ngày Để Thành Thạo
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900">Tương Tác Thí Nghiệm</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Khám phá mô phỏng động, điều chỉnh tham số để tự rút ra trực giác toán học ban đầu.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-sky-500 text-white font-extrabold flex items-center justify-center text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900">Chuẩn Hóa Khái Niệm</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Đọc các định nghĩa và công thức toán học chặt chẽ được giải thích ngắn gọn, dễ hiểu.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white font-extrabold flex items-center justify-center text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900">Vượt Thử Thách Quiz</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Giải các câu hỏi trắc nghiệm kiểm tra độ hiểu sâu với phản hồi và lời giải chi tiết tức thì.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white font-extrabold flex items-center justify-center text-sm">
                04
              </div>
              <h3 className="text-lg font-bold text-slate-900">Nhận Thưởng & Leo Rank</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Thu thập XP, hoàn thành nhiệm vụ ngày và thi đua trên bảng xếp hạng với bạn bè.
              </p>
            </div>

          </div>

        </div>
      </section>


      {/* ─── 5. CORE CURRICULUM HIGHLIGHTS ────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-20">
        
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            Chương trình đào tạo
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Lộ Trình Giải Tích Toàn Diện
          </h2>
          <p className="text-base text-slate-600">
            Mỗi học phần được cấu trúc theo lộ trình bài bản, từng bước mở khóa kiến thức.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Course 1 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">Cơ bản</span>
              <span className="text-xs font-bold text-slate-400">3 Chương • 6 Bài</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Giới Hạn Hàm Số</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Khái niệm tiệm cận, vô cùng bé, giới hạn một bên và quy tắc L'Hôpital trực quan.
            </p>
            <div className="pt-2">
              <TactileButton variant="secondary" size="sm" onClick={() => navigate('/course/gioi-han-ham-so')} className="w-full">
                Khám phá khoá học
              </TactileButton>
            </div>
          </div>

          {/* Course 2 */}
          <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 space-y-4 relative">
            <div className="absolute -top-3 right-6 bg-indigo-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Phổ biến nhất
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">Trọng tâm</span>
              <span className="text-xs font-bold text-slate-400">3 Chương • 9 Bài</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Đạo Hàm & Ứng Dụng</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ý nghĩa tiếp tuyến, quy tắc chuỗi, tìm cực trị và bài toán tối ưu hóa thực tế.
            </p>
            <div className="pt-2">
              <TactileButton variant="primary" size="sm" onClick={() => navigate('/course/dao-ham')} className="w-full">
                Học ngay bây giờ
              </TactileButton>
            </div>
          </div>

          {/* Course 3 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Nâng cao</span>
              <span className="text-xs font-bold text-slate-400">3 Chương • 8 Bài</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Tích Phân & Diện Tích</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tổng Riemann, định lý cơ bản của giải tích và tính diện tích hình phẳng cong.
            </p>
            <div className="pt-2">
              <TactileButton variant="secondary" size="sm" onClick={() => navigate('/course/tich-phan')} className="w-full">
                Khám phá khoá học
              </TactileButton>
            </div>
          </div>

        </div>

      </section>


      {/* ─── 6. FINAL CTA BANNER ──────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-10 sm:p-14 text-center space-y-6 relative overflow-hidden">
          
          <div className="space-y-3 relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Sẵn Sàng Chinh Phục Môn Giải Tích?
            </h2>
            <p className="text-sm sm:text-base text-indigo-200 leading-relaxed">
              Tham gia cùng hàng ngàn sinh viên và học sinh đã thay đổi hoàn toàn cách tiếp cận toán học giải tích.
            </p>
          </div>

          <div className="pt-2 relative z-10">
            <TactileButton 
              variant="amber" 
              size="lg" 
              onClick={() => navigate('/register')}
              className="mx-auto text-base"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Tạo tài khoản miễn phí trong 30s
            </TactileButton>
          </div>

          <p className="text-xs text-indigo-300/80 font-medium relative z-10">
            Không yêu cầu thẻ thanh toán • Hủy bất kỳ lúc nào
          </p>

        </div>
      </section>

    </div>
  )
}


/**
 * Interactive Hero Demo Component: Secant to Tangent convergence live scrubber
 */
function HeroInteractiveDemo() {
  const [deltaX, setDeltaX] = useState(1.4)
  const canvasRef = useRef(null)

  // Draw parabola f(x) = 0.5 * x^2 + 1, point x0 = 1, and secant to x0 + deltaX
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    // Coordinate mapping
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
    for (let y = 0; y <= 5; y += 1) {
      ctx.beginPath()
      ctx.moveTo(0, toCanvasY(y))
      ctx.lineTo(width, toCanvasY(y))
      ctx.stroke()
    }

    // Function Curve f(x) = 0.5 * x^2 + 0.8
    const f = (x) => 0.45 * x * x + 0.8
    ctx.beginPath()
    ctx.strokeStyle = '#4F46E5' // Euler Indigo
    ctx.lineWidth = 3
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

    // Secant Line (or Tangent when deltaX ~ 0)
    const slope = (y1 - y0) / (x1 - x0)
    ctx.beginPath()
    ctx.strokeStyle = deltaX < 0.2 ? '#10B981' : '#0284C7' // Vector Emerald or Tangent Cyan
    ctx.lineWidth = 2.5
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
    ctx.arc(cx0, cy0, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()

    // Point B
    ctx.fillStyle = deltaX < 0.2 ? '#10B981' : '#0284C7'
    ctx.beginPath()
    ctx.arc(cx1, cy1, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()

  }, [deltaX])

  const slopeValue = (0.45 * (1 + deltaX) ** 2 + 0.8 - (0.45 * 1 + 0.8)) / deltaX
  const exactTangent = 0.90 // 2 * 0.45 * 1

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 space-y-4 relative">
      
      {/* Floating Badges */}
      <div className="absolute -top-3.5 -left-2 bg-amber-500 text-white font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1">
        <Flame className="w-3.5 h-3.5 fill-white" />
        <span>+50 XP Tương tác</span>
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Phòng Thí Nghiệm Tiếp Tuyến
          </span>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 tabular-nums">
          Δx = {deltaX.toFixed(2)}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={380} 
          height={220} 
          className="w-full h-auto block"
        />
        {deltaX < 0.2 && (
          <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
            Tiếp tuyến chính xác!
          </div>
        )}
      </div>

      {/* Math Readout */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between text-xs font-bold">
        <div className="space-y-0.5">
          <span className="text-slate-500 text-[10px] uppercase">Độ dốc cát tuyến m</span>
          <p className="text-sm font-extrabold text-indigo-700 tabular-nums">
            {slopeValue.toFixed(3)}
          </p>
        </div>
        <div className="text-right space-y-0.5">
          <span className="text-slate-500 text-[10px] uppercase">Đạo hàm f'(1)</span>
          <p className="text-sm font-extrabold text-emerald-600 tabular-nums">
            = {exactTangent.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Slider Scrubber */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-xs font-bold text-slate-600">
          <span>Kéo trượt để thu hẹp Δx → 0:</span>
        </div>
        <input 
          type="range"
          min="0.05"
          max="2.0"
          step="0.02"
          value={deltaX}
          onChange={(e) => setDeltaX(parseFloat(e.target.value))}
          className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

    </div>
  )
}
