// ============================================================
// Export Excel du mois — thème « coucher de soleil » (comme l'app RH).
// Un seul fichier .xlsx avec 3 onglets : Ventes, Tiers payants, Résumé.
// ============================================================
import * as XLSX from 'xlsx-js-style'
import { paidOf, dueOf, hasLunettes } from './store.jsx'
import { fmtDay } from './format.js'

// palette (RH coucher de soleil)
const VIOLET = '8642A5'
const ROSE = 'CC549B'
const TEAL = '016C98'
const LAV = 'EFE9F7'
const INK = '174340'
const WHITE = 'FFFFFF'
const GREY = 'D9D9D9'

const border = {
  top: { style: 'thin', color: { rgb: GREY } },
  bottom: { style: 'thin', color: { rgb: GREY } },
  left: { style: 'thin', color: { rgb: GREY } },
  right: { style: 'thin', color: { rgb: GREY } },
}
const MONEY = '#,##0.00" €"'

function titleCell(v, color = VIOLET) {
  return { v, t: 's', s: { font: { bold: true, sz: 15, color: { rgb: color } } } }
}
function headCell(v, fill = VIOLET) {
  return {
    v, t: 's',
    s: {
      fill: { fgColor: { rgb: fill } },
      font: { bold: true, color: { rgb: WHITE }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border,
    },
  }
}
function cell(v, { money = false, bold = false, fill = null, align = 'left' } = {}) {
  const t = typeof v === 'number' ? 'n' : 's'
  const s = { border, alignment: { vertical: 'center', horizontal: money ? 'right' : align } }
  if (money) s.numFmt = MONEY
  if (bold) s.font = { bold: true, color: { rgb: INK } }
  if (fill) s.fill = { fgColor: { rgb: fill } }
  return { v: v == null ? '' : v, t, s }
}

function typeVente(s) {
  return hasLunettes(s) ? 'Lunettes' : 'Lentilles'
}
function statutTP(s) {
  if (s.mutuelle_paid) return 'Payée'
  if (s.facture) return 'Facturé — en attente'
  return 'À facturer'
}
function heure(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

// libellé mois 'YYYY-MM' -> 'juillet 2026'
function moisLabel(mois) {
  const d = new Date(mois + '-01T12:00:00')
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export function exportMoisExcel({ mois, sales, settings, produit, prefixe }) {
  const duMois = sales.filter((s) => (s.day || '').startsWith(mois)).slice()
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const label = moisLabel(mois)

  const wb = XLSX.utils.book_new()

  // ---------- Onglet 1 : Ventes ----------
  {
    const head = ['Date', 'Heure', 'Client', 'Type', 'Prix', 'Part mutuelle', 'Reste à charge', 'Déjà payé', 'Reste dû', 'Paiement', 'Mutuelle', 'Plateforme', 'Vendeur', 'Facturé', 'Mutuelle payée']
    const rows = [
      [titleCell(`${produit} — Ventes de ${label}`)],
      [],
      head.map((h) => headCell(h)),
    ]
    let tPrix = 0, tMut = 0, tReste = 0, tPaye = 0, tDu = 0
    for (const s of duMois) {
      const paye = paidOf(s), du = dueOf(s)
      tPrix += s.price; tMut += s.mutuelle; tReste += s.reste; tPaye += paye; tDu += du
      const methods = [...new Set((s.payments || []).map((p) => p.method))].join(' + ')
      rows.push([
        cell(fmtDay(s.day, { short: true, year: true })),
        cell(heure(s.created_at)),
        cell(s.client),
        cell(typeVente(s)),
        cell(s.price, { money: true }),
        cell(s.mutuelle, { money: true }),
        cell(s.reste, { money: true }),
        cell(paye, { money: true }),
        cell(du, { money: true }),
        cell(methods || '—'),
        cell(s.mutuelle_nom || '—'),
        cell(s.plateforme || '—'),
        cell(s.vendor || '—'),
        cell(s.mutuelle > 0 ? (s.facture ? 'Oui' : 'Non') : '—'),
        cell(s.mutuelle > 0 ? (s.mutuelle_paid ? 'Oui' : 'Non') : '—'),
      ])
    }
    rows.push([
      cell('TOTAUX', { bold: true, fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV }),
      cell(round(tPrix), { money: true, bold: true, fill: LAV }),
      cell(round(tMut), { money: true, bold: true, fill: LAV }),
      cell(round(tReste), { money: true, bold: true, fill: LAV }),
      cell(round(tPaye), { money: true, bold: true, fill: LAV }),
      cell(round(tDu), { money: true, bold: true, fill: LAV }),
      cell('', { fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV }),
    ])
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [12, 7, 20, 10, 11, 12, 12, 11, 10, 14, 18, 13, 12, 9, 12].map((wch) => ({ wch }))
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }]
    XLSX.utils.book_append_sheet(wb, ws, 'Ventes')
  }

  // ---------- Onglet 2 : Tiers payants ----------
  {
    const tp = duMois.filter((s) => (Number(s.mutuelle) || 0) > 0)
      .sort((a, b) => (a.plateforme || '').localeCompare(b.plateforme || ''))
    const head = ['Date', 'Client', 'Mutuelle', 'Plateforme', 'Part mutuelle', 'Statut', 'Facturé le', 'Payé le']
    const rows = [
      [titleCell(`Tiers payants — ${label}`, ROSE)],
      [],
      head.map((h) => headCell(h, ROSE)),
    ]
    let total = 0, aFacturer = 0, attente = 0, paye = 0
    for (const s of tp) {
      const m = Number(s.mutuelle) || 0
      total += m
      if (!s.facture) aFacturer += m
      else if (!s.mutuelle_paid) attente += m
      else paye += m
      rows.push([
        cell(fmtDay(s.day, { short: true, year: true })),
        cell(s.client),
        cell(s.mutuelle_nom || '—'),
        cell(s.plateforme || '—'),
        cell(m, { money: true }),
        cell(statutTP(s)),
        cell(s.facture_at ? fmtDay(s.facture_at.slice(0, 10), { short: true }) : '—'),
        cell(s.mutuelle_paid_at ? fmtDay(s.mutuelle_paid_at.slice(0, 10), { short: true }) : '—'),
      ])
    }
    rows.push([])
    rows.push([cell('Total part mutuelle', { bold: true, fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV }), cell(round(total), { money: true, bold: true, fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV }), cell('', { fill: LAV })])
    rows.push([cell('dont à facturer', { bold: true }), cell(''), cell(''), cell(''), cell(round(aFacturer), { money: true, bold: true }), cell(''), cell(''), cell('')])
    rows.push([cell('dont en attente de paiement', { bold: true }), cell(''), cell(''), cell(''), cell(round(attente), { money: true, bold: true }), cell(''), cell(''), cell('')])
    rows.push([cell('dont déjà payé', { bold: true }), cell(''), cell(''), cell(''), cell(round(paye), { money: true, bold: true }), cell(''), cell(''), cell('')])
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [12, 20, 20, 14, 13, 20, 12, 12].map((wch) => ({ wch }))
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }]
    XLSX.utils.book_append_sheet(wb, ws, 'Tiers payants')
  }

  // ---------- Onglet 3 : Résumé ----------
  {
    const lun = duMois.filter(hasLunettes)
    const len = duMois.filter((s) => !hasLunettes(s))
    const sum = (arr, f) => round(arr.reduce((a, s) => a + (Number(f(s)) || 0), 0))
    // encaissements du mois (paiements datés dans le mois)
    const parMoyen = {}
    let encaisse = 0
    for (const s of sales) {
      for (const p of s.payments || []) {
        if ((p.at || '').slice(0, 7) === mois) {
          const amt = Number(p.amount) || 0
          encaisse += amt
          parMoyen[p.method || 'Autre'] = (parMoyen[p.method || 'Autre'] || 0) + amt
        }
      }
    }
    const parVendeur = {}
    for (const s of duMois) parVendeur[s.vendor || 'Sans vendeur'] = (parVendeur[s.vendor || 'Sans vendeur'] || 0) + s.price
    const parPlateforme = {}
    for (const s of duMois) if (s.mutuelle > 0) parPlateforme[s.plateforme || 'Sans plateforme'] = (parPlateforme[s.plateforme || 'Sans plateforme'] || 0) + s.mutuelle

    const rows = [
      [titleCell(`Résumé — ${label}`, TEAL)],
      [],
      [headCell('Indicateur', TEAL), headCell('Valeur', TEAL)],
      [cell("Chiffre d'affaires", { bold: true }), cell(sum(duMois, (s) => s.price), { money: true })],
      [cell('Nombre de ventes', { bold: true }), cell(duMois.length)],
      [cell('Lunettes', { bold: true }), cell(sum(lun, (s) => s.price), { money: true })],
      [cell('Lentilles', { bold: true }), cell(sum(len, (s) => s.price), { money: true })],
      [cell('Part mutuelle (tiers payant)', { bold: true }), cell(sum(duMois, (s) => s.mutuelle), { money: true })],
      [cell('Reste à charge clients', { bold: true }), cell(sum(duMois, (s) => s.reste), { money: true })],
      [cell('Encaissé sur le mois', { bold: true }), cell(round(encaisse), { money: true })],
      [],
      [headCell('Encaissé par moyen de paiement', TEAL), headCell('Montant', TEAL)],
      ...Object.entries(parMoyen).map(([k, v]) => [cell(k), cell(round(v), { money: true })]),
      [],
      [headCell('CA par vendeur', TEAL), headCell('Montant', TEAL)],
      ...Object.entries(parVendeur).map(([k, v]) => [cell(k), cell(round(v), { money: true })]),
      [],
      [headCell('Part mutuelle par plateforme', TEAL), headCell('Montant', TEAL)],
      ...Object.entries(parPlateforme).map(([k, v]) => [cell(k), cell(round(v), { money: true })]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 32 }, { wch: 16 }]
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
    XLSX.utils.book_append_sheet(wb, ws, 'Résumé')
  }

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${prefixe}-${mois}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return duMois.length
}

function round(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}
