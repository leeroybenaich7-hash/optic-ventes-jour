// Onglet « Historique » : navigation par jour ou par période,
// compteurs, graphique CA par jour, répartitions et tableau en lecture seule.
import React, { useMemo, useState } from 'react'
import { CalendarSearch, FileSpreadsheet } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { euro, today, fmtDay, matchClient } from '../lib/format.js'
import { PRODUCT_NAME, EXPORT_PREFIX } from '../lib/config.js'
import { exportMoisExcel } from '../lib/exportExcel.js'
import SalesTable from './SalesTable.jsx'
import SearchBar from './SearchBar.jsx'

// 'YYYY-MM-DD' décalé de n jours (fuseau local)
function shiftDay(day, n) {
  const d = new Date(day + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// 'YYYY-MM-DD' local à partir d'un ISO
function isoToDay(iso) {
  const d = new Date(iso)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// liste des jours entre deux 'YYYY-MM-DD' inclus
function daysBetween(start, end) {
  const out = []
  let d = start
  while (d <= end) {
    out.push(d)
    d = shiftDay(d, 1)
  }
  return out
}

function sum(list, fn) {
  return list.reduce((t, x) => t + (Number(fn(x)) || 0), 0)
}

// ---------- graphique en barres SVG maison ----------
function BarChart({ days, totals, selectedDay }) {
  const H = 220
  const padTop = 34
  const padBottom = 28
  const slot = days.length > 12 ? 46 : 96
  const W = Math.max(680, days.length * slot)
  const innerW = W / days.length
  const max = Math.max(1, ...days.map((d) => totals[d] || 0))
  const showEuros = days.length <= 12
  const labelStep = days.length > 12 ? Math.ceil(days.length / 8) : 1

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label="Chiffre d'affaires par jour"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="hist-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8642A5" />
          <stop offset="100%" stopColor="#CC549B" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1={H - padBottom}
        x2={W}
        y2={H - padBottom}
        stroke="var(--line-strong)"
        strokeWidth="1"
      />
      {days.map((d, i) => {
        const val = totals[d] || 0
        const barMaxH = H - padTop - padBottom
        const h = val > 0 ? Math.max(4, (val / max) * barMaxH) : 0
        const barW = Math.min(innerW * 0.58, 54)
        const x = i * innerW + (innerW - barW) / 2
        const y = H - padBottom - h
        const isSel = selectedDay && d === selectedDay
        const dim = selectedDay ? !isSel : false
        return (
          <g key={d}>
            {h > 0 && (
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="7"
                fill="url(#hist-grad)"
                opacity={dim ? 0.4 : 1}
              />
            )}
            {showEuros && val > 0 && (
              <text
                x={i * innerW + innerW / 2}
                y={y - 8}
                textAnchor="middle"
                fontSize="13"
                fontWeight={isSel ? '700' : '500'}
                fill="var(--txt)"
              >
                {euro(val)}
              </text>
            )}
            {i % labelStep === 0 && (
              <text
                x={i * innerW + innerW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="12"
                fontWeight={isSel ? '700' : '400'}
                fill={isSel ? 'var(--txt)' : 'var(--muted)'}
              >
                {fmtDay(d, { short: true })}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// petite barre de proportion (répartition par vendeur)
function Proportion({ part, total }) {
  const pct = total > 0 ? Math.round((part / total) * 100) : 0
  return (
    <div
      style={{
        background: 'var(--accent-soft)',
        borderRadius: 999,
        height: 8,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'var(--accent)',
          borderRadius: 999,
          height: '100%',
          width: pct + '%',
        }}
      />
    </div>
  )
}

const QUICK = [
  { id: 'jour', label: 'Aujourd’hui' },
  { id: 'hier', label: 'Hier' },
  { id: '7j', label: '7 derniers jours' },
  { id: '30j', label: '30 derniers jours' },
]

export default function Historique() {
  const { sales, settings, notify } = useStore()
  // sélection : { mode:'day', day } ou { mode:'range', nb }
  const [sel, setSel] = useState({ mode: 'day', day: today() })
  const [q, setQ] = useState('')
  const [mois, setMois] = useState(today().slice(0, 7))

  function exporter() {
    const n = exportMoisExcel({ mois, sales, settings, produit: PRODUCT_NAME, prefixe: EXPORT_PREFIX })
    notify(n > 0 ? `Excel du mois exporté (${n} vente${n > 1 ? 's' : ''})` : 'Aucune vente ce mois-ci')
  }

  const quickActive =
    sel.mode === 'day' && sel.day === today()
      ? 'jour'
      : sel.mode === 'day' && sel.day === shiftDay(today(), -1)
        ? 'hier'
        : sel.mode === 'range' && sel.nb === 7
          ? '7j'
          : sel.mode === 'range' && sel.nb === 30
            ? '30j'
            : null

  function pickQuick(id) {
    if (id === 'jour') setSel({ mode: 'day', day: today() })
    else if (id === 'hier') setSel({ mode: 'day', day: shiftDay(today(), -1) })
    else if (id === '7j') setSel({ mode: 'range', nb: 7 })
    else setSel({ mode: 'range', nb: 30 })
  }

  // bornes de la sélection
  const start = sel.mode === 'day' ? sel.day : shiftDay(today(), -(sel.nb - 1))
  const end = sel.mode === 'day' ? sel.day : today()

  const {
    filtered,
    caTotal,
    lunettes,
    lentilles,
    mutuelleTotal,
    encaisse,
    parVendeur,
    parMoyen,
    chartDays,
    chartTotals,
  } = useMemo(() => {
    const filtered = sales
      .filter((s) => s.day >= start && s.day <= end && matchClient(s, q))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

    const lun = filtered.filter((s) => (Number(s.lunettes_montant) || 0) > 0)
    const len = filtered.filter((s) => (Number(s.lentilles_montant) || 0) > 0)

    // encaissements dont la date tombe dans la période (filtrés par client)
    const paymentsInPeriod = []
    for (const s of sales) {
      if (!matchClient(s, q)) continue
      for (const p of s.payments || []) {
        const d = isoToDay(p.at)
        if (d >= start && d <= end) paymentsInPeriod.push(p)
      }
    }

    const parVendeur = {}
    for (const s of filtered) {
      const v = s.vendor || 'Sans vendeur'
      if (!parVendeur[v]) parVendeur[v] = { ca: 0, nb: 0 }
      parVendeur[v].ca += Number(s.price) || 0
      parVendeur[v].nb += 1
    }

    const parMoyen = {}
    for (const p of paymentsInPeriod) {
      const m = p.method || 'Autre'
      parMoyen[m] = (parMoyen[m] || 0) + (Number(p.amount) || 0)
    }

    // jours du graphique : la période, ou 7 jours autour du jour choisi
    const chartDays =
      sel.mode === 'day'
        ? daysBetween(shiftDay(sel.day, -3), shiftDay(sel.day, 3))
        : daysBetween(start, end)
    const chartDaySet = new Set(chartDays)
    const chartTotals = {}
    for (const s of sales) {
      if (chartDaySet.has(s.day) && matchClient(s, q)) {
        chartTotals[s.day] = (chartTotals[s.day] || 0) + (Number(s.price) || 0)
      }
    }

    return {
      filtered,
      caTotal: sum(filtered, (s) => s.price),
      lunettes: { nb: lun.length, ca: sum(filtered, (s) => s.lunettes_montant) },
      lentilles: { nb: len.length, ca: sum(filtered, (s) => s.lentilles_montant) },
      mutuelleTotal: sum(filtered, (s) => s.mutuelle),
      encaisse: sum(paymentsInPeriod, (p) => p.amount),
      parVendeur,
      parMoyen,
      chartDays,
      chartTotals,
    }
  }, [sales, start, end, sel, q])

  const titrePeriode =
    sel.mode === 'day'
      ? fmtDay(sel.day, { year: true })
      : `Du ${fmtDay(start, { short: true })} au ${fmtDay(end, { short: true })}`

  const vendeursTries = Object.entries(parVendeur).sort((a, b) => b[1].ca - a[1].ca)
  const moyensTries = Object.entries(parMoyen).sort((a, b) => b[1] - a[1])

  return (
    <div className="stack">
      {/* -------- export Excel du mois -------- */}
      <section className="card">
        <h2 className="card-title">
          <FileSpreadsheet className="lucide" size={19} style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--accent)' }} />
          Export Excel du mois
        </h2>
        <p className="card-sub">
          Un fichier Excel avec 3 onglets : les ventes détaillées, les tiers payants, et le résumé du mois.
        </p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="field" style={{ minWidth: 190 }}>
            <label htmlFor="hist-mois">Mois</label>
            <input id="hist-mois" type="month" className="input" max={today().slice(0, 7)}
              value={mois} onChange={(e) => e.target.value && setMois(e.target.value)} />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={exporter}>
              <FileSpreadsheet className="lucide" size={17} />
              Exporter le mois (Excel)
            </button>
          </div>
        </div>
      </section>

      {/* -------- navigation dans le temps -------- */}
      <section className="card">
        <h2 className="card-title">Choisir un jour ou une période</h2>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <div className="field" style={{ minWidth: 190 }}>
            <label htmlFor="hist-date">Un jour précis</label>
            <input
              id="hist-date"
              type="date"
              className="input"
              max={today()}
              value={sel.mode === 'day' ? sel.day : ''}
              onChange={(e) => {
                if (e.target.value) setSel({ mode: 'day', day: e.target.value })
              }}
            />
          </div>
          <div className="field">
            <label>Raccourcis</label>
            <div className="seg">
              {QUICK.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={'seg-btn' + (quickActive === item.id ? ' active' : '')}
                  onClick={() => pickQuick(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 10, textTransform: 'capitalize' }}>
          {titrePeriode}
        </p>
        <div style={{ marginTop: 12 }}>
          <SearchBar value={q} onChange={setQ} placeholder="Filtrer par client…" />
          {q && (
            <p className="hint" style={{ marginTop: -6 }}>
              Chiffres et ventes filtrés sur « {q} ».
            </p>
          )}
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="card">
          <div className="empty">
            <CalendarSearch className="lucide" />
            <p>Aucune vente sur cette période.</p>
          </div>
        </section>
      ) : (
        <>
          {/* -------- compteurs -------- */}
          <div className="kpis">
            <div className="kpi" style={{ '--kpi-color': '#8642A5' }}>
              <div className="kpi-label">Chiffre d’affaires</div>
              <div className="kpi-value">
                {euro(caTotal)}
              </div>
              <div className="kpi-note">{titrePeriode}</div>
            </div>
            <div className="kpi" style={{ '--kpi-color': '#016C98' }}>
              <div className="kpi-label">Ventes</div>
              <div className="kpi-value">{filtered.length}</div>
              <div className="kpi-note">
                vente{filtered.length > 1 ? 's' : ''} enregistrée{filtered.length > 1 ? 's' : ''}
              </div>
            </div>
            <div className="kpi" style={{ '--kpi-color': '#8642A5' }}>
              <div className="kpi-label">Lunettes</div>
              <div className="kpi-value">
                {lunettes.nb} <small>· {euro(lunettes.ca)}</small>
              </div>
              <div className="kpi-note">montures et verres</div>
            </div>
            <div className="kpi" style={{ '--kpi-color': '#016C98' }}>
              <div className="kpi-label">Lentilles</div>
              <div className="kpi-value">
                {lentilles.nb} <small>· {euro(lentilles.ca)}</small>
              </div>
              <div className="kpi-note">et produits lentilles</div>
            </div>
            <div className="kpi" style={{ '--kpi-color': '#CC549B' }}>
              <div className="kpi-label">Part mutuelle</div>
              <div className="kpi-value">
                {euro(mutuelleTotal)}
              </div>
              <div className="kpi-note">à facturer aux mutuelles</div>
            </div>
            <div className="kpi" style={{ '--kpi-color': '#F7786F' }}>
              <div className="kpi-label">Encaissé sur la période</div>
              <div className="kpi-value">
                {euro(encaisse)}
              </div>
              <div className="kpi-note">tous encaissements confondus</div>
            </div>
          </div>

          {/* -------- CA par jour -------- */}
          <section className="card">
            <h2 className="card-title">Chiffre d’affaires par jour</h2>
            <p className="card-sub">
              {sel.mode === 'day'
                ? 'Les 7 jours autour du jour choisi — le jour sélectionné est en couleur pleine.'
                : 'Un trait par jour de la période.'}
            </p>
            <div className="table-wrap">
              <BarChart
                days={chartDays}
                totals={chartTotals}
                selectedDay={sel.mode === 'day' ? sel.day : null}
              />
            </div>
          </section>

          {/* -------- répartitions -------- */}
          <div className="grid-2">
            <section className="card">
              <h2 className="card-title">Par vendeur</h2>
              <div className="stack">
                {vendeursTries.map(([nom, v]) => (
                  <div key={nom}>
                    <div className="row-between small">
                      <span style={{ fontWeight: 600 }}>{nom}</span>
                      <span className="muted">
                        {euro(v.ca)} · {v.nb} vente{v.nb > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Proportion part={v.ca} total={caTotal} />
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <h2 className="card-title">Par moyen de paiement</h2>
              <p className="card-sub">Encaissements de la période.</p>
              {moyensTries.length === 0 ? (
                <p className="muted small">Aucun encaissement sur cette période.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Moyen</th>
                        <th className="num">Total encaissé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moyensTries.map(([moyen, total]) => (
                        <tr key={moyen}>
                          <td>{moyen}</td>
                          <td className="num">{euro(total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* -------- détail des ventes -------- */}
          <section className="card">
            <h2 className="card-title">Détail des ventes</h2>
            <p className="card-sub">{titrePeriode} — lecture seule.</p>
            <SalesTable sales={filtered} readOnly />
          </section>
        </>
      )}
    </div>
  )
}
