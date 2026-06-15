import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { applyTheme } from '../lib/theme'

export function useTheme() {
  useEffect(() => {
    async function loadTheme() {
      const savedTheme = localStorage.getItem('tl-theme') || 'charcoal'
      const savedAccent = localStorage.getItem('tl-accent') || 'cyan'
      applyTheme(savedTheme, savedAccent)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: userData, error } = await supabase
        .from('users')
        .select('theme_background, theme_accent')
        .eq('id', session.user.id)
        .single()

      if (error || !userData) return

      const dbTheme = userData.theme_background || 'charcoal'
      const dbAccent = userData.theme_accent || 'cyan'
      applyTheme(dbTheme, dbAccent)
    }

    loadTheme()
  }, [])
}
