import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle, Eye, FileJson, Save, ShieldCheck, Upload, RotateCcw } from 'lucide-react'
import api, { formatErrorDetail } from '../lib/api'

function flattenSteps(course) {
  return course?.chapters?.flatMap(chapter => chapter.steps || []) || []
}

function pretty(value) {
  return JSON.stringify(value || {}, null, 2)
}

export default function AdminCourseEditor() {
  const { slug } = useParams()
  const [course, setCourse] = useState(null)
  const [selectedStepId, setSelectedStepId] = useState('')
  const [versions, setVersions] = useState(null)
  const [draftText, setDraftText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const steps = useMemo(() => flattenSteps(course), [course])
  const selectedStep = steps.find(step => String(step.id) === String(selectedStepId))
  const draft = versions?.draft
  const published = versions?.published

  useEffect(() => {
    let cancelled = false
    async function loadCourse() {
      setLoading(true)
      try {
        const data = await api.get(`/courses/${slug}`, { redirectOnUnauthorized: false })
        if (cancelled) return
        setCourse(data)
        const firstStep = flattenSteps(data)[0]
        if (firstStep) setSelectedStepId(String(firstStep.id))
      } catch (error) {
        if (!cancelled) setMessage({ type: 'error', text: formatErrorDetail(error?.message || error) })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadCourse()
    return () => { cancelled = true }
  }, [slug])

  useEffect(() => {
    let cancelled = false
    async function loadVersions() {
      if (!selectedStepId) return
      setMessage(null)
      try {
        const data = await api.get(`/admin/lessons/${selectedStepId}`, { redirectOnUnauthorized: false })
        if (cancelled) return
        setVersions(data)
        setDraftText(pretty(data.draft?.content || data.published?.content))
      } catch (error) {
        if (!cancelled) setMessage({ type: 'error', text: formatErrorDetail(error?.message || error) })
      }
    }
    loadVersions()
    return () => { cancelled = true }
  }, [selectedStepId])

  const parseDraft = () => {
    try {
      return JSON.parse(draftText)
    } catch (error) {
      throw new Error(`JSON không hợp lệ: ${error.message}`)
    }
  }

  const saveDraft = async () => {
    const content = parseDraft()
    setSaving(true)
    setMessage(null)
    try {
      const response = await api.patch(`/admin/lessons/${selectedStepId}/draft`, {
        content,
        expected_checksum: draft?.checksum || null,
      }, { redirectOnUnauthorized: false })
      setVersions(previous => ({ ...previous, draft: response.draft }))
      setDraftText(pretty(response.draft.content))
      setMessage({ type: 'success', text: 'Đã lưu draft. Chưa ảnh hưởng learner.' })
      return response.draft
    } catch (error) {
      setMessage({ type: 'error', text: formatErrorDetail(error?.message || error) })
      throw error
    } finally {
      setSaving(false)
    }
  }

  const validateDraft = async () => {
    try {
      const response = await api.post(`/admin/lessons/${selectedStepId}/validate`, { content: parseDraft() }, { redirectOnUnauthorized: false })
      setMessage({ type: 'success', text: `Contract hợp lệ: ${response.slides} slide, checksum ${response.checksum.slice(0, 12)}…` })
    } catch (error) {
      setMessage({ type: 'error', text: formatErrorDetail(error?.message || error) })
    }
  }

  const publishDraft = async () => {
    try {
      const saved = await saveDraft()
      const response = await api.post(`/admin/lessons/${selectedStepId}/publish`, {
        expected_checksum: saved.checksum,
      }, { redirectOnUnauthorized: false })
      setVersions(previous => ({ ...previous, published: response.version, draft: null }))
      setMessage({ type: 'success', text: `Đã publish version ${response.version.version}.` })
    } catch {
      // saveDraft already exposes the actionable error.
    }
  }

  const rollback = async (versionId) => {
    try {
      const response = await api.post(`/admin/lessons/${selectedStepId}/rollback`, { version_id: versionId }, { redirectOnUnauthorized: false })
      setVersions(previous => ({ ...previous, published: response.version }))
      setDraftText(pretty(response.version.content))
      setMessage({ type: 'success', text: `Đã rollback về version ${response.version.version}.` })
    } catch (error) {
      setMessage({ type: 'error', text: formatErrorDetail(error?.message || error) })
    }
  }

  if (loading) return <div className="py-10 text-center font-bold text-slate-500">Đang tải lesson…</div>
  if (!course) return <div className="py-10 text-center font-bold text-rose-600">Không tìm thấy khóa học.</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">JSON Lesson Authoring</p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{course.title}</h2>
          <p className="text-sm text-slate-500">LLM output → validate → draft → review → publish</p>
        </div>
        {selectedStep && (
          <Link to={`/studio/${slug}/${selectedStep.id}`} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">
            <Eye className="h-4 w-4" /> Mở Studio
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Steps</h3>
          <div className="space-y-1.5">
            {steps.map(step => (
              <button
                key={step.id}
                type="button"
                onClick={() => setSelectedStepId(String(step.id))}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${String(step.id) === String(selectedStepId) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {step.title || step.id}
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900">{selectedStep?.title || 'Lesson JSON'}</h3>
              <p className="mt-1 text-xs text-slate-500">Draft được lưu riêng; learner chỉ thấy bản published.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={validateDraft} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700">
                <ShieldCheck className="h-4 w-4" /> Validate
              </button>
              <button type="button" onClick={saveDraft} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? 'Đang lưu…' : 'Lưu draft'}
              </button>
              <button type="button" onClick={publishDraft} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50">
                <Upload className="h-4 w-4" /> Publish
              </button>
            </div>
          </div>

          {message && (
            <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
              {message.type === 'success' && <CheckCircle className="mr-1 inline h-4 w-4" />}{message.text}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span><FileJson className="mr-1 inline h-4 w-4" /> Canonical JSON/DSL</span>
            <span>{draft ? `draft ${draft.checksum.slice(0, 10)}…` : 'chưa có draft'}</span>
          </div>

          <textarea
            value={draftText}
            onChange={event => setDraftText(event.target.value)}
            spellCheck={false}
            className="min-h-[620px] w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-200 outline-none focus:ring-4 focus:ring-indigo-100"
            aria-label="Lesson JSON draft"
          />

          {versions?.versions?.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">Version history</h4>
              <div className="space-y-2">
                {versions.versions.map(version => (
                  <div key={version.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                    <span className="font-bold text-slate-700">v{version.version} · {version.status}</span>
                    {version.status === 'archived' && (
                      <button type="button" onClick={() => rollback(version.id)} className="inline-flex items-center gap-1 font-extrabold text-indigo-700">
                        <RotateCcw className="h-3.5 w-3.5" /> Rollback
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
