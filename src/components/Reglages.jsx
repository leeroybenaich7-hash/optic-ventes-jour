import React, { useState } from 'react'
import { Trash2, Plus, KeyRound, Download } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { today } from '../lib/format.js'
import { APP_VERSION } from '../lib/config.js'

// Référencement mutuelle -> plateforme de tiers payant.
// Regroupé par plateforme pour bien voir « qui facture où ».
function MutuellesEditor({ plateformes, mutuelles, onSave }) {
  const [nom, setNom] = useState('')
  const [plat, setPlat] = useState(plateformes[0] || '')

  function add(e) {
    e.preventDefault()
    const n = nom.trim()
    if (!n || !plat) return
    const rest = mutuelles.filter((m) => m.nom.toLowerCase() !== n.toLowerCase())
    onSave([...rest, { nom: n, plateforme: plat }], `« ${n} » → ${plat}`)
    setNom('')
  }

  function remove(m) {
    if (!window.confirm(`Retirer « ${m.nom} » du référencement ?`)) return
    onSave(mutuelles.filter((x) => x.nom !== m.nom), `« ${m.nom} » retiré`)
  }

  const groupes = plateformes
    .map((p) => ({
      plateforme: p,
      items: mutuelles
        .filter((m) => m.plateforme === p)
        .slice()
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    }))
    .filter((g) => g.items.length > 0)

  const orphelines = mutuelles.filter((m) => !plateformes.includes(m.plateforme))

  return (
    <div className="card">
      <div className="card-title">Mutuelles & plateformes</div>
      <div className="card-sub">
        Le lien entre chaque mutuelle et sa plateforme de tiers payant. En vente,
        choisir la mutuelle remplit la plateforme toute seule.
      </div>
      <p className="hint" style={{ marginTop: -6, marginBottom: 14 }}>
        ⚠ Liste de départ à vérifier : le rattachement peut changer. Corrigez-la
        avec vos vraies mutuelles.
      </p>

      <div className="stack">
        {groupes.map((g) => (
          <div key={g.plateforme}>
            <div className="row" style={{ gap: 8, marginBottom: 6 }}>
              <span className="pill pill-teal">{g.plateforme}</span>
              <span className="small muted">{g.items.length} mutuelle{g.items.length > 1 ? 's' : ''}</span>
            </div>
            <div className="chips">
              {g.items.map((m) => (
                <span className="chip" key={m.nom}>
                  {m.nom}
                  <button type="button" className="chip-x" aria-label={`Retirer ${m.nom}`} onClick={() => remove(m)}>
                    <Trash2 className="lucide" size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}

        {orphelines.length > 0 && (
          <div>
            <div className="row" style={{ gap: 8, marginBottom: 6 }}>
              <span className="pill pill-no">Sans plateforme connue</span>
            </div>
            <div className="chips">
              {orphelines.map((m) => (
                <span className="chip" key={m.nom}>
                  {m.nom} <span className="muted">({m.plateforme || '—'})</span>
                  <button type="button" className="chip-x" aria-label={`Retirer ${m.nom}`} onClick={() => remove(m)}>
                    <Trash2 className="lucide" size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={add} className="stack" style={{ gap: 8 }}>
          <div className="field">
            <label>Ajouter une mutuelle</label>
            <input className="input" value={nom} onChange={(e) => setNom(e.target.value)}
              placeholder="Nom de la mutuelle" />
          </div>
          <div className="field">
            <label>Sur quelle plateforme ?</label>
            <div className="seg">
              {plateformes.map((p) => (
                <button type="button" key={p}
                  className={'seg-btn' + (plat === p ? ' active' : '')}
                  onClick={() => setPlat(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <button type="submit" className="btn btn-ghost">
              <Plus className="lucide" size={17} />
              Ajouter au référencement
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
        title="Plateformes tiers payant"
        sub="Les plateformes proposées quand une vente a une part mutuelle (Viamedis, Almerys…)."
        items={settings.plateformes || []}
        addLabel="Plateforme à ajouter"
        confirmMsg={(p) => `Retirer la plateforme « ${p} » ?`}
        onSave={(plateformes, msg) => {
          saveSettings({ plateformes })
          notify(msg)
        }}
      />

      <MutuellesEditor
        plateformes={settings.plateformes || []}
        mutuelles={settings.mutuelles || []}
        onSave={(mutuelles, msg) => {
          saveSettings({ mutuelles })
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
