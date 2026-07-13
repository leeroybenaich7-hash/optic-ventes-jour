// Récap tiers payant : par plateforme, ce qui reste à facturer et
// ce qu'on attend en paiement de la mutuelle. Vue d'ensemble des
// créances : « combien chaque tiers payant doit encore traiter/payer ».
import React, { useMemo } from 'react'
import { Landmark } from 'lucide-react'
import { useStore, pendingFacture, pendingMutuellePaid } from '../lib/store.jsx'
import { euro } from '../lib/format.js'

export default function TiersPayantRecap() {
  const { sales } = useStore()

  const { rows, tot } = useMemo(() => {
    const map = {}
    const bucket = (p) => {
      const key = p || 'Sans plateforme'
      if (!map[key]) map[key] = { plateforme: key, aFacturer: 0, enAttente: 0, nbF: 0, nbA: 0 }
      return map[key]
    }
    for (const s of pendingFacture(sales)) {
      const b = bucket(s.plateforme)
      b.aFacturer += Number(s.mutuelle) || 0
      b.nbF += 1
    }
    for (const s of pendingMutuellePaid(sales)) {
      const b = bucket(s.plateforme)
      b.enAttente += Number(s.mutuelle) || 0
      b.nbA += 1
    }
    const rows = Object.values(map)
      .map((r) => ({ ...r, total: r.aFacturer + r.enAttente }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
    const tot = rows.reduce(
      (a, r) => ({
        aFacturer: a.aFacturer + r.aFacturer,
        enAttente: a.enAttente + r.enAttente,
        total: a.total + r.total,
      }),
      { aFacturer: 0, enAttente: 0, total: 0 }
    )
    return { rows, tot }
  }, [sales])

  return (
    <section className="card">
      <h2 className="card-title">
        <Landmark className="lucide" size={19} style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--accent)' }} />
        Récap tiers payant
      </h2>
      <p className="card-sub">
        Par plateforme : la part mutuelle qui reste à facturer et celle qu'on
        attend en paiement. Total en cours = ce que ce tiers payant doit encore.
      </p>

      {rows.length === 0 ? (
        <p className="muted small">Aucune créance en cours — tout est facturé et payé.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Plateforme</th>
                <th className="num">À facturer</th>
                <th className="num">En attente de paiement</th>
                <th className="num">Total en cours</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.plateforme}>
                  <td><span className="pill pill-teal">{r.plateforme}</span></td>
                  <td className="num">
                    {euro(r.aFacturer)}
                    {r.nbF > 0 && <span className="small muted"> · {r.nbF}</span>}
                  </td>
                  <td className="num">
                    {euro(r.enAttente)}
                    {r.nbA > 0 && <span className="small muted"> · {r.nbA}</span>}
                  </td>
                  <td className="num"><strong>{euro(r.total)}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td><strong>Total</strong></td>
                <td className="num"><strong>{euro(tot.aFacturer)}</strong></td>
                <td className="num"><strong>{euro(tot.enAttente)}</strong></td>
                <td className="num"><strong>{euro(tot.total)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}
