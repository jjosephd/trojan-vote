import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

type Candidate = {
  id: string
  name: string
  position: string
  description: string
  electionId?: string
  // Enhanced profile fields
  bio?: string
  vision?: string
  promises?: string[]
  major?: string
  year?: string
  photoUrl?: string
  videoUrl?: string
  instagram?: string
  twitter?: string
  linkedin?: string
  email?: string
}

const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'c1', name: 'Aaliyah Johnson', position: 'Student Body President',
    description: 'Fighting for mental health resources and extended library hours for all VSU students.',
    bio: 'Aaliyah Johnson is a junior Political Science major who has served two years on the VSU Student Wellness Committee. She is passionate about making VSU a more inclusive and supportive campus for every student.',
    vision: 'A VSU where every student has the mental health support, academic resources, and safe spaces they need to thrive — not just survive.',
    promises: ['Expand counseling services from 5 to 15 counselors', 'Extend library hours to midnight on weekdays', 'Create peer mentorship program for first-year students', 'Monthly open town halls with university administration'],
    major: 'Political Science', year: 'Junior',
    instagram: 'aaliyah4vsu', twitter: 'aaliyah4vsu', email: 'ajohnson@vsu.edu',
  },
  {
    id: 'c2', name: 'Marcus Webb', position: 'Student Body President',
    description: 'Focused on career development partnerships and internship opportunities.',
    bio: 'Marcus Webb is a senior Business Administration major and current class treasurer. He has brokered three new employer partnerships with Fortune 500 companies and believes every VSU graduate deserves a clear path to career success.',
    vision: 'Transform VSU into the premier HBCU for career placement — every graduate walks across the stage with a job offer in hand.',
    promises: ['Launch VSU Career Connect platform', 'Secure 10 new corporate partnerships', 'Establish alumni mentorship network', 'Create on-campus internship incubator'],
    major: 'Business Administration', year: 'Senior',
    linkedin: 'marcuswebb-vsu', email: 'mwebb@vsu.edu',
  },
  {
    id: 'c3', name: 'Priya Nkosi', position: 'Vice President',
    description: 'Championing tech equity — every student should have access to digital tools.',
    bio: 'Priya Nkosi is a junior Computer Science major and founder of the VSU Coding Club. She has organized three free coding workshops for first-generation students and believes technology should be accessible to every Trojan.',
    vision: 'A digitally empowered VSU where no student is left behind by the technology gap.',
    promises: ['Free laptop loaner program for all students', 'Expand campus Wi-Fi to all residence halls', 'Launch free coding bootcamp every semester', 'Partner with tech companies for student licenses'],
    major: 'Computer Science', year: 'Junior',
    instagram: 'priya.codes', twitter: 'priyankosi_vsu', email: 'pnkosi@vsu.edu',
  },
  {
    id: 'c4', name: 'Devon Carter', position: 'Vice President',
    description: 'Your voice matters. Devon will ensure student concerns reach every level of administration.',
    bio: 'Devon Carter is a sophomore Communications major known for running a popular campus podcast. Devon believes in radical transparency — every student should know what their student government is doing and why.',
    vision: 'A student government that actually communicates — where students lead, not just observe.',
    promises: ['Weekly student government newsletter', 'Open-door office hours every Friday', 'Anonymous issue tracker published publicly', 'Student input required on all major decisions'],
    major: 'Communications', year: 'Sophomore',
    instagram: 'devoncarter_vsu', email: 'dcarter@vsu.edu',
  },
]

const COLORS = ['#0f2444', '#c8960c', '#1a4a2b', '#4a1a3a']

// ── Full Profile Page ──────────────────────────────────────────────────────
function CandidateProfile({ candidate, color, onBack }: {
  candidate: Candidate
  color: string
  onBack: () => void
}) {
  const initials = candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
    <div className="cv-page cv-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--gray)', fontSize: 14, fontWeight: 600,
          marginBottom: 24, padding: 0,
        }}
      >
        ← Back to Candidates
      </button>

      {/* Hero section */}
      <div className="cv-card cv-fade-up" style={{ padding: 36, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar / photo */}
          <div style={{ flexShrink: 0 }}>
            {candidate.photoUrl ? (
              <img src={candidate.photoUrl} alt={candidate.name}
                style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${color}` }} />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: '50%', background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontWeight: 700, color: '#fff',
                fontFamily: "'DM Serif Display', serif",
              }}>{initials}</div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <span className="cv-badge" style={{ background: 'var(--light)', color: 'var(--navy2)', marginBottom: 10 }}>
              {candidate.position}
            </span>
            <h1 style={{ fontSize: 32, marginTop: 6, marginBottom: 6 }}>{candidate.name}</h1>
            {(candidate.major || candidate.year) && (
              <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 12 }}>
                {[candidate.major, candidate.year].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Social links */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {candidate.email && (
                <a href={`mailto:${candidate.email}`} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: 'var(--light)', color: 'var(--navy2)', textDecoration: 'none',
                }}>✉️ {candidate.email}</a>
              )}
              {candidate.instagram && (
                <a href={`https://instagram.com/${candidate.instagram}`} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: '#fdf2f8', color: '#9333ea', textDecoration: 'none',
                }}>📸 @{candidate.instagram}</a>
              )}
              {candidate.twitter && (
                <a href={`https://twitter.com/${candidate.twitter}`} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: '#eff6ff', color: '#1a3a6b', textDecoration: 'none',
                }}>🐦 @{candidate.twitter}</a>
              )}
              {candidate.linkedin && (
                <a href={`https://linkedin.com/in/${candidate.linkedin}`} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: '#eff6ff', color: '#0a66c2', textDecoration: 'none',
                }}>💼 LinkedIn</a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {/* Bio */}
        {candidate.bio && (
          <div className="cv-card cv-fade-up cv-d1">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 12 }}>
              About
            </div>
            <p style={{ color: 'var(--navy)', lineHeight: 1.8, fontSize: 14 }}>{candidate.bio}</p>
          </div>
        )}

        {/* Vision */}
        {candidate.vision && (
          <div className="cv-card cv-fade-up cv-d2" style={{ background: `linear-gradient(135deg, ${color}15, ${color}08)`, border: `1px solid ${color}30` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color, marginBottom: 12 }}>
              Vision
            </div>
            <p style={{ color: 'var(--navy)', lineHeight: 1.8, fontSize: 15, fontStyle: 'italic', fontFamily: "'DM Serif Display', serif" }}>
              "{candidate.vision}"
            </p>
          </div>
        )}

        {/* Campaign Promises */}
        {candidate.promises && candidate.promises.length > 0 && (
          <div className="cv-card cv-fade-up cv-d2" style={{ gridColumn: 'span 1' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 14 }}>
              Campaign Promises
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {candidate.promises.map((promise, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</div>
                  <p style={{ fontSize: 14, color: 'var(--navy)', lineHeight: 1.6 }}>{promise}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign video */}
        {candidate.videoUrl && (
          <div className="cv-card cv-fade-up cv-d3">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 14 }}>
              Campaign Video
            </div>
            <a href={candidate.videoUrl} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              borderRadius: 12, background: 'var(--navy)', color: '#fff',
              textDecoration: 'none', fontWeight: 600, fontSize: 14,
            }}>
              <span style={{ fontSize: 24 }}>▶️</span>
              Watch Campaign Video
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Write-In Modal ─────────────────────────────────────────────────────────
function WriteInModal({ positions, onClose, onSubmit }: {
  positions: string[]
  onClose: () => void
  onSubmit: (name: string, position: string) => void
}) {
  const [name, setName]         = useState('')
  const [position, setPosition] = useState(positions[0] || '')
  const [error, setError]       = useState('')

  const handle = () => {
    if (!name.trim()) { setError('Please enter a candidate name.'); return }
    if (!position)    { setError('Please select a position.'); return }
    onSubmit(name.trim(), position)
  }

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: '100%', padding: 36 }}>
        <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>✍️</div>
        <h2 style={{ fontSize: 22, marginBottom: 6, textAlign: 'center' }}>Write-In Candidate</h2>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 24, textAlign: 'center' }}>
          Don't see the right candidate? Write in your own choice.
        </p>

        {error && <div className="cv-error-box" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="cv-label">Candidate Name *</label>
            <input className="cv-input" placeholder="Full name of your write-in candidate"
              value={name} onChange={e => { setName(e.target.value); setError('') }} />
          </div>
          <div>
            <label className="cv-label">Position *</label>
            <select className="cv-input" value={position} onChange={e => setPosition(e.target.value)}
              style={{ appearance: 'auto' }}>
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(200,150,12,0.08)', fontSize: 12, color: 'var(--gold)', border: '1px solid rgba(200,150,12,0.2)' }}>
            ⚠️ Write-in votes count toward the final tally. Make sure the name is spelled correctly.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className="cv-btn cv-btn-outline" onClick={onClose}>Cancel</button>
          <button className="cv-btn cv-btn-navy" onClick={handle}>Submit Write-In</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CandidatesPage() {
  const [candidates, setCandidates]   = useState<Candidate[]>(MOCK_CANDIDATES)
  const [selectedProfile, setSelectedProfile] = useState<Candidate | null>(null)
  const [filter, setFilter]           = useState('All')
  const [loading, setLoading]         = useState(true)
  const [showWriteIn, setShowWriteIn] = useState(false)
  const [writeIns, setWriteIns]       = useState<{ name: string; position: string }[]>([])
  const [writeInToast, setWriteInToast] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        // Try to get candidates for the open election
        const elSnap = await getDocs(query(collection(db, 'elections'), where('status', '==', 'open')))
        if (!elSnap.empty) {
          const elId = elSnap.docs[0].id
          const cSnap = await getDocs(query(collection(db, 'candidates'), where('electionId', '==', elId)))
          if (!cSnap.empty) {
            setCandidates(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)))
            setLoading(false); return
          }
        }
        // Fallback: all candidates
        const snap = await getDocs(collection(db, 'candidates'))
        if (!snap.empty) {
          setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)))
        }
      } catch (_) { /* keep mock */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const positions   = [...new Set(candidates.map(c => c.position))]
  const filterOpts  = ['All', ...positions]
  const filtered    = filter === 'All' ? candidates : candidates.filter(c => c.position === filter)
  const initials    = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2)

  const handleWriteIn = (name: string, position: string) => {
    setWriteIns(w => [...w, { name, position }])
    setShowWriteIn(false)
    setWriteInToast(`Write-in recorded: ${name} for ${position}`)
    setTimeout(() => setWriteInToast(''), 3500)
  }

  // Show full profile page
  if (selectedProfile) {
    const colorIdx = candidates.indexOf(selectedProfile)
    return (
      <CandidateProfile
        candidate={selectedProfile}
        color={COLORS[colorIdx % COLORS.length]}
        onBack={() => setSelectedProfile(null)}
      />
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="cv-spinner" />
    </div>
  )

  return (
    <div className="cv-page">
      {/* Write-in toast */}
      {writeInToast && (
        <div className="cv-toast cv-toast-success">{writeInToast}</div>
      )}

      {/* Write-in modal */}
      {showWriteIn && (
        <WriteInModal
          positions={positions}
          onClose={() => setShowWriteIn(false)}
          onSubmit={handleWriteIn}
        />
      )}

      {/* Header */}
      <div className="cv-fade-up" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 32, marginBottom: 6 }}>Meet the Candidates</h1>
            <p style={{ color: 'var(--gray)' }}>
              Learn about everyone running · Election closes <strong>May 20, 2026</strong>
            </p>
          </div>
          <button
            className="cv-btn cv-btn-outline cv-btn-sm"
            onClick={() => setShowWriteIn(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            ✍️ Write-In Candidate
          </button>
        </div>
      </div>

      {/* Position filter */}
      <div className="cv-fade-up cv-d1" style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {filterOpts.map(p => (
          <button key={p} onClick={() => setFilter(p)} style={{
            padding: '8px 18px', borderRadius: 24, border: 'none',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.18s',
            background: filter === p ? 'var(--navy)' : 'var(--white)',
            color: filter === p ? '#fff' : 'var(--gray)',
            boxShadow: filter === p ? 'var(--shadow)' : 'none',
          }}>{p}</button>
        ))}
      </div>

      {/* Write-in submitted list */}
      {writeIns.length > 0 && (
        <div className="cv-card cv-fade-up" style={{ marginBottom: 24, padding: '14px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--gray)', marginBottom: 10 }}>
            Your Write-In Submissions
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {writeIns.map((w, i) => (
              <span key={i} className="cv-badge" style={{ background: 'var(--light)', color: 'var(--navy2)' }}>
                ✍️ {w.name} — {w.position}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Candidate grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
        {filtered.map((c, i) => (
          <div
            key={c.id}
            className="cv-fade-up"
            style={{ animationDelay: `${i * 0.07}s`, cursor: 'pointer' }}
            onClick={() => setSelectedProfile(c)}
          >
            <div className="cv-card" style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = ''
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'
              }}
            >
              <div style={{ height: 7, background: COLORS[i % COLORS.length] }} />
              <div style={{ padding: 22 }}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt={c.name}
                      style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                      background: COLORS[i % COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: '#fff',
                      fontFamily: "'DM Serif Display',serif",
                    }}>{initials(c.name)}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{c.name}</div>
                    {(c.major || c.year) && (
                      <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                        {[c.major, c.year].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>

                <span className="cv-badge" style={{ background: 'var(--light)', color: 'var(--navy2)', marginBottom: 10 }}>
                  {c.position}
                </span>

                <p style={{
                  fontSize: 13, color: 'var(--gray)', marginTop: 10, lineHeight: 1.65,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                } as React.CSSProperties}>{c.description}</p>

                {/* Quick social preview */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  {c.instagram && <span style={{ fontSize: 16 }}>📸</span>}
                  {c.twitter   && <span style={{ fontSize: 16 }}>🐦</span>}
                  {c.linkedin  && <span style={{ fontSize: 16 }}>💼</span>}
                  {c.videoUrl  && <span style={{ fontSize: 16 }}>▶️</span>}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--navy2)', fontWeight: 600 }}>
                  View full profile →
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}