// Onglet « À télétransmettre » : dossiers mutuelle non pointés,
// même ceux des jours précédents, + les pointages du jour (annulables).
import React from 'react'
import { Send, Undo2, CheckCircle2 } from 'lucide-react'
import { useStore, pendingTeletrans } from '../lib/store.jsx'
import { euro, today, fmtDay, fmtTime, daysAgo } from '../lib/format.js'

export default function Teletrans() {
  const { sales, markTeletrans, notify } = useStore()
  const jour = today()

  // En attente, des plus anciennes aux plus récentes
  const attente = pendingTeletrans(sales)
    .slice()
    .sort((a, b) =>
      a.day === b.day
        ? String(a.created_at).localeCompare(String(b.created_at))
        : a.day.localeCompare(b.day)
    )

  const totalMutuelle = attente.reduce((s, v) => s + (Number(v.mutuelle) || 0), 0)

  // Pointées aujourd'hui (teletrans_at = aujourd'hui)
  const pointees = sales
    .filter(
      (v) => v.teletrans === true && v.teletrans_at && v.teletrans_at.slice(0, 10) === jour
    )
    .slice()
    .sort((a, b) => String(b.teletrans_at).localeCompare(String(a.teletrans_at)))

  const pointer = (vente) => {
    markTeletrans(vente.id)
    notify('Télétransmission pointée — ' + vente.client)
  }

  const annuler = (vente) => {
    markTeletrans(vente.id, false)
    notify('Pointage annulé — ' + vente.client)
  }

  return (
    <div className="stack">
      <section className="card">
        <h2 className="card-title">Télétransmissions mutuelle en attente</h2>
        <p className="card-sub">
          Une vente reste dans cette liste tant que sa télétransmission n’est pas
          pointée — même les jours suivants, rien ne se perd.
        </p>

        {attente.length === 0 ? (
          <div className="empty">
            <CheckCircle2 className="lucide" />
            <p>Tout est télétransmis. Rien à envoyer.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Heure</th>
                    <th>Client</th>
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
                              <span className="pill pill-late">
                                en retard de {retard} j
                              </span>
                            ) : (
                              <span className="pill pill-wait">aujourd’hui</span>
                            )}
                          </span>
                        </td>
                        <td>{fmtTime(v.created_at)}</td>
                        <td>{v.client}</td>
                        <td>{v.vendor || '—'}</td>
                        <td className="num">{euro(v.mutuelle)}</td>
                        <td className="num">
                          <button
                            type="button"
                            className="btn btn-ok btn-sm"
                            onClick={() => pointer(v)}
                          >
                            <Send className="lucide" size={15} />
                            Télétransmis
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>
              {attente.length} dossier{attente.length > 1 ? 's' : ''} ·{' '}
              {euro(totalMutuelle)} de part mutuelle en attente
            </p>
          </>
        )}
      </section>

      {pointees.length > 0 && (
        <section className="card">
          <h2 className="card-title">Pointées aujourd’hui</h2>
          <p className="card-sub">
            En cas d’erreur de clic, vous pouvez annuler un pointage : la vente
            reviendra dans la liste d’attente.
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Pointée à</th>
                  <th>Client</th>
                  <th>Vendeur</th>
                  <th className="num">Part mutuelle</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pointees.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span className="pill pill-ok">
                        <CheckCircle2 className="lucide" size={13} />
                        {fmtTime(v.teletrans_at)}
                      </span>
                    </td>
                    <td>{v.client}</td>
                    <td>{v.vendor || '—'}</td>
                    <td className="num">{euro(v.mutuelle)}</td>
                    <td className="num">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => annuler(v)}
                      >
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
