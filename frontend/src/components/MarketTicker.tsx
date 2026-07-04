import { DigestFull } from '../types'

interface MarketTickerProps { marketData: DigestFull['marketData'] }

const DISPLAY_ORDER = [
  'Nifty 50', 'Sensex', 'S&P 500', 'NASDAQ', 'Dow Jones',
  'Bitcoin', 'Gold', 'Brent Crude', 'USD/INR', 'Silver',
  'Nikkei 225', 'FTSE 100', 'DAX',
]

export default function MarketTicker({ marketData }: MarketTickerProps) {
  const entries = Object.entries(marketData)
  if (entries.length === 0) return null

  const ordered = [
    ...DISPLAY_ORDER.map(name => {
      const found = entries.find(([k]) => k === name)
      return found ? found : null
    }).filter((x): x is [string, { price: string; change: string; positive: boolean }] => x !== null),
    ...entries.filter(([k]) => !DISPLAY_ORDER.includes(k))
  ]

  if (ordered.length === 0) return null

  // Duplicate for seamless loop
  const items = [...ordered, ...ordered]

  return (
    <div className="ticker-strip">
      <div style={{ padding: '0 12px', borderRight: '1px solid #2A2A2A', flexShrink: 0 }}>
        <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', color: '#6B7280', textTransform: 'uppercase' }}>
          Markets
        </span>
      </div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div className="ticker-inner">
          {items.map(([name, data], i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-label">{name}</span>
              <span className="ticker-price">{data.price}</span>
              <span className={data.positive ? 'ticker-up' : 'ticker-down'}>
                {data.change}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
