import { Database, FileJson, ShieldCheck, Upload } from 'lucide-react'

export default function AdminDataManager() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Content Operations</h2>
        <p className="mt-1 text-sm text-slate-500">Lesson content không còn được chỉnh bằng full database sync.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <FileJson className="mb-3 h-6 w-6 text-indigo-600" />
          <h3 className="font-extrabold text-indigo-900">LLM JSON draft</h3>
          <p className="mt-1 text-xs leading-relaxed text-indigo-800">Dán hoặc gửi lesson JSON vào editor, validate rồi lưu thành draft.</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <ShieldCheck className="mb-3 h-6 w-6 text-emerald-600" />
          <h3 className="font-extrabold text-emerald-900">Preview / publish</h3>
          <p className="mt-1 text-xs leading-relaxed text-emerald-800">Studio đọc draft riêng; learner chỉ đọc version đã publish.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <Upload className="mb-3 h-6 w-6 text-amber-600" />
          <h3 className="font-extrabold text-amber-900">One-time import</h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">Import dữ liệu cũ là thao tác migration riêng, không nằm trong flow soạn bài.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-slate-500" />
          <h3 className="font-extrabold text-slate-900">Database contract</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Alembic migration chỉ thay đổi schema. Lesson publish tạo version bất biến và cập nhật published pointer atomically. Không có nút “Sync Data to Database” trong authoring flow.
        </p>
      </div>
    </div>
  )
}
