// Écran « Ventes du jour » : compteurs, caisse du jour,
// formulaire de saisie et liste des ventes de la journée.
import React from 'react'
import { Wallet } from 'lucide-react'
import { useStore, dueOf, salesOfDay, hasLunettes, hasLentilles } from '../lib/store.jsx'
import { euro, today } from '../lib/format.js'
import SaleForm from './SaleForm.jsx'
import SalesTable from './SalesTable.jsx'

const PALETTE = ['#016C98', '#8642A5', '#CC549B', '#F7786F', '#174340']

// 'YYYY-MM-DD' local d'un ISO (pour comparer à today())
function dayOfIso(iso) {
  const d = new Date(iso)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// Affiche un montant avec le symbole € en petit
function EuroValue({ value }) {
  const txt = euro(value).replace(/[\s  ]*€/, '')
  return (
    <>
      {txt}
      <small> €</small>
    </>
  )
}

export default function Dashboard() {
  const { sales, settings } = useStore()
  const day = today()

  const ventes = salesOfDay(sales, day)
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  // ----- compteurs du jour -----
  const caTotal = ventes.reduce((s, v) => s + (Number(v.price) || 0), 0)
  const lunettes = ventes.filter(hasLunettes)
  const lentilles = ventes.filter(hasLentilles)
  const caLunettes = ventes.reduce((s, v) => s + (Number(v.lunettes_montant) || 0), 0)
  const caLentilles = ventes.reduce((s, v) => s + (Number(v.lentilles_montant) || 0), 0)
  const partMutuelle = ventes.reduce((s, v) => s + (Number(v.mutuelle) || 0), 0)
  const resteCharge = ventes.reduce((s, v) => s + (Number(v.reste) || 0), 0)

  // Encaissé aujourd'hui : tous les paiements datés d'aujourd'hui,
  // y compris sur des ventes de jours précédents.
  const paiementsJour = sales.flatMap((v) =>
    (v.payments || []).filter((p) => dayOfIso(p.at) === day)
  )
  const encaisseJour = paiementsJour.reduce((s, p) => s + (Number(p.amount) || 0), 0)

  // Reste à encaisser sur TOUTES les ventes
  const resteEncaisser = sales.reduce((s, v) => s + dueOf(v), 0)

  const kpis = [
    { label: 'CA total du jour', value: <EuroValue value={caTotal} /> },
    { label: 'Ventes', value: ventes.length },
    {
      label: 'Lunettes',
      value: lunettes.length,
      note: euro(caLunettes),
    },
    {
      label: 'Lentilles',
      value: lentilles.length,
      note: euro(caLentilles),
    },
    { label: 'Part mutuelle', value: <EuroValue value={partMutuelle} /> },
    { label: 'Reste à charge clients', value: <EuroValue value={resteCharge} /> },
    {
      label: "Encaissé aujourd'hui",
      value: <EuroValue value={encaisseJour} />,
      note: 'tous paiements du jour',
    },
    {
      label: 'Reste à encaisser',
      value: <EuroValue value={resteEncaisser} />,
      note: 'toutes ventes confondues',
    },
  ]

  // ----- caisse du jour par moyen de paiement -----
  const parMoyen = {}
  paiementsJour.forEach((p) => {
    const m = p.method || 'Autre'
    parMoyen[m] = (parMoyen[m] || 0) + (Number(p.amount) || 0)
  })
  const moyens = [
    ...settings.methods,
    ...Object.keys(parMoyen).filter((m) => !settings.methods.includes(m)),
  ]

  return (
    <div className="stack">
      <div className="kpis">
        {kpis.map((k, i) => (
          <div
            className="kpi"
            key={k.label}
            style={{ '--kpi-color': PALETTE[i % PALETTE.length] }}
          >
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            {k.note && <div className="kpi-note">{k.note}</div>}
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 className="card-title">Nouvelle vente</h2>
          <SaleForm />
        </div>

        <div className="card">
          <h2 className="card-title">Caisse du jour</h2>
          <p className="card-sub">
            Encaissements d'aujourd'hui par moyen de paiement, pour la vérification du soir.
          </p>
          {paiementsJour.length === 0 ? (
            <div className="empty">
              <Wallet className="lucide" />
              <p>Aucun encaissement pour l'instant — la caisse se remplira au fil de la journée.</p>
            </div>
          ) : (
            <div className="stack">
              {moyens.map((m) => (
                <div className="row-between" key={m}>
                  <span>{m}</span>
                  <strong className="num">{euro(parMoyen[m] || 0)}</strong>
                </div>
              ))}
              <div className="row-between">
                <span className="serif">
                  <strong>Total encaissé</strong>
                </span>
                <strong className="num">{euro(encaisseJour)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Ventes du jour</h2>
        <SalesTable sales={ventes} />
      </div>
    </div>
  )
}
