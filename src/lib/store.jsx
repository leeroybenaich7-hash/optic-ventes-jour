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

const LS_SALES = 'ocvj_sales'
const LS_SETTINGS = 'ocvj_settings'
const LS_UNLOCKED = 'ocvj_unlocked'

export const DEFAULT_SETTINGS = {
  vendors: ['Maman', 'Binesa', 'Nadia'],
  methods: ['CB', 'Espèces', 'Chèque', 'Virement'],
  accessCode: '1234',
}

/*
Forme d'une vente :
{
  id: string,
  day: 'YYYY-MM-DD',          // journée de la vente
  created_at: ISO,            // heure de saisie
  client: string,
  type: 'lunettes' | 'lentilles',
  price: number,              // prix total
  mutuelle: number,           // part mutuelle
  reste: number,              // reste à charge client
  vendor: string,
  teletrans: boolean,         // télétransmission mutuelle faite ?
  teletrans_at: ISO | null,
  payments: [{ id, at: ISO, amount: number, method: string }],
}
*/

// ----- helpers dérivés (importables partout) -----
export function paidOf(sale) {
  return (sale.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
}
export function dueOf(sale) {
  return Math.max(0, Math.round(((Number(sale.reste) || 0) - paidOf(sale)) * 100) / 100)
}
export function pendingTeletrans(sales) {
  return sales.filter((s) => !s.teletrans && (Number(s.mutuelle) || 0) > 0)
}
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

  // ----- toast global -----
  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  // ----- chargement initial -----
  const loadAll = useCallback(async () => {
    if (supabase) {
      const [v, r] = await Promise.all([
        supabase.from('ventes').select('*').order('created_at', { ascending: false }),
        supabase.from('reglages').select('*').eq('id', 1).maybeSingle(),
      ])
      if (!v.error) setSales(v.data.map(rowToSale))
      if (!r.error && r.data?.data) setSettings({ ...DEFAULT_SETTINGS, ...r.data.data })
    } else {
      setSales(readLS(LS_SALES, []))
      setSettings({ ...DEFAULT_SETTINGS, ...readLS(LS_SETTINGS, {}) })
    }
    setReady(true)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ----- temps réel (Supabase uniquement) -----
  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('ventes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventes' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reglages' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadAll])

  // ----- persistance locale -----
  useEffect(() => {
    if (ready && !supabase) localStorage.setItem(LS_SALES, JSON.stringify(sales))
  }, [sales, ready])
  useEffect(() => {
    if (ready && !supabase) localStorage.setItem(LS_SETTINGS, JSON.stringify(settings))
  }, [settings, ready])

  // ----- écritures -----
  const persistSale = useCallback(async (sale) => {
    if (!supabase) return
    const { error } = await supabase.from('ventes').upsert(saleToRow(sale))
    if (error) notify('⚠ Problème de connexion — vente gardée à l’écran, réessayez')
  }, [notify])

  const addSale = useCallback(
    (data) => {
      const sale = {
        id: uid(),
        day: today(),
        created_at: new Date().toISOString(),
        client: data.client?.trim() || 'Client',
        type: data.type,
        price: Number(data.price) || 0,
        mutuelle: Number(data.mutuelle) || 0,
        reste: Number(data.reste) || 0,
        vendor: data.vendor || '',
        teletrans: !!data.teletrans,
        teletrans_at: data.teletrans ? new Date().toISOString() : null,
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
          const next = { ...s, ...patch }
          persistSale(next)
          return next
        })
      )
    },
    [persistSale]
  )

  const deleteSale = useCallback(
    async (id) => {
      setSales((prev) => prev.filter((s) => s.id !== id))
      if (supabase) await supabase.from('ventes').delete().eq('id', id)
    },
    []
  )

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

  const markTeletrans = useCallback(
    (id, done = true) => {
      updateSale(id, { teletrans: done, teletrans_at: done ? new Date().toISOString() : null })
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
    markTeletrans,
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

// ----- conversion ligne SQL <-> objet vente -----
function rowToSale(r) {
  return {
    id: r.id,
    day: r.day,
    created_at: r.created_at,
    client: r.client,
    type: r.type,
    price: Number(r.price),
    mutuelle: Number(r.mutuelle),
    reste: Number(r.reste),
    vendor: r.vendor || '',
    teletrans: !!r.teletrans,
    teletrans_at: r.teletrans_at,
    payments: r.payments || [],
  }
}
function saleToRow(s) {
  return {
    id: s.id,
    day: s.day,
    created_at: s.created_at,
    client: s.client,
    type: s.type,
    price: s.price,
    mutuelle: s.mutuelle,
    reste: s.reste,
    vendor: s.vendor,
    teletrans: s.teletrans,
    teletrans_at: s.teletrans_at,
    payments: s.payments,
  }
}
