import { Component, ReactNode, ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: string }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '4rem', fontWeight: 900, color: 'var(--rule-strong)' }}>!</div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: 'var(--ink)' }}>Something went wrong</h2>
          <p style={{ fontSize: '13px', color: 'var(--ink-4)', maxWidth: '400px' }}>{this.state.error || 'An unexpected error occurred.'}</p>
          <button onClick={() => { this.setState({ hasError: false, error: '' }); window.location.href = '/' }}
            className="btn-primary" style={{ marginTop: '8px' }}>
            Return to Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
