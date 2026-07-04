import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Trash2, ArrowRight, BookmarkCheck } from 'lucide-react'
import { getBookmarks, removeBookmark } from '../lib/api'
import { BookmarkEntry } from '../types'
import { Spinner, ErrorBanner, EmptyState, ProviderBadge, LevelBadge, SectionHeader } from '../components/UI'
import { useToast } from '../context/ToastContext'

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    getBookmarks().then(setBookmarks).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const handleRemove = async (date: string) => {
    try {
      await removeBookmark(date)
      setBookmarks(bs => bs.filter(b => b.date !== date))
      showToast('Removed from reading list', 'info')
    } catch (err: any) { showToast(err.message, 'error') }
  }

  return (
    <div className="page-container fade-in" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

      <div style={{ marginBottom: '32px', borderBottom: '3px double var(--rule)', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <BookmarkCheck size={20} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '2rem', color: 'var(--ink)', margin: 0 }}>
            Reading List
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
          Your saved editions
        </p>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner size={22} /></div>}

      {!loading && bookmarks.length === 0 && (
        <EmptyState title="Your reading list is empty" subtitle="Bookmark editions while reading by clicking the bookmark icon" />
      )}

      {!loading && bookmarks.length > 0 && (
        <div>
          <p style={{ fontSize: '12px', color: 'var(--ink-4)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '20px' }}>
            {bookmarks.length} saved edition{bookmarks.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--rule)', border: '1px solid var(--rule)' }}>
            {bookmarks.map(b => (
              <div key={b.date} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 24px', background: 'var(--card)', transition: 'background 0.15s' }}>
                {/* Date column */}
                <div style={{ minWidth: '52px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                    {format(parseISO(b.date), 'MMM')}
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                    {format(parseISO(b.date), 'd')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--ink-5)', marginTop: '1px', fontFamily: 'JetBrains Mono, monospace' }}>
                    {format(parseISO(b.date), 'yyyy')}
                  </div>
                </div>

                {/* Vertical rule */}
                <div style={{ width: '1px', height: '48px', background: 'var(--rule)', flexShrink: 0 }} />

                {/* Content */}
                <Link to={`/digest/${b.date}`} style={{ flex: 1, textDecoration: 'none', minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: '4px' }}>
                    {format(parseISO(b.date), 'EEEE')}
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '6px' }}>
                    Morning Edition · {format(parseISO(b.date), 'MMMM d, yyyy')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {b.provider_used && <ProviderBadge provider={b.provider_used} />}
                    {b.fallback_level && <LevelBadge level={b.fallback_level} />}
                  </div>
                </Link>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <Link to={`/digest/${b.date}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--ink-3)', border: '1px solid var(--rule)', borderRadius: '2px', textDecoration: 'none', transition: 'border-color 0.15s' }}>
                    Read <ArrowRight size={11} />
                  </Link>
                  <button onClick={() => handleRemove(b.date)}
                    style={{ padding: '6px 8px', background: 'none', border: '1px solid var(--rule)', borderRadius: '2px', cursor: 'pointer', color: 'var(--ink-4)', transition: 'color 0.15s, border-color 0.15s' }}
                    title="Remove bookmark">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
