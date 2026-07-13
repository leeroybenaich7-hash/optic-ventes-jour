import React, { useState } from 'react'
import {
  LayoutDashboard,
  Send,
  BadgeEuro,
  Wallet,
  CalendarDays,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
} from 'lucide-react'
import {
  useStore,
  pendingFacture,
  pendingMutuellePaid,
  pendingDue,
} from './lib/store.jsx'
import { fmtDay, today } from './lib/format.js'
import { APP_VERSION } from './lib/config.js'
import Lockscreen from './components/Lockscreen.jsx'
import Dashboard from './components/Dashboard.jsx'
import AFacturer from './components/AFacturer.jsx'
import PaiementsMutuelle from './components/PaiementsMutuelle.jsx'
import Encaissements from './components/Encaissements.jsx'
import Historique from './components/Historique.jsx'
import Reglages from './components/Reglages.jsx'
import Recherche from './components/Recherche.jsx'

const TABS = [
  { id: 'jour', label: 'Ventes du jour', icon: LayoutDashboard },
  { id: 'facturer', label: 'À facturer', icon: Send },
  { id: 'paiements', label: 'Paiements mutuelle', icon: BadgeEuro },
  { id: 'reste', label: 'Reste à charge', icon: Wallet },
  { id: 'historique', label: 'Historique', icon: CalendarDays },
  { id: 'reglages', label: 'Réglages', icon: Settings },
]

export default function App() {
  const { ready, unlocked, sales, toast, online } = useStore()
  const [tab, setTab] = useState('jour')
  const [search, setSearch] = useState('')

  if (!ready) return null
  if (!unlocked) return <Lockscreen />

  const searching = search.trim().length > 0

  const nbFacturer = pendingFacture(sales).length
  const nbPaiements = pendingMutuellePaid(sales).length
  const nbDue = pendingDue(sales).length

  const badgeFor = (id) =>
    id === 'facturer' ? nbFacturer : id === 'paiements' ? nbPaiements : id === 'reste' ? nbDue : 0

  return (
    <div>
      <header className="topbar">
        <div className="wrap topbar-in">
          <div className="brand">
            <span className="brand-name">Optic City</span>
            <span className="brand-sub">Ventes du jour</span>
          </div>
          <div className="topbar-search">
            <Search className="lucide" size={16} />
            <input
              className="topbar-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client…"
              aria-label="Rechercher un client"
            />
            {searching && (
              <button type="button" className="topbar-search-x" onClick={() => setSearch('')} aria-label="Effacer la recherche">
                <X className="lucide" size={15} />
              </button>
            )}
          </div>
          <span className="topbar-date">{fmtDay(today())}</span>
        </div>
        <div className="sunset-rule" />
        <div className="wrap ribbon">
          <button
            type="button"
            className={'ribbon-item ' + (nbFacturer ? 'alert' : 'calm')}
            onClick={() => setTab('facturer')}
          >
            {nbFacturer ? <AlertTriangle className="lucide" size={15} /> : <CheckCircle2 className="lucide" size={15} />}
            {nbFacturer ? (
              <span><strong>{nbFacturer}</strong> à facturer</span>
            ) : (
              <span>Facturation à jour</span>
            )}
          </button>
          <span className="ribbon-sep" />
          <button
            type="button"
            className={'ribbon-item ' + (nbPaiements ? 'wait-txt' : 'calm')}
            onClick={() => setTab('paiements')}
          >
            <BadgeEuro className="lucide" size={15} />
            <span><strong>{nbPaiements}</strong> paiement{nbPaiements > 1 ? 's' : ''} mutuelle en attente</span>
          </button>
          <span className="ribbon-sep" />
          <button
            type="button"
            className={'ribbon-item ' + (nbDue ? 'alert' : 'calm')}
            onClick={() => setTab('reste')}
          >
            {nbDue ? <AlertTriangle className="lucide" size={15} /> : <CheckCircle2 className="lucide" size={15} />}
            {nbDue ? (
              <span><strong>{nbDue}</strong> reste{nbDue > 1 ? 's' : ''} à charge</span>
            ) : (
              <span>Tout est encaissé</span>
            )}
          </button>
          <span className="spacer" />
          <span className="ribbon-item calm small">
            {online ? 'Données en ligne' : 'Mode local (ce poste)'}
          </span>
        </div>
        <div className="wrap">
          <nav className="tabs">
            {TABS.map((t) => {
              const Icon = t.icon
              const count = badgeFor(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={'tab' + (tab === t.id ? ' active' : '')}
                  onClick={() => setTab(t.id)}
                >
                  <Icon className="lucide" size={16} />
                  {t.label}
                  {count > 0 && <span className="badge-count">{count}</span>}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="wrap main">
        {searching ? (
          <Recherche query={search.trim()} />
        ) : (
          <>
            {tab === 'jour' && <Dashboard />}
            {tab === 'facturer' && <AFacturer />}
            {tab === 'paiements' && <PaiementsMutuelle />}
            {tab === 'reste' && <Encaissements />}
            {tab === 'historique' && <Historique />}
            {tab === 'reglages' && <Reglages />}
          </>
        )}
      </main>

      <footer className="wrap small muted" style={{ paddingBottom: 24 }}>
        Optic City — Sarcelles · v{APP_VERSION}
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
