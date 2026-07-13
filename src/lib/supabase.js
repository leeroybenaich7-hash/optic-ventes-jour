import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'

// Client Supabase, ou null si la config n'est pas remplie
// (dans ce cas l'app travaille en local, dans le navigateur).
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null
