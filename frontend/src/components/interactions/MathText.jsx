import React from 'react'
import 'katex/dist/katex.min.css'
import * as ReactKatexModule from 'react-katex'

const ReactKatex = ReactKatexModule.default || ReactKatexModule
const { InlineMath, BlockMath } = ReactKatex

const TOKEN_REGEX = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\*\*[\s\S]+?\*\*|__[\s\S]+?__|(?<!\*)\*[^\n*]+?\*(?!\*)|(?<!\w)_[^_\n]+?_(?!\w)|`[^`\n]+?`)/g

function renderSegments(text, depth = 0) {
  if (text == null) return null
  const str = String(text)
  if (!str) return null

  // Fast path: if no special characters, return plain string directly
  if (!/[$*_`]/.test(str)) {
    return str
  }

  const parts = str.split(TOKEN_REGEX)

  return parts.map((part, idx) => {
    if (!part) return null

    // Display math: $$...$$
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 3) {
      const latex = part.slice(2, -2)
      try {
        return (
          <span key={`dm-${depth}-${idx}`} className="inline-block my-1 align-middle">
            <BlockMath math={latex} />
          </span>
        )
      } catch {
        return <code key={`dm-err-${depth}-${idx}`} className="text-rose-500 text-xs font-mono">{latex}</code>
      }
    }

    // Inline math: $...$
    if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
      const latex = part.slice(1, -1)
      try {
        return <InlineMath key={`im-${depth}-${idx}`} math={latex} />
      } catch {
        return <code key={`im-err-${depth}-${idx}`} className="text-rose-500 text-xs font-mono">{latex}</code>
      }
    }

    // Bold: **...** or __...__
    if ((part.startsWith('**') && part.endsWith('**') && part.length > 3) ||
        (part.startsWith('__') && part.endsWith('__') && part.length > 3)) {
      const inner = part.slice(2, -2)
      return (
        <strong key={`b-${depth}-${idx}`} className="font-extrabold text-slate-900">
          {renderSegments(inner, depth + 1)}
        </strong>
      )
    }

    // Italic: *...* or _..._
    if ((part.startsWith('*') && part.endsWith('*') && part.length > 1) ||
        (part.startsWith('_') && part.endsWith('_') && part.length > 1)) {
      const inner = part.slice(1, -1)
      return (
        <em key={`i-${depth}-${idx}`} className="italic font-medium">
          {renderSegments(inner, depth + 1)}
        </em>
      )
    }

    // Inline code: `...`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      const code = part.slice(1, -1)
      return (
        <code key={`c-${depth}-${idx}`} className="px-1.5 py-0.5 rounded-md bg-slate-100 font-mono text-xs text-indigo-700 font-bold border border-slate-200">
          {code}
        </code>
      )
    }

    // Plain text
    return <React.Fragment key={`t-${depth}-${idx}`}>{part}</React.Fragment>
  })
}

/**
 * Renders text with inline/display $LaTeX$ segments via KaTeX
 * and markdown formatting (**bold**, *italic*, `code`).
 */
export function MathText({ text, className }) {
  if (text == null) return null
  const rendered = renderSegments(text)
  if (className) {
    return <span className={className}>{rendered}</span>
  }
  return <>{rendered}</>
}

export default MathText
