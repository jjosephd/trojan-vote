import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
import { submitVote } from '../lib/functions'
import type { AppUser } from '../App'

type Candidate = {
  id: string
  name: string
  position: string
  description: string
  electionId: string
}

type PositionConfig = {
  position: string
  eligibleGrades: string[]  // empty = open to all
}

type Election = {
  id: string
  title: string
  status: 'open' | 'closed' | 'pending'
  endDate?: string
  positions?: PositionConfig[]
}

type VoteRecord = {
  position: string
  candidateId: string
  candidateName: string
  timestamp: string
}

type Props = { user: AppUser }

const MOCK_ELECTION: Election = {
  id: 'spring-2026',
  title: 'Spring 2026 Student Government Election',
  status: 'open',
  endDate: 'May 20, 2026',
  positions: [
    { position: 'Student Body President', eligibleGrades: [] },
    { position: 'Vice President',         eligibleGrades: [] },
    { position: 'Freshman Class Rep',     eligibleGrades: ['Freshman'] },
    { position: 'Sophomore Class Rep',    eligibleGrades: ['Sophomore'] },
  ],
}

const MOCK_CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Aaliyah Johnson', position: 'Student Body President', description: 'Fighting for mental health resources and extended library hours.', electionId: 'spring-2026' },
  { id: 'c2', name: 'Marcus Webb',     position: 'Student Body President', description: 'Focused on career development partnerships and internship opportunities.', electionId: 'spring-2026' },
  { id: 'c3', name: 'Priya Nkosi',     position: 'Vice President',         description: 'Championing tech equity — every student should have access to digital tools.', electionId: 'spring-2026' },
  { id: 'c4', name: 'Devon Carter',    position: 'Vice President',         description: 'Your voice matters. I will ensure student concerns reach every level of administration.', electionId: 'spring-2026' },
  { id: 'c5', name: 'Imani Brooks',    position: 'Freshman Class Rep',     description: 'Representing the Class of 2029 — advocating for first-year student needs.', electionId: 'spring-2026' },
  { id: 'c6', name: 'Tyler Ross',      position: 'Freshman Class Rep',     description: 'Building community for incoming Trojans from day one.', electionId: 'spring-2026' },
  { id: 'c7', name: 'Jordan Kim',      position: 'Sophomore Class Rep',    description: 'Connecting second-year students to leadership opportunities.', electionId: 'spring-2026' },
  { id: 'c8', name: 'Aisha Patel',     position: 'Sophomore Class Rep',    description: 'Advocating for sophomore housing, scheduling, and advising resources.', electionId: 'spring-2026' },
]

const COLORS = ['#1a3a6b', '#c8960c', '#1a4a2b', '#4a1a4a']

function isEligible(eligibleGrades: string[], studentGrade?: string): boolean {
  if (!eligibleGrades || eligibleGrades.length === 0) return true
  if (!studentGrade) return false
  return eligibleGrades.includes(studentGrade)
}

// ── Subgroup Banner ────────────────────────────────────────────────────────
function SubgroupBanner({ user, positionConfigs }: { user: AppUser; positionConfigs: PositionConfig[] }) {
  const restricted = positionConfigs.filter(p => p.eligibleGrades.length > 0)
  if (restricted.length === 0) return null

  const ineligible = restricted.filter(p => !isEligible(p.eligibleGrades, user.gradeLevel))

  return (
    <div className="cv-card cv-fade-up" style={{ marginBottom: 24, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>🎓</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            Your Personalized Ballot
            {user.gradeLevel && (
              <span className="cv-badge" style={{ background: 'var(--light)', color: 'var(--navy2)' }}>
                {user.gradeLevel}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>
            {!user.gradeLevel
              ? 'Your grade level was not recorded. You can vote in all open elections only.'
              : `As a ${user.gradeLevel}, your ballot includes all-student elections${restricted.filter(p => isEligible(p.eligibleGrades, user.gradeLevel)).length > 0 ? ' plus your class-specific positions' : ''}.`
            }
          </p>
          {ineligible.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--gray)' }}>Not on your ballot:</span>
              {ineligible.map(p => (
                <span key={p.position} className="cv-badge" style={{ background: '#fef2f2', color: 'var(--red)', fontSize: 11 }}>
                  {p.position} ({p.eligibleGrades.join(', ')} only)
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Vote Confirmation Screen ───────────────────────────────────────────────
function VoteConfirmationScreen({ voteHistory, election, onDone }: {
  voteHistory: VoteRecord[]
  election: Election
  onDone: () => void
}) {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div className="cv-fade-up" style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a7a4a, #2ecc71)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 0 0 16px rgba(26,122,74,0.1), 0 0 0 32px rgba(26,122,74,0.05)',
          fontSize: 42, color: '#fff', fontWeight: 700,
        }}>✓</div>
        <h1 style={{ fontSize: 36, marginBottom: 10 }}>Vote Submitted!</h1>
        <p style={{ color: 'var(--gray)', fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>
          Your votes have been securely recorded for the<br />
          <strong style={{ color: 'var(--navy)' }}>{election.title}</strong>
        </p>
        <div className="cv-card" style={{ textAlign: 'left', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 16 }}>
            Voting Summary
          </div>
          {voteHistory.map((v, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < voteHistory.length - 1 ? '1px solid #f0f4ff' : 'none' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{v.position}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{v.candidateName}</div>
              </div>
              <span className="cv-badge" style={{ background: '#f0fdf4', color: 'var(--green)' }}>✓ Recorded</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--light)', fontSize: 12, color: 'var(--gray)' }}>
            🔒 Your vote is anonymous and tamper-resistant · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <button className="cv-btn cv-btn-navy cv-btn-lg" onClick={onDone} style={{ width: '100%' }}>
          View My Vote History →
        </button>
      </div>
    </div>
  )
}

// ── Vote History Panel ─────────────────────────────────────────────────────
function VoteHistoryPanel({ voteHistory }: { voteHistory: VoteRecord[] }) {
  if (voteHistory.length === 0) return (
    <div className="cv-card cv-fade-up" style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <h3 style={{ marginBottom: 8, color: 'var(--navy)' }}>No votes yet</h3>
      <p style={{ fontSize: 14 }}>Switch to the Vote tab to cast your ballot.</p>
    </div>
  )
  return (
    <div className="cv-card cv-fade-up">
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 16 }}>Your Votes This Election</div>
      {voteHistory.map((v, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < voteHistory.length - 1 ? '1px solid #f0f4ff' : 'none' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'DM Serif Display', serif" }}>
              {v.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{v.position}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{v.candidateName}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{v.timestamp}</div>
            </div>
          </div>
          <span className="cv-badge" style={{ background: '#f0fdf4', color: 'var(--green)' }}>✓ Recorded</span>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--light)', fontSize: 12, color: 'var(--gray)' }}>
        🔒 Votes are final and cannot be changed after submission
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function StudentDashboard({ user }: Props) {
  const [election, setElection]               = useState<Election>(MOCK_ELECTION)
  const [candidates, setCandidates]           = useState<Candidate[]>(MOCK_CANDIDATES)
  const [positionConfigs, setPositionConfigs] = useState<PositionConfig[]>(MOCK_ELECTION.positions || [])
  const [voted, setVoted]                     = useState<Record<string, string>>({})
  const [voteHistory, setVoteHistory]         = useState<VoteRecord[]>([])
  const [confirm, setConfirm]                 = useState<{ id: string; position: string } | null>(null)
  const [toast, setToast]                     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [submitting, setSubmitting]           = useState(false)
  const [dataLoading, setDataLoading]         = useState(true)
  const [showConfirmScreen, setShowConfirmScreen] = useState(false)
  const [activeTab, setActiveTab]             = useState<'vote' | 'history'>('vote')

  useEffect(() => {
    let unsubVotes: (() => void) | null = null
    const load = async () => {
      try {
        const elSnap = await getDocs(query(collection(db, 'elections'), where('status', '==', 'open')))
        if (!elSnap.empty) {
          const el = elSnap.docs[0]
          const elData = { id: el.id, ...el.data() } as Election
          setElection(elData)
          if (elData.positions && elData.positions.length > 0) setPositionConfigs(elData.positions)

          const cSnap = await getDocs(query(collection(db, 'candidates'), where('electionId', '==', el.id)))
          if (!cSnap.empty) setCandidates(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)))

          const uid = auth.currentUser?.uid
          if (uid) {
            unsubVotes = onSnapshot(
              query(collection(db, 'votes'), where('userId', '==', uid), where('electionId', '==', el.id)),
              (snap) => {
                if (!snap.empty) {
                  const history: VoteRecord[] = []
                  const votedMap: Record<string, string> = {}
                  snap.docs.forEach(d => {
                    const data = d.data()
                    history.push({
                      position: data.position, candidateId: data.candidateId,
                      candidateName: data.candidateName || 'Unknown',
                      timestamp: data.timestamp?.toDate?.()?.toLocaleString() || new Date().toLocaleString(),
                    })
                    votedMap[data.position] = data.candidateId
                  })
                  setVoteHistory(history)
                  setVoted(votedMap)
                }
              }
            )
          }
        }
      } catch (_) {}
      finally { setDataLoading(false) }
    }
    load()
    return () => { if (unsubVotes) unsubVotes() }
  }, [])

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Eligible/ineligible split based on gradeLevel
  const allPositions        = [...new Set(candidates.map(c => c.position))]
  const eligiblePositions   = allPositions.filter(pos => {
    const config = positionConfigs.find(p => p.position === pos)
    return isEligible(config?.eligibleGrades ?? [], user.gradeLevel)
  })
  const ineligiblePositions = allPositions.filter(p => !eligiblePositions.includes(p))
  const allVoted = eligiblePositions.length > 0 && eligiblePositions.every(p => !!voted[p])
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2)

  const castVote = async () => {
    if (!confirm) return
    setSubmitting(true)
    try {
      const candidate = candidates.find(c => c.id === confirm.id)
      await submitVote({ electionId: election.id, position: confirm.position, candidateId: confirm.id })
      const newVoted  = { ...voted, [confirm.position]: confirm.id }
      const newRecord: VoteRecord = {
        position: confirm.position, candidateId: confirm.id,
        candidateName: candidate?.name || 'Unknown', timestamp: new Date().toLocaleString(),
      }
      setVoted(newVoted)
      setVoteHistory(h => [...h, newRecord])
      if (eligiblePositions.every(p => !!newVoted[p])) {
        setShowConfirmScreen(true)
      } else {
        showToast(`Vote for ${candidate?.name} recorded!`, 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit vote.', 'error')
    } finally { setSubmitting(false); setConfirm(null) }
  }

  if (dataLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="cv-spinner" /></div>

  if (showConfirmScreen) return (
    <VoteConfirmationScreen voteHistory={voteHistory} election={election}
      onDone={() => { setShowConfirmScreen(false); setActiveTab('history') }} />
  )

  return (
    <div className="cv-page">
      {toast && <div className={`cv-toast cv-toast-${toast.type}`}>{toast.msg}</div>}

      {/* Confirm modal */}
      {confirm && (
        <div className="cv-overlay" onClick={() => !submitting && setConfirm(null)}>
          <div className="cv-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, width: '100%', textAlign: 'center', padding: 36 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗳️</div>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Confirm Your Vote</h2>
            <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 6 }}>You're voting for</p>
            <p style={{ fontSize: 21, fontFamily: "'DM Serif Display',serif", color: 'var(--navy2)', marginBottom: 4 }}>
              {candidates.find(c => c.id === confirm.id)?.name}
            </p>
            <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16 }}>for {confirm.position}</p>
            <p style={{ fontSize: 11, color: 'var(--gray)', padding: '8px 12px', background: 'var(--light)', borderRadius: 8, marginBottom: 24 }}>⚠️ This cannot be undone</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="cv-btn cv-btn-outline" onClick={() => setConfirm(null)} disabled={submitting}>Cancel</button>
              <button className="cv-btn cv-btn-success" onClick={castVote} disabled={submitting}>
                {submitting ? <><span className="cv-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting…</> : 'Confirm Vote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="cv-fade-up" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="cv-badge" style={{ background: 'rgba(200,150,12,0.12)', color: 'var(--gold)', marginBottom: 8 }}>
              {election.status === 'open' ? '🟢 Election Open' : '🔴 Election Closed'}
            </span>
            <h1 style={{ fontSize: 32, marginTop: 6 }}>{activeTab === 'vote' ? 'Cast Your Vote' : 'My Vote History'}</h1>
            <p style={{ color: 'var(--gray)', marginTop: 6 }}>
              Hello, {user.name.split(' ')[0]}. {activeTab === 'vote' ? 'Select one candidate per eligible position.' : 'Your voting record for this election.'}
            </p>
          </div>
          {election.endDate && (
            <div style={{ background: 'var(--navy)', color: '#fff', borderRadius: 12, padding: '14px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--gold2)', fontWeight: 600, letterSpacing: '1px' }}>CLOSES</div>
              <div style={{ fontSize: 18, fontFamily: "'DM Serif Display',serif", marginTop: 2 }}>{election.endDate}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 24, borderBottom: '2px solid #e8edf5' }}>
          {(['vote', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none', padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              color: activeTab === tab ? 'var(--navy2)' : 'var(--gray)',
              borderBottom: activeTab === tab ? '2px solid var(--navy2)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.18s',
            }}>
              {tab === 'vote' ? '🗳️ Vote' : '📋 My Votes'}
              {tab === 'history' && voteHistory.length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--navy2)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '2px 6px', fontWeight: 700 }}>{voteHistory.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        {activeTab === 'vote' && (
          <div className="cv-card" style={{ marginTop: 20, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Voting progress</span>
              <span style={{ fontSize: 13, color: 'var(--gray)' }}>
                {eligiblePositions.filter(p => !!voted[p]).length} / {eligiblePositions.length} eligible positions
              </span>
            </div>
            <div style={{ height: 8, background: '#e8edf5', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${eligiblePositions.length ? (eligiblePositions.filter(p => !!voted[p]).length / eligiblePositions.length) * 100 : 0}%`,
                background: allVoted ? 'linear-gradient(90deg,#1a7a4a,#2ecc71)' : 'linear-gradient(90deg,var(--navy2),var(--gold))',
                transition: 'width 0.6s ease',
              }} />
            </div>
            {allVoted && <p style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginTop: 8 }}>✓ You've voted in all your eligible positions!</p>}
          </div>
        )}
      </div>

      {/* Subgroup banner */}
      {activeTab === 'vote' && <SubgroupBanner user={user} positionConfigs={positionConfigs} />}

      {/* History tab */}
      {activeTab === 'history' && <VoteHistoryPanel voteHistory={voteHistory} />}

      {/* Vote tab */}
      {activeTab === 'vote' && <>
        {/* Eligible positions */}
        {eligiblePositions.map((position, pi) => {
          const positionCandidates = candidates.filter(c => c.position === position)
          const hasVoted   = !!voted[position]
          const config     = positionConfigs.find(p => p.position === position)
          const restricted = config && config.eligibleGrades.length > 0
          return (
            <div key={position} className="cv-fade-up" style={{ animationDelay: `${pi * 0.1}s`, marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 22 }}>{position}</h2>
                {restricted && (
                  <span className="cv-badge" style={{ background: 'rgba(200,150,12,0.12)', color: 'var(--gold)' }}>
                    🎓 {config!.eligibleGrades.join(', ')} Only
                  </span>
                )}
                {hasVoted && <span className="cv-badge" style={{ background: '#f0fdf4', color: 'var(--green)' }}>✓ Voted</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
                {positionCandidates.map((c, ci) => {
                  const isVoted = voted[position] === c.id
                  const color   = COLORS[ci % COLORS.length]
                  return (
                    <div key={c.id} style={{
                      background: 'var(--white)', borderRadius: 16, padding: 22,
                      border: `2px solid ${isVoted ? 'var(--green)' : '#e8edf5'}`,
                      boxShadow: isVoted ? '0 0 0 4px rgba(26,122,74,0.1)' : 'var(--shadow)',
                      opacity: hasVoted && !isVoted ? 0.5 : 1, transition: 'all 0.3s',
                    }}>
                      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 50, height: 50, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: "'DM Serif Display', serif" }}>{initials(c.name)}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{c.position}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.7, marginBottom: 16 }}>{c.description}</p>
                      {isVoted
                        ? <div style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 700, fontSize: 14, padding: 10, background: '#f0fdf4', borderRadius: 8 }}>✓ Your Vote</div>
                        : <button className="cv-btn cv-btn-navy cv-btn-full" disabled={hasVoted || election.status !== 'open'} onClick={() => setConfirm({ id: c.id, position })}>
                            Vote for {c.name.split(' ')[0]}
                          </button>
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Ineligible positions — shown locked */}
        {ineligiblePositions.length > 0 && (
          <div className="cv-fade-up" style={{ marginTop: 8 }}>
            <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 16, background: '#fafbff', border: '1px solid #e8edf5', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Not on your ballot</div>
                <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>These positions are restricted to other grade levels.</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
              {ineligiblePositions.map(position => {
                const config = positionConfigs.find(p => p.position === position)
                return (
                  <div key={position} style={{ background: 'var(--white)', borderRadius: 16, padding: 22, border: '2px solid #e8edf5', opacity: 0.45 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>🔒</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{position}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{config?.eligibleGrades.join(', ')} students only</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--gray)' }}>You are not eligible to vote in this position.</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {election.status !== 'open' && (
          <div className="cv-card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <h2>Election is Closed</h2>
            <p style={{ marginTop: 8 }}>Voting has ended. Check the Results tab to see the outcome.</p>
          </div>
        )}
      </>}
    </div>
  )
}