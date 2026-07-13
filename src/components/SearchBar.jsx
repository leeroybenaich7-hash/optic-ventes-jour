// Petite barre de recherche par client, réutilisée dans les onglets
// Reste à charge, Paiements mutuelle et Historique.
import React from 'react'
import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Rechercher un client…' }) {
  return (
    <div className="searchbar">
      <Search className="lucide" size={16} />
      <input
        className="searchbar-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button type="button" className="searchbar-x" onClick={() => onChange('')} aria-label="Effacer la recherche">
          <X className="lucide" size={15} />
        </button>
      )}
    </div>
  )
}
