import React from 'react'
import { Slide } from './Slide'
import { Quiz, Option } from './Quiz'
import { Callout } from './Callout'
import { Sandbox } from './Sandbox'
import 'katex/dist/katex.min.css'
import * as ReactKatexModule from 'react-katex'

const ReactKatex = ReactKatexModule.default || ReactKatexModule
const { InlineMath, BlockMath } = ReactKatex

export function Math({ math, latex, inline = false, children }) {
  const content = math || latex || children || ''
  if (inline) {
    return <InlineMath math={String(content)} />
  }
  return <BlockMath math={String(content)} />
}

export const mdxComponents = {
  Slide,
  Quiz,
  Option,
  Callout,
  Sandbox,
  Math,
  Formula: Math,
  // HTML Element styled overrides
  h1: (props) => <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 mb-4 mt-6" {...props} />,
  h2: (props) => <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mb-3 mt-5" {...props} />,
  h3: (props) => <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-slate-200 mb-2 mt-4" {...props} />,
  p: (props) => <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed mb-4" {...props} />,
  ul: (props) => <ul className="list-disc list-inside space-y-1.5 mb-4 text-slate-700 dark:text-slate-300" {...props} />,
  ol: (props) => <ol className="list-decimal list-inside space-y-1.5 mb-4 text-slate-700 dark:text-slate-300" {...props} />,
  li: (props) => <li className="text-slate-700 dark:text-slate-300" {...props} />,
  strong: (props) => <strong className="font-extrabold text-slate-900 dark:text-slate-100" {...props} />,
  em: (props) => <em className="italic text-slate-800 dark:text-slate-200" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 my-4 italic text-slate-600 dark:text-slate-400 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-r-xl" {...props} />
  ),
  code: (props) => (
    <code className="px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-sm font-semibold" {...props} />
  ),
}

export { Slide, Quiz, Option, Callout, Sandbox }
export default mdxComponents
