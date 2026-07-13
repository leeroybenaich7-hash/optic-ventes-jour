// ============================================================
// MOTEUR DE DONNÉES
// - Si Supabase est configuré (lib/config.js) : lecture/écriture
//   en ligne + temps réel entre les postes.
// - Sinon : tout est stocké dans le navigateur (localStorage),
//   l'app marche immédiatement, un seul poste.
// Les composants ne parlent JAMAIS à Supabase directement :
// ils passent par useStore().
// ============================================================
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { supabase } from './supabase.js'
import { today, uid } from './format.js'
import { MUTUELLES_DEPART } from './mutuelles.js'

const LS_SALES = 'ocvj_sales'
const LS_SETTINGS = 'ocvj_settings'
const LS_UNLOCKED = 'ocvj_unlocked'

export const DEFAULT_SETTINGS = {
  vendors: ['Maman', 'Binesa', 'Nadia'],
  methods: ['Espèces', 'Carte bancaire', 'Alma', 'Chèque'],
  // Plateformes de tiers payant (les « portails » sur lesquels on facture)
  plateformes: ['Viamedis', 'Almerys', 'Santéclair', 'Itelis', 'Carte Blanche', 'Kalixia', 'Sévéane', 'Actil'],
  // Référencement : quelle mutuelle passe par quelle plateforme.
  // Liste de départ « à vérifier » — modifiable dans Réglages.
  mutuelles: MUTUELLES_DEPART,
  accessCode: '1234',
}

/*
Forme d'une vente :
{
  id, day:'YYYY-MM-DD', created_at:ISO,
  client,
  // Deux postes, chacun optionnel (un client peut prendre les deux) :
  lunettes_montant, lentilles_montant,  // € vendus par poste
  // Totaux calculés et stockés à l'enregistrement :
  price,        // = lunettes_montant + lentilles_montant
  reste,        // reste à charge client, UNIQUE, sur le total
  mutuelle,     // = price - reste (part prise en charge par la mutuelle)
  mutuelle_nom, // organisme (ex. Harmonie Mutuelle)
  plateforme,   // tiers payant sur lequel on facture (ex. Viamedis)
  vendor,
  facture:bool, facture_at,           // étape 2 : dossier facturé (envoyé)
  mutuelle_paid:bool, mutuelle_paid_at, // étape 3 : mutuelle a payé (pointé)
  payments:[{ id, at:ISO, amount, method }], // encaissements du reste à charge
}
*/

// ----- helpers dérivés (importables partout) -----
export function paidOf(sale) {
  return (sale.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
}
export function dueOf(sale) {
  return Math.max(0, Math.round(((Number(sale.reste) || 0) - paidOf(sale)) * 100) / 100)
}
export function hasLunettes(sale) {
  return (Number(sale.lunettes_montant) || 0) > 0
}
export function hasLentilles(sale) {
  return (Number(sale.lentilles_montant) || 0) > 0
}
// étape 2 : à facturer = part mutuelle due mais pas encore facturée
export function pendingFacture(sales) {
  return sales.filter((s) => (Number(s.mutuelle) || 0) > 0 && !s.facture)
}
// étape 3 : facturé mais mutuelle pas encore payée
export function pendingMutuellePaid(sales) {
  return sales.filter(
    (s) => (Number(s.mutuelle) || 0) > 0 && s.facture && !s.mutuelle_paid
  )
}
// reste à charge client non soldé
export function pendingDue(sales) {
  return sales.filter((s) => dueOf(s) > 0)
}
export function salesOfDay(sales, day) {
  return sales.filter((s) => s.day === day)
}

const Ctx = createContext(null)

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }) {
  const [sales, setSales] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(LS_UNLOCKED) === '1'
  )
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const online = !!supabase

  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const loadAll = useCallback(async () => {
    if (supabase) {
      const [v, r] = await Promise.all([
        supabase.from('ventes').select('*').order('created_at', { ascending: false }),
        supabase.from('reglages').select('*').eq('id', 1).maybeSingle(),
      ])
      if (!v.error) setSales(v.data.map(rowToSale))
      if (!r.error && r.data?.data) setSettings({ ...DEFAULT_SETTINGS, ...r.data.data })
    } else {
      setSales(readLS(LS_SALES, []).map(normalizeSale))
      setSettings({ ...DEFAULT_SETTINGS, ...readLS(LS_SETTINGS, {}) })
    }
    setReady(true)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('ventes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventes' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reglages' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadAll])

  useEffect(() => {
    if (ready && !supabase) localStorage.setItem(LS_SALES, JSON.stringify(sales))
  }, [sales, ready])
  useEffect(() => {
    if (ready && !supabase) localStorage.setItem(LS_SETTINGS, JSON.stringify(settings))
  }, [settings, ready])

  const persistSale = useCallback(async (sale) => {
    if (!supabase) return
    const { error } = await supabase.from('ventes').upsert(saleToRow(sale))
    if (error) notify('⚠ Problème de connexion — vente gardée à l’écran, réessayez')
  }, [notify])

  const addSale = useCallback(
    (data) => {
      const lm = Number(data.lunettes_montant) || 0
      const ltm = Number(data.lentilles_montant) || 0
      const price = Math.round((lm + ltm) * 100) / 100
      const reste = Math.min(price, Math.max(0, Math.round((Number(data.reste) || 0) * 100) / 100))
      const mutuelle = Math.max(0, Math.round((price - reste) * 100) / 100)
      const sale = {
        id: uid(),
        day: today(),
        created_at: new Date().toISOString(),
        client: data.client?.trim() || 'Client',
        lunettes_montant: lm,
        lentilles_montant: ltm,
        price,
        reste,
        mutuelle,
        mutuelle_nom: mutuelle > 0 ? (data.mutuelle_nom?.trim() || '') : '',
        plateforme: mutuelle > 0 ? (data.plateforme || '') : '',
        vendor: data.vendor || '',
        facture: mutuelle > 0 ? !!data.facture : false,
        facture_at: mutuelle > 0 && data.facture ? new Date().toISOString() : null,
        mutuelle_paid: false,
        mutuelle_paid_at: null,
        payments: data.payments || [],
      }
      setSales((prev) => [sale, ...prev])
      persistSale(sale)
      return sale
    },
    [persistSale]
  )

  const updateSale = useCallback(
    (id, patch) => {
      setSales((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s
          const next = recompute({ ...s, ...patch })
          persistSale(next)
          return next
        })
      )
    },
    [persistSale]
  )

  const deleteSale = useCallback(async (id) => {
    setSales((prev) => prev.filter((s) => s.id !== id))
    if (supabase) await supabase.from('ventes').delete().eq('id', id)
  }, [])

  const addPayment = useCallback(
    (saleId, { amount, method }) => {
      setSales((prev) =>
        prev.map((s) => {
          if (s.id !== saleId) return s
          const next = {
            ...s,
            payments: [
              ...(s.payments || []),
              { id: uid(), at: new Date().toISOString(), amount: Number(amount) || 0, method },
            ],
          }
          persistSale(next)
          return next
        })
      )
    },
    [persistSale]
  )

  // étape 2 : marquer facturé / défaire
  const markFacture = useCallback(
    (id, done = true) => {
      updateSale(id, { facture: done, facture_at: done ? new Date().toISOString() : null })
    },
    [updateSale]
  )
  // étape 3 : marquer payé par la mutuelle / défaire
  const markMutuellePaid = useCallback(
    (id, done = true) => {
      updateSale(id, {
        mutuelle_paid: done,
        mutuelle_paid_at: done ? new Date().toISOString() : null,
      })
    },
    [updateSale]
  )

  const saveSettings = useCallback(async (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      if (supabase) {
        supabase.from('reglages').upsert({ id: 1, data: next }).then(() => {})
      }
      return next
    })
  }, [])

  const unlock = useCallback(
    (code) => {
      if (String(code) === String(settings.accessCode)) {
        setUnlocked(true)
        sessionStorage.setItem(LS_UNLOCKED, '1')
        return true
      }
      return false
    },
    [settings.accessCode]
  )

  const value = {
    ready,
    online,
    sales,
    settings,
    unlocked,
    toast,
    notify,
    addSale,
    updateSale,
    deleteSale,
    addPayment,
    markFacture,
    markMutuellePaid,
    saveSettings,
    unlock,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore doit être utilisé sous <StoreProvider>')
  return ctx
}

// recalcule price/mutuelle après une modification (reste = saisi tel quel)
function recompute(s) {
  const lm = Number(s.lunettes_montant) || 0
  const ltm = Number(s.lentilles_montant) || 0
  const price = Math.round((lm + ltm) * 100) / 100
  const reste = Math.min(price, Math.max(0, Math.round((Number(s.reste) || 0) * 100) / 100))
  return { ...s, price, reste, mutuelle: Math.max(0, Math.round((price - reste) * 100) / 100) }
}

// remet une vente ancienne au bon format (ancien modèle « type unique »
// ou modèle v3 avec reste par poste → reste total)
function normalizeSale(s) {
  const out = { ...s }
  if (out.lunettes_montant == null && out.lentilles_montant == null) {
    // très ancien modèle : un seul type
    const price = Number(s.price) || 0
    const isLent = s.type === 'lentilles'
    out.lunettes_montant = isLent ? 0 : price
    out.lentilles_montant = isLent ? price : 0
  }
  // reste total : garde s.reste s'il existe, sinon somme des restes par poste (v3)
  if (out.reste == null) {
    out.reste = (Number(s.lunettes_reste) || 0) + (Number(s.lentilles_reste) || 0)
  }
  out.facture = s.facture != null ? s.facture : !!s.teletrans
  out.facture_at = s.facture_at != null ? s.facture_at : s.teletrans_at || null
  out.mutuelle_paid = !!s.mutuelle_paid
  out.mutuelle_paid_at = s.mutuelle_paid_at || null
  return out
}

function rowToSale(r) {
  return normalizeSale({
    id: r.id,
    day: r.day,
    created_at: r.created_at,
    client: r.client,
    lunettes_montant: Number(r.lunettes_montant) || 0,
    lentilles_montant: Number(r.lentilles_montant) || 0,
    price: Number(r.price) || 0,
    reste: Number(r.reste) || 0,
    mutuelle: Number(r.mutuelle) || 0,
    mutuelle_nom: r.mutuelle_nom || '',
    plateforme: r.plateforme || '',
    vendor: r.vendor || '',
    facture: !!r.facture,
    facture_at: r.facture_at,
    mutuelle_paid: !!r.mutuelle_paid,
    mutuelle_paid_at: r.mutuelle_paid_at,
    payments: r.payments || [],
  })
}
function saleToRow(s) {
  return {
    id: s.id,
    day: s.day,
    created_at: s.created_at,
    client: s.client,
    lunettes_montant: s.lunettes_montant,
    lentilles_montant: s.lentilles_montant,
    price: s.price,
    reste: s.reste,
    mutuelle: s.mutuelle,
    mutuelle_nom: s.mutuelle_nom,
    plateforme: s.plateforme,
    vendor: s.vendor,
    facture: s.facture,
    facture_at: s.facture_at,
    mutuelle_paid: s.mutuelle_paid,
    mutuelle_paid_at: s.mutuelle_paid_at,
    payments: s.payments,
  }
}
