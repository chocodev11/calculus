import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Sparkles, ArrowRight, CheckCircle2, Flame, Zap, Trophy, Heart, 
  Layers, Compass, Check, Star, ShieldCheck, Play, ArrowUpRight,
  TrendingUp, BookOpen, Clock, Activity, Cpu, Sliders
} from 'lucide-react'
import { TactileButton } from '../components/ui/tactile-button'
import { GamifyBadge } from '../components/ui/gamify-badge'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs sm:text-sm font-bold shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Nền tảng học Giải Tích trực quan thế hệ mới</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Học Toán Giải Tích <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-700">
                Trực Quan Như Chơi Game
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Biến công thức trừu tượng thành mô hình tương tác sống động. Thấu hiểu bản chất của 
              <strong className="text-slate-800"> Đạo hàm, Giới hạn & Tích phân</strong> qua phương pháp học vi mô (micro-learning) cùng cơ chế gamification đầy cuốn hút.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <TactileButton 
                variant="primary" 
                size="lg" 
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto text-base shadow-md"
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
      <section className="w-full bg-white border-y border-slate-200 py-10 shadow-sm">
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
            Phương pháp đột phá
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Cách Học Giải Tích Hiệu Quả Gấp 3 Lần
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Kết hợp sự chặt chẽ của giáo trình học thuật chuẩn quốc tế với công nghệ mô phỏng tương tác trực giác.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-[0_4px_0_0_#E2E8F0] hover:border-indigo-400 hover:shadow-[0_8px_0_0_#CBD5E1] transition-all flex flex-col space-y-5">
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
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-[0_4px_0_0_#E2E8F0] hover:border-sky-400 hover:shadow-[0_8px_0_0_#CBD5E1] transition-all flex flex-col space-y-5">
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
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-[0_4px_0_0_#E2E8F0] hover:border-amber-400 hover:shadow-[0_8px_0_0_#CBD5E1] transition-all flex flex-col space-y-5">
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


      {/* ─── 4. INTERACTIVE MATH LAB (Showcasing Engines A, B, C, E) ─── */}
      <section className="w-full bg-white border-y border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="text-xs font-extrabold uppercase tracking-widest text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                Phòng Thí Nghiệm Tương Tác
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                4 Động Cơ Khám Phá Hình Học Toán Học
              </h2>
              <p className="text-slate-600 text-base">
                Mỗi khái niệm trong giải tích đều có một động cơ tương tác chuyên biệt để minh họa động lực toán học.
              </p>
            </div>
            <TactileButton variant="secondary" onClick={() => navigate('/explore')}>
              Xem tất cả bài học <ArrowRight className="w-4 h-4 ml-1.5" />
            </TactileButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Engine A */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 flex flex-col space-y-4 hover:border-indigo-300 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                A
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Hội Tụ Cát Tuyến</h4>
                <p className="text-xs font-medium text-slate-500 mt-1">Định nghĩa đạo hàm & Ý nghĩa hình học</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tăng mật độ mẫu để chứng kiến cát tuyến xoay dần và tiệm cận chính xác vào đường tiếp tuyến.
              </p>
              <div className="mt-auto pt-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700">
                  <InlineMath math="\lim_{\Delta x \to 0} \frac{\Delta y}{\Delta x}" />
                </span>
              </div>
            </div>

            {/* Engine B */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 flex flex-col space-y-4 hover:border-sky-300 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-sky-500 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                B
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Biến Đổi Tham Số</h4>
                <p className="text-xs font-medium text-slate-500 mt-1">Khảo sát hàm số & Tìm cực trị</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kéo thanh trượt tham số để theo dõi biến dạng liên tục của đồ thị hàm bậc cao và các điểm uốn.
              </p>
              <div className="mt-auto pt-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-100 text-sky-700">
                  <InlineMath math="f(x) = x^n - px^2" />
                </span>
              </div>
            </div>

            {/* Engine C */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 flex flex-col space-y-4 hover:border-amber-300 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                C
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Động Lực Thời Gian</h4>
                <p className="text-xs font-medium text-slate-500 mt-1">Quy tắc đạo hàm hàm hợp</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mô phỏng sự lan truyền tốc độ biến thiên qua các mắt xích hàm lồng ghép (Chain Rule).
              </p>
              <div className="mt-auto pt-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700">
                  <InlineMath math="\frac{df}{dt} = \frac{df}{du} \cdot \frac{du}{dt}" />
                </span>
              </div>
            </div>

            {/* Engine E */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 flex flex-col space-y-4 hover:border-emerald-300 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                E
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Phân Rã Diện Tích</h4>
                <p className="text-xs font-medium text-slate-500 mt-1">Quy tắc tích thương & Tối ưu hóa</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chia cắt diện tích hình học bảo toàn để hiểu rõ đóng góp của từng đại lượng trong công thức đạo hàm tích.
              </p>
              <div className="mt-auto pt-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                  <InlineMath math="d(u \cdot v) = u\,dv + v\,du" />
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ─── 5. STANDARDIZED CURRICULUM PREVIEW ───────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            Lộ trình học tập chuẩn mực
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Từ Cơ Bản Đến Bậc Thầy Giải Tích
          </h2>
          <p className="text-slate-600 text-base">
            Mỗi học phần được cấu trúc theo lộ trình bài bản, từng bước mở khóa kiến thức.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Course 1 */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-[0_4px_0_0_#E2E8F0] space-y-4">
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
          <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 shadow-[0_4px_0_0_#C7D2FE] space-y-4 relative">
            <div className="absolute -top-3 right-6 bg-indigo-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
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
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-[0_4px_0_0_#E2E8F0] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Nâng cao</span>
              <span className="text-xs font-bold text-slate-400">3 Chương • 8 Bài</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Tích Phân & Diện Tích</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tổng Riemann, nguyên hàm, tích phân từng phần và ứng dụng tính thể tích vật thể tròn xoay.
            </p>
            <div className="pt-2">
              <TactileButton variant="secondary" size="sm" onClick={() => navigate('/course/tich-phan')} className="w-full">
                Khám phá khoá học
              </TactileButton>
            </div>
          </div>

        </div>
      </section>


      {/* ─── 6. COMPARISON MATRIX (Why Calculus.app?) ────────────────── */}
      <section className="w-full bg-white border-y border-slate-200 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Tại Sao Chọn Calculus.app?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              So sánh trải nghiệm học tập của bạn giữa các phương pháp.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left text-sm border-collapse bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-4 px-6 font-bold text-slate-900">Tiêu chí học tập</th>
                  <th className="py-4 px-6 font-extrabold text-indigo-600 bg-indigo-50/70 border-x border-indigo-100">
                    Calculus.app 🚀
                  </th>
                  <th className="py-4 px-6 font-medium text-slate-500">Video bài giảng thụ động</th>
                  <th className="py-4 px-6 font-medium text-slate-500">Sách bài tập truyền thống</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-4 px-6 text-slate-800">Tương tác trực tiếp trên đồ thị</td>
                  <td className="py-4 px-6 text-emerald-600 font-bold bg-indigo-50/30 border-x border-indigo-100">
                    ✓ Kéo trượt thời gian thực
                  </td>
                  <td className="py-4 px-6 text-slate-400">✗ Chỉ xem người khác giảng</td>
                  <td className="py-4 px-6 text-slate-400">✗ Hình vẽ tĩnh trên giấy</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-slate-800">Phản hồi & giải thích tức thì</td>
                  <td className="py-4 px-6 text-emerald-600 font-bold bg-indigo-50/30 border-x border-indigo-100">
                    ✓ LaTeX giải thích từng bước
                  </td>
                  <td className="py-4 px-6 text-slate-400">✗ Không có phản hồi</td>
                  <td className="py-4 px-6 text-slate-400">✗ Phải tự tra đáp án cuối sách</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-slate-800">Động lực duy trì thói quen</td>
                  <td className="py-4 px-6 text-emerald-600 font-bold bg-indigo-50/30 border-x border-indigo-100">
                    ✓ Streak, XP, Tim & Bảng xếp hạng
                  </td>
                  <td className="py-4 px-6 text-slate-400">✗ Dễ chán nản, bỏ cuộc</td>
                  <td className="py-4 px-6 text-slate-400">✗ Không có động lực kèm theo</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-slate-800">Chia nhỏ bài học (Micro-learning)</td>
                  <td className="py-4 px-6 text-emerald-600 font-bold bg-indigo-50/30 border-x border-indigo-100">
                    ✓ 3 - 5 phút mỗi bài
                  </td>
                  <td className="py-4 px-6 text-slate-400">✗ Video dài 45-60 phút mệt mỏi</td>
                  <td className="py-4 px-6 text-slate-400">✗ Dày hàng trăm trang</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>


      {/* ─── 7. FINAL HIGH-CONVERTING CALL TO ACTION ──────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-10 sm:p-16 text-center space-y-8 shadow-2xl relative overflow-hidden">
          
          {/* Decorative Background Circles */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
              Sẵn sàng làm chủ Toán Giải Tích?
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Bắt Đầu Hành Trình Học Tập Của Bạn Ngay Hôm Nay
            </h2>
            <p className="text-indigo-200 text-base sm:text-lg">
              Gia nhập hơn 10,000 học viên đang chinh phục Đạo hàm & Tích phân một cách tự tin.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <TactileButton 
              variant="primary" 
              size="lg" 
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-400 border-indigo-700 text-white font-extrabold px-10 shadow-lg"
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
    <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-[0_8px_0_0_#E2E8F0] space-y-4 relative">
      
      {/* Floating Badges */}
      <div className="absolute -top-4 -left-3 bg-amber-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-1">
        <Flame className="w-3.5 h-3.5 fill-white" />
        <span>+50 XP Tương tác</span>
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
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
          <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
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
