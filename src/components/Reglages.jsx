import React, { useState } from 'react'
import { Trash2, Plus, KeyRound, Download } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { today } from '../lib/format.js'
import { APP_VERSION } from '../lib/config.js'

function ListEditor({ title, sub, items, onSave, addLabel, confirmMsg }) {
  const [draft, setDraft] = useState('')

  function add(e) {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    if (items.some((it) => it.toLowerCase() === v.toLowerCase())) {
      setDraft('')
      return
    }
    onSave([...items, v], `« ${v} » ajouté`)
    setDraft('')
  }

  function remove(item) {
    if (!window.confirm(confirmMsg(item))) return
    onSave(items.filter((it) => it !== item), `« ${item} » retiré`)
  }

  return (
    <div className="card">
      <div className="card-title">{title}</div>
      {sub && <div className="card-sub">{sub}</div>}
      <div className="stack">
        {items.map((item) => (
          <div key={item} className="row-between">
            <span>{item}</span>
            <button
              type="button"
              className="btn-icon"
              aria-label={`Retirer ${item}`}
              onClick={() => remove(item)}
            >
              <Trash2 className="lucide" size={16} />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="muted small">La liste est vide pour l’instant.</p>}
        <form onSubmit={add} className="row">
          <input
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={addLabel}
            aria-label={addLabel}
          />
          <button type="submit" className="btn btn-ghost">
            <Plus className="lucide" size={17} />
            Ajouter
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Reglages() {
  const { online, sales, settings, saveSettings, notify } = useStore()
  const [newCode, setNewCode] = useState('')
  const [codeError, setCodeError] = useState('')

  function changeCode(e) {
    e.preventDefault()
    const code = newCode.trim()
    if (!/^\d{4,}$/.test(code)) {
      setCodeError('Le code doit contenir au moins 4 chiffres.')
      return
    }
    saveSettings({ accessCode: code })
    setNewCode('')
    setCodeError('')
    notify('Code d’accès changé')
  }

  function downloadBackup() {
    const blob = new Blob(
      [JSON.stringify({ sales, settings }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ventes-optic-city-${today()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    notify('Sauvegarde téléchargée')
  }

  return (
    <div className="stack">
      <ListEditor
        title="Équipe"
        sub="Les prénoms proposés quand on enregistre une vente."
        items={settings.vendors}
        addLabel="Prénom à ajouter"
        confirmMsg={(v) => `Retirer ${v} de l’équipe ? Ses ventes déjà enregistrées ne bougent pas.`}
        onSave={(vendors, msg) => {
          saveSettings({ vendors })
          notify(msg)
        }}
      />

      <ListEditor
        title="Moyens de paiement"
        sub="Les choix proposés au moment d’encaisser."
        items={settings.methods}
        addLabel="Moyen de paiement à ajouter"
        confirmMsg={(m) => `Retirer le moyen de paiement « ${m} » ?`}
        onSave={(methods, msg) => {
          saveSettings({ methods })
          notify(msg)
        }}
      />

      <div className="card">
        <div className="card-title">Code d’accès</div>
        <form onSubmit={changeCode} className="stack">
          <div className="row">
            <input
              className="input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Nouveau code (4 chiffres minimum)"
              aria-label="Nouveau code d'accès"
              value={newCode}
              onChange={(e) => {
                setNewCode(e.target.value)
                setCodeError('')
              }}
            />
            <button type="submit" className="btn">
              <KeyRound className="lucide" size={17} />
              Changer le code
            </button>
          </div>
          {codeError && <p className="small" style={{ color: 'var(--red)' }}>{codeError}</p>}
          <p className="hint">Le code sera demandé à l’ouverture de l’app.</p>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Données</div>
        <div className="stack">
          <div className="row">
            {online ? (
              <span className="pill pill-ok">Données en ligne (Supabase) — partagées entre les postes</span>
            ) : (
              <span className="pill pill-wait">Mode local : les données restent sur ce PC</span>
            )}
          </div>
          {!online && (
            <p className="hint">
              Pour partager les données entre plusieurs postes, remplissez le fichier
              src/lib/config.js avec les clés Supabase (voir le README).
            </p>
          )}
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={downloadBackup}>
              <Download className="lucide" size={17} />
              Télécharger une sauvegarde
            </button>
          </div>
          <p className="hint">
            La sauvegarde contient toutes les ventes et les réglages, dans un fichier daté.
          </p>
        </div>
      </div>

      <p className="small muted">Version {APP_VERSION}</p>
    </div>
  )
}
