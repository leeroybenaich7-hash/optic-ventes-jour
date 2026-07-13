// Formulaire de saisie d'une vente — pensé pour aller vite.
// Deux postes possibles (lunettes / lentilles), chacun avec son
// montant et son reste à charge. Le total, le reste à charge total
// et la part mutuelle se calculent tout seuls. En choisissant la
// mutuelle, la plateforme de tiers payant se remplit automatiquement.
import React, { useMemo, useRef, useState } from 'react'
import { Glasses, Eye, Check } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { euro, parseEuro, uid } from '../lib/format.js'

export default function SaleForm() {
  const { settings, addSale, notify } = useStore()
  const clientRef = useRef(null)

  const [client, setClient] = useState('')
  const [luM, setLuM] = useState('')
  const [luR, setLuR] = useState('')
  const [leM, setLeM] = useState('')
  const [leR, setLeR] = useState('')
  const [mutuelleNom, setMutuelleNom] = useState('')
  const [plateforme, setPlateforme] = useState('')
  const [encaisse, setEncaisse] = useState('')
  const [encTouched, setEncTouched] = useState(false)
  const [method, setMethod] = useState(settings.methods[0] || 'CB')
  const [vendor, setVendor] = useState(null)
  const [facture, setFacture] = useState(false)

  const total = parseEuro(luM) + parseEuro(leM)
  const resteTotal = parseEuro(luR) + parseEuro(leR)
  const partMutuelle = Math.max(0, Math.round((total - resteTotal) * 100) / 100)

  // reste à charge par défaut à encaisser = reste total (modifiable)
  const encaisseShown = encTouched ? encaisse : (resteTotal > 0 ? toInput(resteTotal) : '')

  // index nom de mutuelle -> plateforme (référencement des Réglages)
  const refMap = useMemo(() => {
    const m = new Map()
    ;(settings.mutuelles || []).forEach((x) => m.set(x.nom.toLowerCase(), x.plateforme))
    return m
  }, [settings.mutuelles])

  function onMutuelleNom(v) {
    setMutuelleNom(v)
    const p = refMap.get(v.trim().toLowerCase())
    if (p) setPlateforme(p) // auto-remplissage si la mutuelle est référencée
  }

  function reset() {
    setClient('')
    setLuM(''); setLuR(''); setLeM(''); setLeR('')
    setMutuelleNom(''); setPlateforme('')
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
    if (partMutuelle > 0 && !mutuelleNom.trim()) {
      notify('Indiquez la mutuelle du client')
      return
    }
    if (partMutuelle > 0 && !plateforme) {
      notify('Choisissez la plateforme de tiers payant')
      return
    }
    if (!vendor) {
      notify('Choisissez le vendeur')
      return
    }

    const montant = encTouched ? parseEuro(encaisse) : resteTotal
    addSale({
      client: client.trim(),
      lunettes_montant: parseEuro(luM),
      lunettes_reste: parseEuro(luR),
      lentilles_montant: parseEuro(leM),
      lentilles_reste: parseEuro(leR),
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
        <input
          id="sf-client"
          ref={clientRef}
          className="input"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Ex. Mme Cohen"
          autoFocus
        />
      </div>

      {/* Poste lunettes */}
      <div className="poste">
        <div className="poste-head">
          <Glasses className="lucide" size={18} />
          <span>Lunettes</span>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="sf-lum">Montant (€)</label>
            <input id="sf-lum" className="input input-euro" inputMode="decimal"
              value={luM} onChange={(e) => setLuM(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label htmlFor="sf-lur">Reste à charge (€)</label>
            <input id="sf-lur" className="input input-euro" inputMode="decimal"
              value={luR} onChange={(e) => setLuR(e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      {/* Poste lentilles */}
      <div className="poste">
        <div className="poste-head">
          <Eye className="lucide" size={18} />
          <span>Lentilles</span>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="sf-lem">Montant (€)</label>
            <input id="sf-lem" className="input input-euro" inputMode="decimal"
              value={leM} onChange={(e) => setLeM(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label htmlFor="sf-ler">Reste à charge (€)</label>
            <input id="sf-ler" className="input input-euro" inputMode="decimal"
              value={leR} onChange={(e) => setLeR(e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      {/* Récap calculé */}
      <div className="recap">
        <div><span className="recap-lbl">Total</span><span className="recap-val">{euro(total)}</span></div>
        <div><span className="recap-lbl">Reste à charge</span><span className="recap-val">{euro(resteTotal)}</span></div>
        <div><span className="recap-lbl">Part mutuelle</span><span className="recap-val">{euro(partMutuelle)}</span></div>
      </div>

      {/* Mutuelle + plateforme (si part mutuelle) */}
      {showMutuelle && (
        <>
          <div className="field">
            <label htmlFor="sf-mut">Mutuelle (obligatoire)</label>
            <input
              id="sf-mut"
              className="input"
              list="mutuelles-list"
              value={mutuelleNom}
              onChange={(e) => onMutuelleNom(e.target.value)}
              placeholder="Tapez ou choisissez la mutuelle"
              autoComplete="off"
            />
            <datalist id="mutuelles-list">
              {(settings.mutuelles || []).map((m) => (
                <option key={m.nom} value={m.nom}>{m.plateforme}</option>
              ))}
            </datalist>
            <span className="hint">La plateforme se remplit toute seule si la mutuelle est connue.</span>
          </div>
          <div className="field">
            <label>Plateforme de tiers payant (obligatoire)</label>
            <div className="seg">
              {(settings.plateformes || []).map((p) => (
                <button type="button" key={p}
                  className={'seg-btn' + (plateforme === p ? ' active' : '')}
                  onClick={() => setPlateforme(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Encaissement du reste à charge */}
      <div className="field">
        <label htmlFor="sf-encaisse">Encaissé aujourd'hui (€)</label>
        <input
          id="sf-encaisse"
          className="input input-euro"
          inputMode="decimal"
          value={encaisseShown}
          onChange={(e) => { setEncaisse(e.target.value); setEncTouched(true) }}
          placeholder="0"
        />
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

// nombre -> texte de champ € ("120" ou "120,5")
function toInput(n) {
  const r = Math.round((Number(n) || 0) * 100) / 100
  if (r <= 0) return ''
  return Number.isInteger(r) ? String(r) : String(r).replace('.', ',')
}
