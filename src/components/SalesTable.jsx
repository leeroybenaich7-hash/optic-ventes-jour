// Tableau des ventes : réutilisé par l'écran du jour et l'historique.
// props : { sales, readOnly } — readOnly masque les actions.
import React, { useState } from 'react'
import { Glasses, Pencil, Trash2, Eye } from 'lucide-react'
import { useStore, paidOf, dueOf } from '../lib/store.jsx'
import { euro, fmtTime, parseEuro } from '../lib/format.js'

// nombre -> texte de champ € ("120" ou "120,50")
function toInput(n) {
  const r = Math.round((Number(n) || 0) * 100) / 100
  return Number.isInteger(r) ? String(r) : String(r).replace('.', ',')
}

export default function SalesTable({ sales, readOnly }) {
  const { settings, updateSale, deleteSale, notify } = useStore()
  const [edit, setEdit] = useState(null) // { id, client, type, price, mutuelle, reste, vendor }

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
      type: sale.type,
      price: toInput(sale.price),
      mutuelle: toInput(sale.mutuelle),
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
      type: edit.type,
      price: parseEuro(edit.price),
      mutuelle: parseEuro(edit.mutuelle),
      mutuelle_nom: edit.mutuelle_nom.trim(),
      plateforme: edit.plateforme,
      reste: parseEuro(edit.reste),
      vendor: edit.vendor,
    })
    setEdit(null)
    notify('Vente modifiée')
  }

  return (
    <>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Heure</th>
              <th>Client</th>
              <th>Type</th>
              <th>Vendeur</th>
              <th className="num">Prix</th>
              <th className="num">Mutuelle</th>
              <th className="num">Reste à charge</th>
              <th>Encaissement</th>
              <th>Paiement</th>
              <th>Facturation</th>
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
                    {s.type === 'lentilles' ? (
                      <span className="pill pill-teal">Lentilles</span>
                    ) : (
                      <span className="pill pill-type">Lunettes</span>
                    )}
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
                  <td>
                    {methods.length > 0 ? (
                      methods.join(' + ')
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {(Number(s.mutuelle) || 0) > 0 ? (
                      s.teletrans ? (
                        <span className="pill pill-ok">faite</span>
                      ) : (
                        <span className="pill pill-wait">à faire</span>
                      )
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  {!readOnly && (
                    <td>
                      <span className="row">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Modifier la vente"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="lucide" size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Supprimer la vente"
                          onClick={() => askDelete(s)}
                        >
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
                <input
                  id="ed-client"
                  className="input"
                  value={edit.client}
                  onChange={(e) => setEdit({ ...edit, client: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Type de vente</label>
                <div className="seg">
                  <button
                    type="button"
                    className={'seg-btn' + (edit.type === 'lunettes' ? ' active' : '')}
                    onClick={() => setEdit({ ...edit, type: 'lunettes' })}
                  >
                    <Glasses className="lucide" size={17} />
                    Lunettes
                  </button>
                  <button
                    type="button"
                    className={'seg-btn' + (edit.type === 'lentilles' ? ' active' : '')}
                    onClick={() => setEdit({ ...edit, type: 'lentilles' })}
                  >
                    <Eye className="lucide" size={17} />
                    Lentilles
                  </button>
                </div>
              </div>

              <div className="grid-3">
                <div className="field">
                  <label htmlFor="ed-price">Prix total (€)</label>
                  <input
                    id="ed-price"
                    className="input input-euro"
                    inputMode="decimal"
                    value={edit.price}
                    onChange={(e) => setEdit({ ...edit, price: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ed-mutuelle">Part mutuelle (€)</label>
                  <input
                    id="ed-mutuelle"
                    className="input input-euro"
                    inputMode="decimal"
                    value={edit.mutuelle}
                    onChange={(e) => setEdit({ ...edit, mutuelle: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ed-reste">Reste à charge (€)</label>
                  <input
                    id="ed-reste"
                    className="input input-euro"
                    inputMode="decimal"
                    value={edit.reste}
                    onChange={(e) => setEdit({ ...edit, reste: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="ed-mutnom">Mutuelle</label>
                <input
                  id="ed-mutnom"
                  className="input"
                  value={edit.mutuelle_nom}
                  onChange={(e) => setEdit({ ...edit, mutuelle_nom: e.target.value })}
                  placeholder="Nom de la mutuelle"
                />
              </div>

              <div className="field">
                <label>Plateforme</label>
                <div className="seg">
                  {(settings.plateformes || []).map((p) => (
                    <button
                      type="button"
                      key={p}
                      className={'seg-btn' + (edit.plateforme === p ? ' active' : '')}
                      onClick={() => setEdit({ ...edit, plateforme: p })}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Vendeur</label>
                <div className="seg">
                  {settings.vendors.map((v) => (
                    <button
                      type="button"
                      key={v}
                      className={'seg-btn' + (edit.vendor === v ? ' active' : '')}
                      onClick={() => setEdit({ ...edit, vendor: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <p className="hint">Les paiements se gèrent dans l'onglet « Reste à charge ».</p>

              <div className="row">
                <button type="submit" className="btn">
                  Enregistrer
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
