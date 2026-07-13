// Étape 2 — « À facturer » : dossiers avec part mutuelle pas encore
// facturés. Un clic sur « Facturé » = la demande est envoyée à la
// plateforme, et le dossier passe dans « Paiements mutuelle ».
import React, { useState } from 'react'
import { Send, Undo2, CheckCircle2 } from 'lucide-react'
import { useStore, pendingFacture } from '../lib/store.jsx'
import { euro, today, fmtDay, fmtTime, daysAgo, matchClient } from '../lib/format.js'
import SearchBar from './SearchBar.jsx'

export default function AFacturer() {
  const { sales, markFacture, notify } = useStore()
  const jour = today()
  const [q, setQ] = useState('')

  const attente = pendingFacture(sales)
    .filter((v) => matchClient(v, q))
    .slice()
    .sort((a, b) =>
      a.day === b.day
        ? String(a.created_at).localeCompare(String(b.created_at))
        : a.day.localeCompare(b.day)
    )

  const totalMutuelle = attente.reduce((s, v) => s + (Number(v.mutuelle) || 0), 0)

  const facturesDuJour = sales
    .filter((v) => v.facture && v.facture_at && v.facture_at.slice(0, 10) === jour)
    .slice()
    .sort((a, b) => String(b.facture_at).localeCompare(String(a.facture_at)))

  const facturer = (v) => {
    markFacture(v.id)
    notify('Dossier facturé — ' + v.client)
  }
  const annuler = (v) => {
    markFacture(v.id, false)
    notify('Facturation annulée — ' + v.client)
  }

  return (
    <div className="stack">
      <section className="card">
        <h2 className="card-title">Dossiers à facturer</h2>
        <p className="card-sub">
          Part mutuelle à envoyer sur la plateforme de tiers payant. Un dossier
          reste ici tant qu'il n'est pas facturé — même les jours suivants.
        </p>

        <SearchBar value={q} onChange={setQ} />

        {attente.length === 0 ? (
          <div className="empty">
            <CheckCircle2 className="lucide" />
            <p>{q ? 'Aucun client trouvé pour cette recherche.' : 'Tout est facturé. Rien en attente.'}</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
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
                    const retard = v.day < jour ? daysAgo(v.day) : 0
                    return (
                      <tr key={v.id}>
                        <td>
                          <span className="row">
                            {fmtDay(v.day, { short: true })}{' '}
                            {retard > 0 ? (
                              <span className="pill pill-late">en retard de {retard} j</span>
                            ) : (
                              <span className="pill pill-wait">aujourd’hui</span>
                            )}
                          </span>
                        </td>
                        <td>{v.client}</td>
                        <td>{v.mutuelle_nom || '—'}</td>
                        <td>
                          {v.plateforme ? (
                            <span className="pill pill-teal">{v.plateforme}</span>
                          ) : '—'}
                        </td>
                        <td>{v.vendor || '—'}</td>
                        <td className="num">{euro(v.mutuelle)}</td>
                        <td className="num">
                          <button type="button" className="btn btn-ok btn-sm" onClick={() => facturer(v)}>
                            <Send className="lucide" size={15} />
                            Facturé
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>
              {attente.length} dossier{attente.length > 1 ? 's' : ''} · {euro(totalMutuelle)} de part mutuelle à facturer
            </p>
          </>
        )}
      </section>

      {facturesDuJour.length > 0 && (
        <section className="card">
          <h2 className="card-title">Facturés aujourd’hui</h2>
          <p className="card-sub">En cas d’erreur, annuler renvoie le dossier dans la liste à facturer.</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Facturé à</th>
                  <th>Client</th>
                  <th>Mutuelle</th>
                  <th>Plateforme</th>
                  <th className="num">Part mutuelle</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {facturesDuJour.map((v) => (
                  <tr key={v.id}>
                    <td><span className="pill pill-ok"><CheckCircle2 className="lucide" size={13} />{fmtTime(v.facture_at)}</span></td>
                    <td>{v.client}</td>
                    <td>{v.mutuelle_nom || '—'}</td>
                    <td>{v.plateforme || '—'}</td>
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
