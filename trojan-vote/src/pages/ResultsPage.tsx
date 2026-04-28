import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { tallyResults } from '../lib/functions'

type Result = {
  id: string
  name: string
  position: string
  votes: number
}

const MOCK_RESULTS: Result[] = [
  { id: 'c1', name: 'Aaliyah Johnson', position: 'Student Body President', votes: 142 },
  { id: 'c2', name: 'Marcus Webb',     position: 'Student Body President', votes: 98  },
  { id: 'c3', name: 'Priya Nkosi',     position: 'Vice President',         votes: 119 },
  { id: 'c4', name: 'Devon Carter',    position: 'Vice President',         votes: 87  },
]

const COLORS = ['#1a3a6b', '#c8960c', '#1a4a2b', '#4a1a4a']

export default function ResultsPage() {
  const [results, setResults]   = useState<Result[]>(MOCK_RESULTS)
  const [electionTitle, setElectionTitle] = useState('Spring 2026 Student Government Election')
  const [electionStatus, setElectionStatus] = useState<string>('closed')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Try open first, then closed
        let elSnap = await getDocs(query(collection(db, 'elections'), where('status', '==', 'closed')))
        if (elSnap.empty) {
          elSnap = await getDocs(query(collection(db, 'elections'), where('status', '==', 'open')))
        }
        if (!elSnap.empty) {
          const el = elSnap.docs[0]
          const data = el.data()
          setElectionTitle(data.title || electionTitle)
          setElectionStatus(data.status || 'closed')

          const res = await tallyResults({ electionId: el.id })
          const resData = res.data as any
          if (resData?.results) setResults(resData.results)
        }
      } catch (_) { /* keep mock */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const positions  = [...new Set(results.map(r => r.position))]
  const totalVotes = results.reduce((s, r) => s + r.votes, 0)
  const initials   = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2)

  const getWinner = (position: string) => {
    const pos = results.filter(r => r.position === position)
    return pos.sort((a, b) => b.votes - a.votes)[0]
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="cv-spinner" />
    </div>
  )

  return (
    <div className="cv-page">
      {/* Header */}
      <div className="cv-fade-up" style={{ marginBottom: 36 }}>
        <span className="cv-badge" style={{
          background: electionStatus === 'open' ? 'rgba(200,150,12,0.12)' : '#f0fdf4',
          color: electionStatus === 'open' ? 'var(--gold)' : 'var(--green)',
          marginBottom: 10,
        }}>
          {electionStatus === 'open' ? '🟢 Live Results' : '✓ Final Results'}
        </span>
        <h1 style={{ fontSize: 32, marginTop: 6, marginBottom: 6 }}>Election Results</h1>
        <p style={{ color: 'var(--gray)' }}>{electionTitle}</p>

        {/* Total votes banner */}
        <div style={{
          marginTop: 20, padding: '18px 24px', borderRadius: 14,
          background: 'linear-gradient(135deg, var(--navy), var(--navy2))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--gold2)', fontWeight: 600, letterSpacing: '1px' }}>TOTAL VOTES CAST</div>
            <div style={{ fontSize: 36, fontFamily: "'DM Serif Display',serif", color: '#fff', marginTop: 2 }}>
              {totalVotes.toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {positions.map(pos => {
              const posTotal = results.filter(r => r.position === pos).reduce((s, r) => s + r.votes, 0)
              return (
                <div key={pos} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontFamily: "'DM Serif Display',serif", color: 'var(--gold2)' }}>{posTotal}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', maxWidth: 80, lineHeight: 1.3 }}>{pos}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Winners spotlight */}
      {electionStatus === 'closed' && (
        <div className="cv-fade-up cv-d1" style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>🏆 Election Winners</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {positions.map((pos, i) => {
              const winner = getWinner(pos)
              const posTotal = results.filter(r => r.position === pos).reduce((s, r) => s + r.votes, 0)
              return (
                <div key={pos} style={{
                  background: 'linear-gradient(135deg, var(--navy), var(--navy2))',
                  borderRadius: 16, padding: 24, color: '#fff', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.06,
                  }}>🏆</div>
                  <div style={{ fontSize: 11, color: 'var(--gold2)', fontWeight: 600, letterSpacing: '1px', marginBottom: 12 }}>
                    {pos.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: 'var(--gold)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 20, fontWeight: 700,
                      color: 'var(--navy)', fontFamily: "'DM Serif Display',serif", flexShrink: 0,
                    }}>{initials(winner.name)}</div>
                    <div>
                      <div style={{ fontSize: 18, fontFamily: "'DM Serif Display',serif" }}>{winner.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                        {winner.votes} votes · {posTotal ? Math.round((winner.votes / posTotal) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full results by position */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
        {positions.map((position, pi) => {
          const posResults = results.filter(r => r.position === position).sort((a, b) => b.votes - a.votes)
          const posTotal   = posResults.reduce((s, r) => s + r.votes, 0)
          const maxVotes   = posResults[0]?.votes || 1

          return (
            <div key={position} className={`cv-card cv-fade-up`} style={{ animationDelay: `${pi * 0.12}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18 }}>{position}</h2>
                <span className="cv-badge" style={{ background: 'var(--light)', color: 'var(--navy2)' }}>
                  {posTotal} votes
                </span>
              </div>

              {posResults.map((r, ri) => {
                const pct     = posTotal ? Math.round((r.votes / posTotal) * 100) : 0
                const isWinner = ri === 0 && electionStatus === 'closed'
                return (
                  <div key={r.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: isWinner ? 'var(--gold)' : COLORS[ri % COLORS.length],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                          color: isWinner ? 'var(--navy)' : '#fff',
                          fontFamily: "'DM Serif Display',serif",
                        }}>{isWinner ? '🏆' : initials(r.name)}</div>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</span>
                          {isWinner && (
                            <span className="cv-badge" style={{ background: 'rgba(200,150,12,0.12)', color: 'var(--gold)', marginLeft: 8 }}>
                              Winner
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy2)' }}>{pct}%</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{r.votes} votes</div>
                      </div>
                    </div>
                    <div style={{ height: 10, background: '#e8edf5', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 5,
                        width: `${(r.votes / maxVotes) * 100}%`,
                        background: isWinner ? 'linear-gradient(90deg,var(--gold),var(--gold2))' : COLORS[ri % COLORS.length],
                        transition: 'width 1.2s ease',
                      }} />
                    </div>
                  </div>
                )
              })}

              {/* Proportional strip */}
              {posTotal > 0 && (
                <div style={{ display: 'flex', gap: 3, marginTop: 8, borderRadius: 4, overflow: 'hidden', height: 5 }}>
                  {posResults.map((r, ri) => (
                    <div key={r.id} title={`${r.name}: ${r.votes}`} style={{
                      flex: r.votes,
                      background: ri === 0 && electionStatus === 'closed' ? 'var(--gold)' : COLORS[ri % COLORS.length],
                      transition: 'flex 0.8s ease',
                    }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
