// Formulaire de saisie d'une vente — pensé pour aller vite.
// Lunettes et Lentilles ont chacun leur montant ; le total est la
// somme des deux, affiché en gros. Le reste à charge est UNIQUE,
// sur ce total. Le client ne paie RIEN à la vente : il règle son
// reste à charge à la récupération → il part dans « Reste à charge ».
// On choisit la plateforme de tiers payant, qui propose ses mutuelles.
import React, { useMemo, useRef, useState } from 'react'
import { Glasses, Eye, Check } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { euro, parseEuro } from '../lib/format.js'

export default function SaleForm() {
  const { settings, addSale, notify } = useStore()
  const clientRef = useRef(null)

  const [client, setClient] = useState('')
  const [luM, setLuM] = useState('')
  const [leM, setLeM] = useState('')
  const [reste, setReste] = useState('')
  const [plateforme, setPlateforme] = useState('')
  const [mutuelleNom, setMutuelleNom] = useState('')
  const [autreMut, setAutreMut] = useState(false)
  const [vendor, setVendor] = useState(null)
  const [facture, setFacture] = useState(false)

  const total = parseEuro(luM) + parseEuro(leM)
  const resteNum = Math.min(total, parseEuro(reste))
  const partMutuelle = Math.max(0, Math.round((total - resteNum) * 100) / 100)

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

    // Aucun encaissement à la vente : le reste à charge se règle au retrait.
    addSale({
      client: client.trim(),
      lunettes_montant: parseEuro(luM),
      lentilles_montant: parseEuro(leM),
      reste: resteNum,
      mutuelle_nom: mutuelleNom,
      plateforme,
      vendor,
      facture,
      payments: [],
    })
    reset()
    notify('Vente enregistrée')
  }

  const showMutuelle = partMutuelle > 0

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

      {/* Total en gros */}
      <div className="total-hero">
        <span className="total-hero-lbl">Total de la vente</span>
        <span className="total-hero-val">{euro(total)}</span>
      </div>

      {/* Reste à charge (réglé au retrait) + part mutuelle */}
      <div className="grid-2">
        <div className="field">
          <label htmlFor="sf-reste">Reste à charge (€)</label>
          <input id="sf-reste" className="input input-euro" inputMode="decimal"
            value={reste} onChange={(e) => setReste(e.target.value)} placeholder="0" />
          <span className="hint">Réglé par le client au retrait — retrouvé dans « Reste à charge ».</span>
        </div>
        <div className="field">
          <label>Part mutuelle (€)</label>
          <div className="input input-euro readonly-val">{euro(partMutuelle)}</div>
        </div>
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
