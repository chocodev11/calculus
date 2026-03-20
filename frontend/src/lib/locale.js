import viVn from '../../../data/vi-vn.json'

const locales = { 'vi-vn': viVn }
const LOCALE = 'vi-vn'

export const t = locales[LOCALE]
export function fmt(str, vars = {}) {
  return str.replaceAll(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`))
}
