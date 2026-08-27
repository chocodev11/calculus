export const BRAND = Object.freeze({
  name: 'TiaMath',
  legacyName: 'Calculus',
  tagline: 'Học Toán hiểu bản chất',
  description: 'Nền tảng học Toán theo chương trình GDPT 2018 cho học sinh lớp 10–12.',
  logo: '/brand/image.svg',
  icon: '/brand/image.svg',
})

export function pageTitle(section) {
  return section ? `${BRAND.name} — ${section}` : BRAND.name
}
