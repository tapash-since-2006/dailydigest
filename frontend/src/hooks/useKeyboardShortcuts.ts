import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function todayIST(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 3600000 - now.getTimezoneOffset() * 60000)
  return ist.toISOString().slice(0, 10)
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire if user is typing in an input
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      if (e.key === 'g' || e.key === 'G') {
        navigate(`/digest/${todayIST()}`)
      }

      if (e.key === '/') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')
        if (searchInput) { searchInput.focus(); navigate('/search') }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}
