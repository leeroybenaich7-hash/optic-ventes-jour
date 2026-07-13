// Onglet « À encaisser » — les restes à charge clients pas encore soldés.
// Rien ne disparaît de cette liste tant que le client n'a pas tout payé.
import React, { useMemo, useState } from 'react'
import { Wallet, ChevronDown, ChevronUp, CheckCircle2, X } from 'lucide-react'
import { useStore, paidOf, dueOf, pendingDue, hasLunettes, hasLentilles } from '../lib/store.jsx'
import { euro, today, fmtDay, fmtTime, daysAgo, parseEuro, matchClient } from '../lib/format.js'
import SearchBar from './SearchBar.jsx'

export default function Encaissements() {
  const { sales, settings, addPayment, notify } = useStore()
  const [openId, setOpenId] = useState(null) // ligne dont l'historique est déplié
  const [modalSale, setModalSale] = useState(null) // vente en cours d'encaissement
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    return pendingDue(sales)
      .filter((v) => matchClient(v, q))
      .slice()
      .sort((a, b) =>
        a.day === b.day
          ? String(a.created_at).localeCompare(String(b.created_at))
          : a.day.localeCompare(b.day)
      )
  }, [sales, q])

  const totalDue = list.reduce((s, v) => s + dueOf(v), 0)

  return (
    <div className="stack">
      <div className="card">
        <h2 className="card-title">Restes à charge à encaisser</h2>
        <p className="card-sub">
          Les clients qui n'ont pas fini de payer leur reste à charge. Rien ne
          disparaît d'ici tant que ce n'est pas soldé.
        </p>

        <SearchBar value={q} onChange={setQ} />

        {list.length === 0 ? (
          <div className="empty">
            <CheckCircle2 className="lucide" />
            <p>{q ? 'Aucun client trouvé pour cette recherche.' : 'Tout est encaissé. Aucun reste dû.'}</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Postes</th>
                    <th className="num">Prix</th>
                    <th className="num">Déjà payé</th>
                    <th className="num">Reste dû</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((sale) => (
                    <SaleRow
                      key={sale.id}
                      sale={sale}
                      open={openId === sale.id}
                      onToggle={() =>
                        setOpenId(openId === sale.id ? null : sale.id)
                      }
                      onEncaisser={() => setModalSale(sale)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row-between">
              <span className="spacer" />
              <p className="small muted">
                <strong>{list.length}</strong> client{list.length > 1 ? 's' : ''} ·{' '}
                <strong>{euro(totalDue)}</strong> à encaisser
              </p>
            </div>
          </>
        )}
      </div>

      {modalSale && (
        <EncaisserModal
          sale={modalSale}
          methods={settings.methods}
          onClose={() => setModalSale(null)}
          onConfirm={(amount, method) => {
            addPayment(modalSale.id, { amount, method })
            notify('Encaissé ' + euro(amount) + ' — ' + modalSale.client)
            setModalSale(null)
          }}
        />
      )}
    </div>
  )
}

// ---------- une ligne du tableau (+ historique dépliable) ----------
function SaleRow({ sale, open, onToggle, onEncaisser }) {
  const late = sale.day < today()
  const nbJours = daysAgo(sale.day)
  const payments = sale.payments || []

  return (
    <>
      <tr>
        <td>
          <span className="row">
            <span className="small muted">{fmtDay(sale.day, { short: true })}</span>
            {late ? (
              <span className="pill pill-late">
                en retard de {nbJours} j
              </span>
            ) : (
              <span className="pill pill-wait">aujourd'hui</span>
            )}
          </span>
        </td>
        <td>{sale.client}</td>
        <td>
          <span className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {hasLunettes(sale) && <span className="pill pill-type">Lunettes</span>}
            {hasLentilles(sale) && <span className="pill pill-teal">Lentilles</span>}
            {!hasLunettes(sale) && !hasLentilles(sale) && <span className="muted">—</span>}
          </span>
        </td>
        <td className="num">{euro(sale.price)}</td>
        <td className="num">{euro(paidOf(sale))}</td>
        <td className="num">
          <strong>{euro(dueOf(sale))}</strong>
        </td>
        <td className="num">
          <span className="row">
            <button
              type="button"
              className="btn-icon"
              onClick={onToggle}
              title={open ? "Masquer l'historique" : 'Voir les paiements déjà reçus'}
              aria-label={open ? "Masquer l'historique" : 'Voir les paiements déjà reçus'}
            >
              {open ? (
                <ChevronUp className="lucide" size={16} />
              ) : (
                <ChevronDown className="lucide" size={16} />
              )}
            </button>
            <button type="button" className="btn btn-sm" onClick={onEncaisser}>
              <Wallet className="lucide" size={15} />
              Encaisser
            </button>
          </span>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7}>
            {payments.length === 0 ? (
              <span className="small muted">
                Aucun paiement reçu pour l'instant.
              </span>
            ) : (
              <div className="stack">
                {payments.map((p) => (
                  <span key={p.id} className="row small muted">
                    <span>
                      {fmtDay(String(p.at).slice(0, 10), { short: true })} à{' '}
                      {fmtTime(p.at)}
                    </span>
                    <span>·</span>
                    <strong>{euro(p.amount)}</strong>
                    <span>·</span>
                    <span>{p.method}</span>
                  </span>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ---------- modale d'encaissement ----------
function EncaisserModal({ sale, methods, onClose, onConfirm }) {
  const due = dueOf(sale)
  const [amountStr, setAmountStr] = useState(String(due).replace('.', ','))
  const [method, setMethod] = useState('')

  const amount = parseEuro(amountStr)
  const tooMuch = amount > due
  const tooLow = amount <= 0
  const valid = !tooMuch && !tooLow && !!method

  const submit = () => {
    if (!valid) return
    onConfirm(amount, method)
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <h3 className="modal-title">Encaisser — {sale.client}</h3>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="lucide" size={16} />
          </button>
        </div>

        <div className="stack">
          <p className="small muted">
            Reste dû actuel : <strong>{euro(due)}</strong> (déjà payé :{' '}
            {euro(paidOf(sale))} sur {euro(sale.reste)} de part client).
          </p>

          <div className="field">
            <label htmlFor="enc-montant">Montant encaissé</label>
            <input
              id="enc-montant"
              className="input input-euro"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              autoFocus
            />
            {tooMuch && (
              <span className="hint">
                Le montant dépasse le reste dû ({euro(due)} maximum).
              </span>
            )}
            {tooLow && (
              <span className="hint">Saisissez un montant supérieur à 0 €.</span>
            )}
            {!tooMuch && !tooLow && amount < due && (
              <span className="hint">
                Paiement partiel : il restera {euro(due - amount)} à encaisser.
              </span>
            )}
          </div>

          <div className="field">
            <label>Moyen de paiement</label>
            <div className="seg">
              {methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={'seg-btn' + (method === m ? ' active' : '')}
                  onClick={() => setMethod(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            {!method && <span className="hint">Choisissez un moyen de paiement.</span>}
          </div>

          <div className="row">
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-ok"
              disabled={!valid}
              onClick={submit}
            >
              <Wallet className="lucide" size={16} />
              Encaisser {euro(tooLow || tooMuch ? due : amount)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
