// Tableau des ventes : réutilisé par l'écran du jour et l'historique.
// props : { sales, readOnly } — readOnly masque les actions.
import React, { useState } from 'react'
import { Glasses, Eye, Pencil, Trash2 } from 'lucide-react'
import { useStore, paidOf, dueOf, hasLunettes, hasLentilles } from '../lib/store.jsx'
import { euro, fmtTime, parseEuro } from '../lib/format.js'

function toInput(n) {
  const r = Math.round((Number(n) || 0) * 100) / 100
  if (r === 0) return ''
  return Number.isInteger(r) ? String(r) : String(r).replace('.', ',')
}

// Statut mutuelle en 3 temps
function MutuelleStatut({ sale }) {
  if ((Number(sale.mutuelle) || 0) <= 0) return <span className="muted">—</span>
  if (sale.mutuelle_paid) return <span className="pill pill-ok">payée</span>
  if (sale.facture) return <span className="pill pill-wait">en attente paiement</span>
  return <span className="pill pill-no">à facturer</span>
}

export default function SalesTable({ sales, readOnly }) {
  const { settings, updateSale, deleteSale, notify } = useStore()
  const [edit, setEdit] = useState(null)

  if (!sales || sales.length === 0) {
    return (
      <div className="empty">
        <Glasses className="lucide" />
        <p>Aucune vente pour l'instant — la première du jour s'enregistre à gauche.</p>
      </div>
    )
  }

  function askDelete(sale) {
    if (window.confirm(`Supprimer la vente de ${sale.client} ?`)) {
      deleteSale(sale.id)
      notify('Vente supprimée')
    }
  }

  function openEdit(sale) {
    setEdit({
      id: sale.id,
      client: sale.client,
      lunettes_montant: toInput(sale.lunettes_montant),
      lentilles_montant: toInput(sale.lentilles_montant),
      reste: toInput(sale.reste),
      mutuelle_nom: sale.mutuelle_nom || '',
      plateforme: sale.plateforme || '',
      vendor: sale.vendor,
    })
  }

  function saveEdit(e) {
    e.preventDefault()
    if (!edit.client.trim()) {
      notify('Indiquez le nom du client')
      return
    }
    updateSale(edit.id, {
      client: edit.client.trim(),
      lunettes_montant: parseEuro(edit.lunettes_montant),
      lentilles_montant: parseEuro(edit.lentilles_montant),
      reste: parseEuro(edit.reste),
      mutuelle_nom: edit.mutuelle_nom.trim(),
      plateforme: edit.plateforme,
      vendor: edit.vendor,
    })
    setEdit(null)
    notify('Vente modifiée')
  }

  const mutuellesEdit = edit
    ? (settings.mutuelles || []).filter((m) => m.plateforme === edit.plateforme)
    : []

  // Totaux de la sélection (ligne du bas)
  const tot = sales.reduce(
    (a, s) => ({
      price: a.price + (Number(s.price) || 0),
      mutuelle: a.mutuelle + (Number(s.mutuelle) || 0),
      reste: a.reste + (Number(s.reste) || 0),
      lunettes: a.lunettes + (Number(s.lunettes_montant) || 0),
      lentilles: a.lentilles + (Number(s.lentilles_montant) || 0),
    }),
    { price: 0, mutuelle: 0, reste: 0, lunettes: 0, lentilles: 0 }
  )

  return (
    <>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Heure</th>
              <th>Client</th>
              <th>Postes</th>
              <th>Vendeur</th>
              <th className="num">Prix</th>
              <th className="num">Mutuelle</th>
              <th className="num">Reste à charge</th>
              <th>Encaissement</th>
              <th>Paiement</th>
              <th>Mutuelle</th>
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => {
              const due = dueOf(s)
              const methods = [...new Set((s.payments || []).map((p) => p.method))]
              return (
                <tr key={s.id}>
                  <td>{fmtTime(s.created_at)}</td>
                  <td>{s.client}</td>
                  <td>
                    <span className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                      {hasLunettes(s) && <span className="pill pill-type"><Glasses className="lucide" size={12} />Lunettes</span>}
                      {hasLentilles(s) && <span className="pill pill-teal"><Eye className="lucide" size={12} />Lentilles</span>}
                      {!hasLunettes(s) && !hasLentilles(s) && <span className="muted">—</span>}
                    </span>
                  </td>
                  <td>{s.vendor}</td>
                  <td className="num">{euro(s.price)}</td>
                  <td className="num">
                    {euro(s.mutuelle)}
                    {(s.mutuelle_nom || s.plateforme) && (
                      <div className="small muted" style={{ whiteSpace: 'nowrap' }}>
                        {[s.mutuelle_nom, s.plateforme].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="num">{euro(s.reste)}</td>
                  <td>
                    {due > 0 ? (
                      <span className="pill pill-wait">reste {euro(due)}</span>
                    ) : (
                      <span className="pill pill-ok">soldé</span>
                    )}
                  </td>
                  <td>{methods.length > 0 ? methods.join(' + ') : <span className="muted">—</span>}</td>
                  <td><MutuelleStatut sale={s} /></td>
                  {!readOnly && (
                    <td>
                      <span className="row">
                        <button type="button" className="btn-icon" title="Modifier la vente" onClick={() => openEdit(s)}>
                          <Pencil className="lucide" size={16} />
                        </button>
                        <button type="button" className="btn-icon" title="Supprimer la vente" onClick={() => askDelete(s)}>
                          <Trash2 className="lucide" size={16} />
                        </button>
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td colSpan={4}>
                <strong>Totaux</strong>{' '}
                <span className="small muted">
                  · lunettes {euro(tot.lunettes)} · lentilles {euro(tot.lentilles)}
                </span>
              </td>
              <td className="num"><strong>{euro(tot.price)}</strong></td>
              <td className="num"><strong>{euro(tot.mutuelle)}</strong></td>
              <td className="num"><strong>{euro(tot.reste)}</strong></td>
              <td colSpan={readOnly ? 2 : 3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {edit && (
        <div className="modal-back" onClick={() => setEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Modifier la vente</h3>
            <form className="stack" onSubmit={saveEdit}>
              <div className="field">
                <label htmlFor="ed-client">Nom du client</label>
                <input id="ed-client" className="input" value={edit.client}
                  onChange={(e) => setEdit({ ...edit, client: e.target.value })} />
              </div>

              <div className="grid-2">
                <div className="poste">
                  <div className="poste-head"><Glasses className="lucide" size={18} /><span>Lunettes</span></div>
                  <div className="field">
                    <label>Montant (€)</label>
                    <input className="input input-euro" inputMode="decimal" value={edit.lunettes_montant}
                      onChange={(e) => setEdit({ ...edit, lunettes_montant: e.target.value })} />
                  </div>
                </div>
                <div className="poste">
                  <div className="poste-head"><Eye className="lucide" size={18} /><span>Lentilles</span></div>
                  <div className="field">
                    <label>Montant (€)</label>
                    <input className="input input-euro" inputMode="decimal" value={edit.lentilles_montant}
                      onChange={(e) => setEdit({ ...edit, lentilles_montant: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Reste à charge total (€)</label>
                <input className="input input-euro" inputMode="decimal" value={edit.reste}
                  onChange={(e) => setEdit({ ...edit, reste: e.target.value })} />
              </div>

              <div className="field">
                <label>Plateforme de tiers payant</label>
                <div className="seg">
                  {(settings.plateformes || []).map((p) => (
                    <button type="button" key={p}
                      className={'seg-btn' + (edit.plateforme === p ? ' active' : '')}
                      onClick={() => setEdit({ ...edit, plateforme: p, mutuelle_nom: '' })}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {edit.plateforme && (
                <div className="field">
                  <label>Mutuelle</label>
                  <div className="seg">
                    {mutuellesEdit.map((m) => (
                      <button type="button" key={m.nom}
                        className={'seg-btn' + (edit.mutuelle_nom === m.nom ? ' active' : '')}
                        onClick={() => setEdit({ ...edit, mutuelle_nom: m.nom })}>
                        {m.nom}
                      </button>
                    ))}
                  </div>
                  <input className="input" style={{ marginTop: 8 }} value={edit.mutuelle_nom}
                    onChange={(e) => setEdit({ ...edit, mutuelle_nom: e.target.value })}
                    placeholder="ou saisir une autre mutuelle" autoComplete="off" />
                </div>
              )}

              <div className="field">
                <label>Vendeur</label>
                <div className="seg">
                  {settings.vendors.map((v) => (
                    <button type="button" key={v}
                      className={'seg-btn' + (edit.vendor === v ? ' active' : '')}
                      onClick={() => setEdit({ ...edit, vendor: v })}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <p className="hint">Les encaissements se gèrent dans l'onglet « Reste à charge ».</p>

              <div className="row">
                <button type="submit" className="btn">Enregistrer</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
