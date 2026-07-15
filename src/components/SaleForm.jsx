// Formulaire de saisie d'une vente, dédié à UN type (lunettes OU
// lentilles) — deux carrés côte à côte sur le tableau de bord.
// On tape le prix total de l'équipement et la part mutuelle ;
// le reste à charge se calcule tout seul (0 s'il n'y en a pas).
// Le client ne paie rien à la vente : le reste à charge se règle
// au retrait (il part dans l'onglet « Reste à charge »).
import React, { useMemo, useRef, useState } from 'react'
import { Glasses, Eye, Check } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { euro, parseEuro, uid } from '../lib/format.js'

export default function SaleForm({ type }) {
  const { settings, addSale, notify } = useStore()
  const clientRef = useRef(null)
  const estLunettes = type === 'lunettes'
  const titre = estLunettes ? 'Nouvelle vente Lunettes' : 'Nouvelle vente Lentilles'
  const Icon = estLunettes ? Glasses : Eye

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [prix, setPrix] = useState('')
  const [mutuelle, setMutuelle] = useState('')
  const [plateforme, setPlateforme] = useState('')
  const [mutuelleNom, setMutuelleNom] = useState('')
  const [autreMut, setAutreMut] = useState(false)
  const [vendor, setVendor] = useState(null)
  const [facture, setFacture] = useState(false)
  const [acompte, setAcompte] = useState('')
  const [method, setMethod] = useState(settings.methods[0] || 'Espèces')

  const prixNum = parseEuro(prix)
  const mutNum = Math.min(prixNum, parseEuro(mutuelle))
  const reste = Math.max(0, Math.round((prixNum - mutNum) * 100) / 100)
  const acompteNum = Math.min(reste, Math.max(0, parseEuro(acompte)))
  const soldeRetrait = Math.max(0, Math.round((reste - acompteNum) * 100) / 100)

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
    setNom(''); setPrenom('')
    setPrix(''); setMutuelle('')
    setPlateforme(''); setMutuelleNom(''); setAutreMut(false)
    setVendor(null)
    setFacture(false)
    setAcompte('')
    setMethod(settings.methods[0] || 'Espèces')
    clientRef.current?.focus()
  }

  const clientName = [nom.trim(), prenom.trim()].filter(Boolean).join(' ')

  function onSubmit(e) {
    e.preventDefault()
    if (!nom.trim()) {
      notify('Indiquez le nom du client')
      clientRef.current?.focus()
      return
    }
    if (prixNum <= 0) {
      notify('Indiquez le prix total de l’équipement')
      return
    }
    if (mutNum > 0 && !plateforme) {
      notify('Choisissez la plateforme de tiers payant')
      return
    }
    if (mutNum > 0 && !mutuelleNom.trim()) {
      notify('Choisissez la mutuelle du client')
      return
    }
    if (!vendor) {
      notify('Choisissez le vendeur')
      return
    }

    addSale({
      client: clientName,
      lunettes_montant: estLunettes ? prixNum : 0,
      lentilles_montant: estLunettes ? 0 : prixNum,
      reste,
      mutuelle_nom: mutuelleNom,
      plateforme,
      vendor,
      facture,
      payments:
        acompteNum > 0
          ? [{ id: uid(), at: new Date().toISOString(), amount: acompteNum, method }]
          : [],
    })
    reset()
    notify(estLunettes ? 'Vente lunettes enregistrée' : 'Vente lentilles enregistrée')
  }

  const showMutuelle = mutNum > 0

  return (
    <div className="card">
      <h2 className="card-title">
        <Icon className="lucide" size={20} style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--accent)' }} />
        {titre}
      </h2>
      <form className="stack" onSubmit={onSubmit}>
        <div className="grid-2">
          <div className="field">
            <label>Nom</label>
            <input ref={clientRef} className="input" value={nom}
              onChange={(e) => setNom(e.target.value)} placeholder="Ex. Cohen" />
          </div>
          <div className="field">
            <label>Prénom</label>
            <input className="input" value={prenom}
              onChange={(e) => setPrenom(e.target.value)} placeholder="Ex. Sarah" />
          </div>
        </div>

        <div className="field">
          <label>Prix total de l’équipement (€)</label>
          <input className="input input-euro" inputMode="decimal" value={prix}
            onChange={(e) => setPrix(e.target.value)} placeholder="0" />
        </div>

        <div className="field">
          <label>Part mutuelle (€)</label>
          <input className="input input-euro" inputMode="decimal" value={mutuelle}
            onChange={(e) => setMutuelle(e.target.value)} placeholder="0" />
        </div>

        <div className="field">
          <label>Reste à charge (€)</label>
          <div className="input input-euro readonly-val">{euro(reste)}</div>
          <span className="hint">Calculé (prix − mutuelle).</span>
        </div>

        {reste > 0 && (
          <div className="field">
            <label>Acompte versé aujourd'hui (€)</label>
            <input className="input input-euro" inputMode="decimal" value={acompte}
              onChange={(e) => setAcompte(e.target.value)} placeholder="0" />
            <span className="hint">
              Facultatif — ce que le client règle à la commande. Solde à encaisser au retrait : {euro(soldeRetrait)}.
            </span>
          </div>
        )}

        {acompteNum > 0 && (
          <div className="field">
            <label>Moyen de paiement de l'acompte</label>
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
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}
