// Recherche d'un client : retrouve tous ses dossiers (toutes dates),
// avec montants et statuts (facturation, paiement mutuelle, reste à charge).
import React, { useMemo } from 'react'
import { Search } from 'lucide-react'
import { useStore, dueOf } from '../lib/store.jsx'
import { euro } from '../lib/format.js'
import SalesTable from './SalesTable.jsx'

// enlève accents + minuscules pour une recherche tolérante
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export default function Recherche({ query }) {
  const { sales } = useStore()
  const q = norm(query)

  const results = useMemo(() => {
    if (!q) return []
    return sales
      .filter((s) => norm(s.client).includes(q) || norm(s.mutuelle_nom).includes(q))
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }, [sales, q])

  const totalDue = results.reduce((s, v) => s + dueOf(v), 0)
  const totalMut = results.reduce(
    (s, v) => s + ((Number(v.mutuelle) || 0) > 0 && !v.mutuelle_paid ? Number(v.mutuelle) : 0),
    0
  )

  return (
    <div className="card">
      <h2 className="card-title">Recherche « {query} »</h2>
      {results.length === 0 ? (
        <div className="empty">
          <Search className="lucide" />
          <p>Aucun dossier trouvé pour ce nom.</p>
        </div>
      ) : (
        <>
          <p className="card-sub">
            {results.length} dossier{results.length > 1 ? 's' : ''} ·{' '}
            {euro(totalDue)} de reste à charge · {euro(totalMut)} en attente des mutuelles
          </p>
          <SalesTable sales={results} />
        </>
      )}
    </div>
  )
}
