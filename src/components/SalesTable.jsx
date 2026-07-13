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
      lunettes_reste: toInput(sale.lunettes_reste),
      lentilles_montant: toInput(sale.lentilles_montant),
      lentilles_reste: toInput(sale.lentilles_reste),
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
      lunettes_reste: parseEuro(edit.lunettes_reste),
      lentilles_montant: parseEuro(edit.lentilles_montant),
      lentilles_reste: parseEuro(edit.lentilles_reste),
      mutuelle_nom: edit.mutuelle_nom.trim(),
      plateforme: edit.plateforme,
      vendor: edit.vendor,
    })
    setEdit(null)
    notify('Vente modifiée')
  }

  const onMutuelleNom = (v) => {
    const found = (settings.mutuelles || []).find((m) => m.nom.toLowerCase() === v.trim().toLowerCase())
    setEdit((e) => ({ ...e, mutuelle_nom: v, plateforme: found ? found.plateforme : e.plateforme }))
  }

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

              <div className="poste">
                <div className="poste-head"><Glasses className="lucide" size={18} /><span>Lunettes</span></div>
                <div className="grid-2">
                  <div className="field">
                    <label>Montant (€)</label>
                    <input className="input input-euro" inputMode="decimal" value={edit.lunettes_montant}
                      onChange={(e) => setEdit({ ...edit, lunettes_montant: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Reste à charge (€)</label>
                    <input className="input input-euro" inputMode="decimal" value={edit.lunettes_reste}
                      onChange={(e) => setEdit({ ...edit, lunettes_reste: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="poste">
                <div className="poste-head"><Eye className="lucide" size={18} /><span>Lentilles</span></div>
                <div className="grid-2">
                  <div className="field">
                    <label>Montant (€)</label>
                    <input className="input input-euro" inputMode="decimal" value={edit.lentilles_montant}
                      onChange={(e) => setEdit({ ...edit, lentilles_montant: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Reste à charge (€)</label>
                    <input className="input input-euro" inputMode="decimal" value={edit.lentilles_reste}
                      onChange={(e) => setEdit({ ...edit, lentilles_reste: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="ed-mut">Mutuelle</label>
                <input id="ed-mut" className="input" list="mutuelles-list-edit" value={edit.mutuelle_nom}
                  onChange={(e) => onMutuelleNom(e.target.value)} placeholder="Nom de la mutuelle" autoComplete="off" />
                <datalist id="mutuelles-list-edit">
                  {(settings.mutuelles || []).map((m) => (
                    <option key={m.nom} value={m.nom}>{m.plateforme}</option>
                  ))}
                </datalist>
              </div>

              <div className="field">
                <label>Plateforme de tiers payant</label>
                <div className="seg">
                  {(settings.plateformes || []).map((p) => (
                    <button type="button" key={p}
                      className={'seg-btn' + (edit.plateforme === p ? ' active' : '')}
                      onClick={() => setEdit({ ...edit, plateforme: p })}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

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
