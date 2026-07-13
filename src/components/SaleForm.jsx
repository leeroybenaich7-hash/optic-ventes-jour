// Formulaire de saisie d'une vente — pensé pour aller vite (< 10 s).
// Le reste à charge se calcule tout seul (prix − mutuelle) mais reste
// modifiable, et le montant encaissé se pré-remplit avec le reste à charge.
import React, { useRef, useState } from 'react'
import { Glasses, Eye, Check } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { parseEuro, uid } from '../lib/format.js'

// nombre -> texte de champ € ("120" ou "120,50")
function toInput(n) {
  const r = Math.round((Number(n) || 0) * 100) / 100
  if (r <= 0) return ''
  return Number.isInteger(r) ? String(r) : String(r).replace('.', ',')
}

export default function SaleForm() {
  const { settings, addSale, notify } = useStore()
  const clientRef = useRef(null)

  const [client, setClient] = useState('')
  const [type, setType] = useState(null)
  const [price, setPrice] = useState('')
  const [mutuelle, setMutuelle] = useState('')
  const [reste, setReste] = useState('')
  const [encaisse, setEncaisse] = useState('')
  const [method, setMethod] = useState(settings.methods[0] || 'CB')
  const [vendor, setVendor] = useState(null)
  const [teletrans, setTeletrans] = useState(false)

  // tant que la caissière n'a pas touché ces champs à la main,
  // ils suivent le calcul automatique
  const [resteTouched, setResteTouched] = useState(false)
  const [encTouched, setEncTouched] = useState(false)

  function recompute(nextPrice, nextMutuelle) {
    const auto = Math.max(0, parseEuro(nextPrice) - parseEuro(nextMutuelle))
    if (!resteTouched) {
      const txt = toInput(auto)
      setReste(txt)
      if (!encTouched) setEncaisse(txt)
    }
  }

  function onPrice(v) {
    setPrice(v)
    recompute(v, mutuelle)
  }
  function onMutuelle(v) {
    setMutuelle(v)
    recompute(price, v)
  }
  function onReste(v) {
    setReste(v)
    setResteTouched(true)
    if (!encTouched) setEncaisse(v)
  }
  function onEncaisse(v) {
    setEncaisse(v)
    setEncTouched(true)
  }

  function reset() {
    setClient('')
    setType(null)
    setPrice('')
    setMutuelle('')
    setReste('')
    setEncaisse('')
    setMethod(settings.methods[0] || 'CB')
    setVendor(null)
    setTeletrans(false)
    setResteTouched(false)
    setEncTouched(false)
    clientRef.current?.focus()
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!client.trim()) {
      notify('Indiquez le nom du client')
      clientRef.current?.focus()
      return
    }
    if (!type) {
      notify('Choisissez le type : lunettes ou lentilles')
      return
    }
    if (parseEuro(price) <= 0) {
      notify('Indiquez le prix total de la vente')
      return
    }
    if (!vendor) {
      notify('Choisissez le vendeur')
      return
    }

    const montant = parseEuro(encaisse)
    addSale({
      client: client.trim(),
      type,
      price: parseEuro(price),
      mutuelle: parseEuro(mutuelle),
      reste: parseEuro(reste),
      vendor,
      teletrans: parseEuro(mutuelle) > 0 ? teletrans : false,
      payments:
        montant > 0
          ? [{ id: uid(), at: new Date().toISOString(), amount: montant, method }]
          : [],
    })
    reset()
    notify('Vente enregistrée')
  }

  const showMethod = parseEuro(encaisse) > 0
  const showTeletrans = parseEuro(mutuelle) > 0

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

      <div className="field">
        <label>Type de vente</label>
        <div className="seg">
          <button
            type="button"
            className={'seg-btn big' + (type === 'lunettes' ? ' active' : '')}
            onClick={() => setType('lunettes')}
          >
            <Glasses className="lucide" size={17} />
            Lunettes
          </button>
          <button
            type="button"
            className={'seg-btn big' + (type === 'lentilles' ? ' active' : '')}
            onClick={() => setType('lentilles')}
          >
            <Eye className="lucide" size={17} />
            Lentilles
          </button>
        </div>
      </div>

      <div className="grid-3">
        <div className="field">
          <label htmlFor="sf-price">Prix total (€)</label>
          <input
            id="sf-price"
            className="input input-euro"
            inputMode="decimal"
            value={price}
            onChange={(e) => onPrice(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="field">
          <label htmlFor="sf-mutuelle">Part mutuelle (€)</label>
          <input
            id="sf-mutuelle"
            className="input input-euro"
            inputMode="decimal"
            value={mutuelle}
            onChange={(e) => onMutuelle(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="field">
          <label htmlFor="sf-reste">Reste à charge (€)</label>
          <input
            id="sf-reste"
            className="input input-euro"
            inputMode="decimal"
            value={reste}
            onChange={(e) => onReste(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="sf-encaisse">Montant encaissé aujourd'hui (€)</label>
        <input
          id="sf-encaisse"
          className="input input-euro"
          inputMode="decimal"
          value={encaisse}
          onChange={(e) => onEncaisse(e.target.value)}
          placeholder="0"
        />
        <span className="hint">S'il paie moins, le reste passe dans À encaisser</span>
      </div>

      {showMethod && (
        <div className="field">
          <label>Moyen de paiement</label>
          <div className="seg">
            {settings.methods.map((m) => (
              <button
                type="button"
                key={m}
                className={'seg-btn' + (method === m ? ' active' : '')}
                onClick={() => setMethod(m)}
              >
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
            <button
              type="button"
              key={v}
              className={'seg-btn' + (vendor === v ? ' active' : '')}
              onClick={() => setVendor(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {showTeletrans && (
        <label className="check">
          <input
            type="checkbox"
            checked={teletrans}
            onChange={(e) => setTeletrans(e.target.checked)}
          />
          Télétransmission mutuelle déjà faite
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
