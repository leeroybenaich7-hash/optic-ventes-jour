import React, { useState } from 'react'
import {
  LayoutDashboard,
  Send,
  Wallet,
  CalendarDays,
  Settings,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { useStore, pendingTeletrans, pendingDue } from './lib/store.jsx'
import { fmtDay, today } from './lib/format.js'
import { APP_VERSION } from './lib/config.js'
import Lockscreen from './components/Lockscreen.jsx'
import Dashboard from './components/Dashboard.jsx'
import Teletrans from './components/Teletrans.jsx'
import Encaissements from './components/Encaissements.jsx'
import Historique from './components/Historique.jsx'
import Reglages from './components/Reglages.jsx'

const TABS = [
  { id: 'jour', label: 'Ventes du jour', icon: LayoutDashboard },
  { id: 'teletrans', label: 'À facturer', icon: Send },
  { id: 'encaisser', label: 'Reste à charge', icon: Wallet },
  { id: 'historique', label: 'Historique', icon: CalendarDays },
  { id: 'reglages', label: 'Réglages', icon: Settings },
]

export default function App() {
  const { ready, unlocked, sales, toast, online } = useStore()
  const [tab, setTab] = useState('jour')

  if (!ready) return null
  if (!unlocked) return <Lockscreen />

  const nbTeletrans = pendingTeletrans(sales).length
  const nbDue = pendingDue(sales).length

  return (
    <div>
      <header className="topbar">
        <div className="wrap topbar-in">
          <div className="brand">
            <span className="brand-name">Optic City</span>
            <span className="brand-sub">Ventes du jour</span>
          </div>
          <span className="topbar-date">{fmtDay(today())}</span>
        </div>
        <div className="sunset-rule" />
        <div className="wrap ribbon">
          <button
            type="button"
            className={'ribbon-item ' + (nbTeletrans ? 'alert' : 'calm')}
            onClick={() => setTab('teletrans')}
          >
            {nbTeletrans ? <AlertTriangle className="lucide" size={15} /> : <CheckCircle2 className="lucide" size={15} />}
            {nbTeletrans ? (
              <span>
                <strong>{nbTeletrans}</strong> facture{nbTeletrans > 1 ? 's' : ''} mutuelle à faire
              </span>
            ) : (
              <span>Facturation à jour</span>
            )}
          </button>
          <span className="ribbon-sep" />
          <button
            type="button"
            className={'ribbon-item ' + (nbDue ? 'alert' : 'calm')}
            onClick={() => setTab('encaisser')}
          >
            {nbDue ? <AlertTriangle className="lucide" size={15} /> : <CheckCircle2 className="lucide" size={15} />}
            {nbDue ? (
              <span>
                <strong>{nbDue}</strong> reste{nbDue > 1 ? 's' : ''} à charge à encaisser
              </span>
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
              const count =
                t.id === 'teletrans' ? nbTeletrans : t.id === 'encaisser' ? nbDue : 0
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
        {tab === 'jour' && <Dashboard />}
        {tab === 'teletrans' && <Teletrans />}
        {tab === 'encaisser' && <Encaissements />}
        {tab === 'historique' && <Historique />}
        {tab === 'reglages' && <Reglages />}
      </main>

      <footer className="wrap small muted" style={{ paddingBottom: 24 }}>
        Optic City — Sarcelles · v{APP_VERSION}
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
