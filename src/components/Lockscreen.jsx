import React, { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useStore } from '../lib/store.jsx'

export default function Lockscreen() {
  const { unlock } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (!unlock(code)) {
      setError(true)
      setCode('')
    }
  }

  return (
    <div className="lock">
      <div className="lock-card">
        <div className="lock-title">Optic City</div>
        <div className="lock-sub">Ventes du jour</div>
        <form onSubmit={submit} className="stack">
          <input
            className="input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="Code"
            aria-label="Code d'accès"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setError(false)
            }}
          />
          <button type="submit" className="btn" style={{ width: '100%' }}>
            <LogIn className="lucide" size={17} />
            Entrer
          </button>
        </form>
        {error && <div className="lock-error">Code incorrect</div>}
      </div>
    </div>
  )
}
