// Formulaire de saisie d'une vente — pensé pour aller vite.
// Lunettes et Lentilles ont chacun leur montant ; le total est la
// somme des deux. Le reste à charge est UNIQUE, sur ce total, et la
// part mutuelle en découle. On choisit d'abord la plateforme de
// tiers payant, qui propose alors ses mutuelles.
import React, { useMemo, useRef, useState } from 'react'
import { Glasses, Eye, Check } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { euro, parseEuro, uid } from '../lib/format.js'

export default function SaleForm() {
  const { settings, addSale, notify } = useStore()
  const clientRef = useRef(null)

  const [client, setClient] = useState('')
  const [luM, setLuM] = useState('')
  const [leM, setLeM] = useState('')
  const [reste, setReste] = useState('')
  const [plateforme, setPlateforme] = useState('')
  const [mutuelleNom, setMutuelleNom] = useState('')
  const [autreMut, setAutreMut] = useState(false) // mutuelle non listée
  const [encaisse, setEncaisse] = useState('')
  const [encTouched, setEncTouched] = useState(false)
  const [method, setMethod] = useState(settings.methods[0] || 'CB')
  const [vendor, setVendor] = useState(null)
  const [facture, setFacture] = useState(false)

  const total = parseEuro(luM) + parseEuro(leM)
  const resteNum = Math.min(total, parseEuro(reste))
  const partMutuelle = Math.max(0, Math.round((total - resteNum) * 100) / 100)

  const encaisseShown = encTouched ? encaisse : (resteNum > 0 ? toInput(resteNum) : '')

  // mutuelles proposées par la plateforme choisie
  const mutuellesDeLaPlateforme = useMemo(
    () => (settings.mutuelles || []).filter((m) => m.plateforme === plateforme),
    [settings.mutuelles, plateforme]
  )

  function choisirPlateforme(p) {
    setPlateforme(p)
    setMutuelleNom('')
    setAutreMut(false)
  }

  function reset() {
    setClient('')
    setLuM(''); setLeM(''); setReste('')
    setPlateforme(''); setMutuelleNom(''); setAutreMut(false)
    setEncaisse(''); setEncTouched(false)
    setMethod(settings.methods[0] || 'CB')
    setVendor(null)
    setFacture(false)
    clientRef.current?.focus()
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!client.trim()) {
      notify('Indiquez le nom du client')
      clientRef.current?.focus()
      return
    }
    if (total <= 0) {
      notify('Indiquez au moins un montant (lunettes ou lentilles)')
      return
    }
    if (partMutuelle > 0 && !plateforme) {
      notify('Choisissez la plateforme de tiers payant')
      return
    }
    if (partMutuelle > 0 && !mutuelleNom.trim()) {
      notify('Choisissez la mutuelle du client')
      return
    }
    if (!vendor) {
      notify('Choisissez le vendeur')
      return
    }

    const montant = encTouched ? parseEuro(encaisse) : resteNum
    addSale({
      client: client.trim(),
      lunettes_montant: parseEuro(luM),
      lentilles_montant: parseEuro(leM),
      reste: resteNum,
      mutuelle_nom: mutuelleNom,
      plateforme,
      vendor,
      facture,
      payments:
        montant > 0
          ? [{ id: uid(), at: new Date().toISOString(), amount: montant, method }]
          : [],
    })
    reset()
    notify('Vente enregistrée')
  }

  const showMutuelle = partMutuelle > 0
  const showMethod = parseEuro(encaisseShown) > 0

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="sf-client">Nom du client</label>
        <input id="sf-client" ref={clientRef} className="input" value={client}
          onChange={(e) => setClient(e.target.value)} placeholder="Ex. Mme Cohen" autoFocus />
      </div>

      {/* Montants par poste */}
      <div className="grid-2">
        <div className="poste">
          <div className="poste-head"><Glasses className="lucide" size={18} /><span>Lunettes</span></div>
          <div className="field">
            <label htmlFor="sf-lum">Montant (€)</label>
            <input id="sf-lum" className="input input-euro" inputMode="decimal"
              value={luM} onChange={(e) => setLuM(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="poste">
          <div className="poste-head"><Eye className="lucide" size={18} /><span>Lentilles</span></div>
          <div className="field">
            <label htmlFor="sf-lem">Montant (€)</label>
            <input id="sf-lem" className="input input-euro" inputMode="decimal"
              value={leM} onChange={(e) => setLeM(e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      {/* Total + reste à charge unique + part mutuelle */}
      <div className="recap">
        <div><span className="recap-lbl">Montant total</span><span className="recap-val">{euro(total)}</span></div>
        <div className="field" style={{ gap: 4 }}>
          <label htmlFor="sf-reste" className="recap-lbl">Reste à charge (€)</label>
          <input id="sf-reste" className="input input-euro" inputMode="decimal"
            value={reste} onChange={(e) => setReste(e.target.value)} placeholder="0" />
        </div>
        <div><span className="recap-lbl">Part mutuelle</span><span className="recap-val">{euro(partMutuelle)}</span></div>
      </div>

      {/* Plateforme -> ses mutuelles */}
      {showMutuelle && (
        <>
          <div className="field">
            <label>Plateforme de tiers payant (obligatoire)</label>
            <div className="seg">
              {(settings.plateformes || []).map((p) => (
                <button type="button" key={p}
                  className={'seg-btn' + (plateforme === p ? ' active' : '')}
                  onClick={() => choisirPlateforme(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {plateforme && (
            <div className="field">
              <label>Mutuelle (obligatoire)</label>
              <div className="seg">
                {mutuellesDeLaPlateforme.map((m) => (
                  <button type="button" key={m.nom}
                    className={'seg-btn' + (!autreMut && mutuelleNom === m.nom ? ' active' : '')}
                    onClick={() => { setMutuelleNom(m.nom); setAutreMut(false) }}>
                    {m.nom}
                  </button>
                ))}
                <button type="button"
                  className={'seg-btn' + (autreMut ? ' active' : '')}
                  onClick={() => { setAutreMut(true); setMutuelleNom('') }}>
                  + Autre mutuelle
                </button>
              </div>
              {mutuellesDeLaPlateforme.length === 0 && !autreMut && (
                <span className="hint">Aucune mutuelle enregistrée pour {plateforme} — utilisez « Autre mutuelle » (et ajoutez-la dans Réglages).</span>
              )}
              {autreMut && (
                <input className="input" style={{ marginTop: 8 }} value={mutuelleNom}
                  onChange={(e) => setMutuelleNom(e.target.value)}
                  placeholder="Nom de la mutuelle" autoFocus />
              )}
            </div>
          )}
        </>
      )}

      {/* Encaissement du reste à charge */}
      <div className="field">
        <label htmlFor="sf-encaisse">Encaissé aujourd'hui (€)</label>
        <input id="sf-encaisse" className="input input-euro" inputMode="decimal"
          value={encaisseShown}
          onChange={(e) => { setEncaisse(e.target.value); setEncTouched(true) }} placeholder="0" />
        <span className="hint">S'il paie moins que son reste à charge, le solde va dans « Reste à charge ».</span>
      </div>

      {showMethod && (
        <div className="field">
          <label>Moyen de paiement</label>
          <div className="seg">
            {settings.methods.map((m) => (
              <button type="button" key={m}
                className={'seg-btn' + (method === m ? ' active' : '')}
                onClick={() => setMethod(m)}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label>Vendeur</label>
        <div className="seg">
          {settings.vendors.map((v) => (
            <button type="button" key={v}
              className={'seg-btn' + (vendor === v ? ' active' : '')}
              onClick={() => setVendor(v)}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {showMutuelle && (
        <label className="check">
          <input type="checkbox" checked={facture} onChange={(e) => setFacture(e.target.checked)} />
          Dossier déjà facturé à la mutuelle
        </label>
      )}

      <div className="row">
        <button type="submit" className="btn">
          <Check className="lucide" size={17} />
          Enregistrer la vente
        </button>
      </div>
    </form>
  )
}

function toInput(n) {
  const r = Math.round((Number(n) || 0) * 100) / 100
  if (r <= 0) return ''
  return Number.isInteger(r) ? String(r) : String(r).replace('.', ',')
}
