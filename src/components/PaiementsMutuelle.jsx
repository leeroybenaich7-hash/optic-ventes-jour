// Étape 3 — « Paiements mutuelle » : dossiers facturés dont on
// attend le règlement de la mutuelle. Un clic sur « Payé » = la
// mutuelle a réglé sa part, le dossier est soldé.
import React from 'react'
import { BadgeEuro, Undo2, CheckCircle2 } from 'lucide-react'
import { useStore, pendingMutuellePaid } from '../lib/store.jsx'
import { euro, today, fmtDay, fmtTime, daysAgo } from '../lib/format.js'

export default function PaiementsMutuelle() {
  const { sales, markMutuellePaid, notify } = useStore()
  const jour = today()

  const attente = pendingMutuellePaid(sales)
    .slice()
    .sort((a, b) =>
      String(a.facture_at || a.created_at).localeCompare(String(b.facture_at || b.created_at))
    )

  const totalMutuelle = attente.reduce((s, v) => s + (Number(v.mutuelle) || 0), 0)

  const payesDuJour = sales
    .filter((v) => v.mutuelle_paid && v.mutuelle_paid_at && v.mutuelle_paid_at.slice(0, 10) === jour)
    .slice()
    .sort((a, b) => String(b.mutuelle_paid_at).localeCompare(String(a.mutuelle_paid_at)))

  const payer = (v) => {
    markMutuellePaid(v.id)
    notify('Paiement mutuelle pointé — ' + v.client)
  }
  const annuler = (v) => {
    markMutuellePaid(v.id, false)
    notify('Pointage annulé — ' + v.client)
  }

  return (
    <div className="stack">
      <section className="card">
        <h2 className="card-title">Paiements mutuelle en attente</h2>
        <p className="card-sub">
          Dossiers déjà facturés dont on attend le règlement de la mutuelle.
          Pointez « Payé » quand l'argent est arrivé.
        </p>

        {attente.length === 0 ? (
          <div className="empty">
            <CheckCircle2 className="lucide" />
            <p>Aucun paiement mutuelle en attente.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Facturé le</th>
                    <th>Client</th>
                    <th>Mutuelle</th>
                    <th>Plateforme</th>
                    <th>Vendeur</th>
                    <th className="num">Part mutuelle</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {attente.map((v) => {
                    const jourFacture = (v.facture_at || v.created_at || '').slice(0, 10)
                    const retard = jourFacture && jourFacture < jour ? daysAgo(jourFacture) : 0
                    return (
                      <tr key={v.id}>
                        <td>
                          <span className="row">
                            {jourFacture ? fmtDay(jourFacture, { short: true }) : '—'}{' '}
                            {retard > 7 && <span className="pill pill-late">{retard} j</span>}
                          </span>
                        </td>
                        <td>{v.client}</td>
                        <td>{v.mutuelle_nom || '—'}</td>
                        <td>
                          {v.plateforme ? <span className="pill pill-teal">{v.plateforme}</span> : '—'}
                        </td>
                        <td>{v.vendor || '—'}</td>
                        <td className="num">{euro(v.mutuelle)}</td>
                        <td className="num">
                          <button type="button" className="btn btn-ok btn-sm" onClick={() => payer(v)}>
                            <BadgeEuro className="lucide" size={15} />
                            Payé
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>
              {attente.length} dossier{attente.length > 1 ? 's' : ''} · {euro(totalMutuelle)} attendus des mutuelles
            </p>
          </>
        )}
      </section>

      {payesDuJour.length > 0 && (
        <section className="card">
          <h2 className="card-title">Payés aujourd’hui</h2>
          <p className="card-sub">En cas d’erreur, annuler renvoie le dossier en attente de paiement.</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Pointé à</th>
                  <th>Client</th>
                  <th>Mutuelle</th>
                  <th className="num">Part mutuelle</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payesDuJour.map((v) => (
                  <tr key={v.id}>
                    <td><span className="pill pill-ok"><CheckCircle2 className="lucide" size={13} />{fmtTime(v.mutuelle_paid_at)}</span></td>
                    <td>{v.client}</td>
                    <td>{v.mutuelle_nom || '—'}</td>
                    <td className="num">{euro(v.mutuelle)}</td>
                    <td className="num">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => annuler(v)}>
                        <Undo2 className="lucide" size={15} />
                        Annuler
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
