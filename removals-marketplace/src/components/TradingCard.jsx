// Simple van glyph used as a placeholder "photo" until companies can upload a logo
function VanGlyph() {
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <g transform="translate(10,28)">
        <rect x="0" y="8" width="52" height="28" rx="3" fill="#0B2E5E" />
        <path d="M 52 12 L 68 12 L 80 26 L 80 36 L 52 36 Z" fill="#0B2E5E" />
        <rect x="58" y="19" width="12" height="9" rx="1" fill="#EEF6FD" />
        <circle cx="16" cy="40" r="8" fill="#1A2433" />
        <circle cx="16" cy="40" r="3.2" fill="#A8D4F5" />
        <circle cx="62" cy="40" r="8" fill="#1A2433" />
        <circle cx="62" cy="40" r="3.2" fill="#A8D4F5" />
      </g>
    </svg>
  )
}

// Turns a company name into a short "code" for the header, e.g. "Bristol Removals Co" -> "BR"
function codeFor(name) {
  if (!name) return '—'
  const words = name.split(' ').filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export default function TradingCard({ company }) {
  return (
    <div className="trading-card">
      <div className="tt-header">
        <span className="tt-code">{codeFor(company.name)}</span>
        <span className={`tt-verified ${company.verified ? '' : 'pending'}`}>
          {company.verified ? '✓ VERIFIED' : 'UNVERIFIED'}
        </span>
      </div>

      <div className="tt-photo">
        <VanGlyph />
      </div>

      <div className="tt-title-band">
        <h3>{company.name}</h3>
        <div className="tt-region">{(company.region || []).join(' · ') || 'Region not set'}</div>
      </div>

      <div className="tt-stats">
        <div className="tt-stat-row">
          <span className="tt-label">Years trading</span>
          <span className="tt-value">{company.years_trading ?? '–'}</span>
        </div>
        <div className="tt-stat-row">
          <span className="tt-label">Fleet size</span>
          <span className="tt-value">{company.fleet_size ?? 0}</span>
        </div>
        <div className="tt-stat-row">
          <span className="tt-label">Staff</span>
          <span className="tt-value">{company.staff_count ?? 0}</span>
        </div>
        <div className="tt-stat-row">
          <span className="tt-label">Warehouse</span>
          <span className="tt-value">{company.warehouse_sqft ? `${company.warehouse_sqft} sqft` : '–'}</span>
        </div>
        <div className="tt-stat-row">
          <span className="tt-label">Rating</span>
          <span className="tt-value">{company.rating_count > 0 ? `${company.rating_avg} ★ (${company.rating_count})` : 'No reviews yet'}</span>
        </div>
      </div>

      {(company.memberships || []).length > 0 && (
        <div className="tt-memberships">
          {company.memberships.map(m => (
            <span key={m} className="badge">{m}</span>
          ))}
        </div>
      )}
    </div>
  )
}
