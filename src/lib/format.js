// Helpers de formatage partagés par tous les écrans.

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function euro(n) {
  return EURO.format(Number(n) || 0)
}

// 'YYYY-MM-DD' du jour (fuseau local)
export function today() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// 'lundi 13 juillet' à partir de 'YYYY-MM-DD'
export function fmtDay(day, opts = {}) {
  const d = new Date(day + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', {
    weekday: opts.short ? undefined : 'long',
    day: 'numeric',
    month: opts.short ? 'short' : 'long',
    ...(opts.year ? { year: 'numeric' } : {}),
  })
}

// '14 h 32' à partir d'un ISO
export function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// nombre de jours entre un 'YYYY-MM-DD' et aujourd'hui
export function daysAgo(day) {
  const a = new Date(day + 'T12:00:00')
  const b = new Date(today() + 'T12:00:00')
  return Math.round((b - a) / 86400000)
}

// saisie € tolérante : accepte "120", "120,50", "120.50"
export function parseEuro(str) {
  if (typeof str === 'number') return str
  const n = parseFloat(String(str || '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  )
}
