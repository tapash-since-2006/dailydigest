import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; message: string; type: ToastType }
interface ToastContextType { showToast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId.current
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const icons = { success: CheckCircle2, error: XCircle, info: Info }
  const iconColors = { success: 'var(--positive)', error: 'var(--negative)', info: 'var(--ink-3)' }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        {toasts.map(t => {
          const Icon = icons[t.type]
          return (
            <div key={t.id} className={`toast toast-${t.type}`} style={{ pointerEvents: 'auto', borderLeftColor: iconColors[t.type] }}>
              <Icon size={14} style={{ color: iconColors[t.type], flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: '0 0 0 4px' }}>
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
