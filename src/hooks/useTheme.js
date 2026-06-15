import { useEffect } from 'react'
import { applyTheme } from '../styles/theme'
import { supabase } from '../lib/supabase'

export function useTheme() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('tl-theme') || 'warm'
    const savedAccent = localStorage.getItem('tl-accent') || 'cyan'
    applyTheme(savedTheme, savedAccent)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users')
        .select('theme_background, theme_accent')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) applyTheme(
            data.theme_background || savedTheme,
            data.theme_accent || savedAccent
          )
        })
    })
  }, [])
}
