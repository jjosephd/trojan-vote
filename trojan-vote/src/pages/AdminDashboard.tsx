import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { tallyResults, manageElection, manageCandidate } from '../lib/functions'

type CandidateResult = {
  id: string
  name: string
  position: string
  votes: number
}

type ElectionInfo = {
  id: string
  title: string
  status: string
  endDate?: string
}

type AuditLog = {
  id: string
  action: string
  userId?: string
  timestamp: string
  details?: string
}

type CandidateForm = {
  name: string
  position: string
  description: string
}

type ElectionForm = {
  title: string
  description: string
  startDate: string
  endDate: string
}

const MOCK_RESULTS: CandidateResult[] = [
  { id: 'c1', name: 'Aaliyah Johnson', position: 'Student Body President', votes: 142 },
  { id: 'c2', name: 'Marcus Webb',     position: 'Student Body President', votes: 98  },
  { id: 'c3', name: 'Priya Nkosi',     position: 'Vice President',         votes: 119 },
  { id: 'c4', name: 'Devon Carter',    position: 'Vice President',         votes: 87  },
]

const MOCK_LOGS: AuditLog[] = [
  { id: '1', action: 'OPEN_ELECTION',   timestamp: '4/22/2026, 9:00:00 AM',  details: 'Spring 2026 election opened' },
  { id: '2', action: 'CREATE_ELECTION', timestamp: '4/20/2026, 2:30:00 PM',  details: 'Election created by admin' },
  { id: '3', action: 'TALLY_RESULTS',   timestamp: '4/22/2026, 11:45:00 AM', details: '0 discrepancies found' },
  { id: '4', action: 'ADD_CANDIDATE',   timestamp: '4/21/2026, 10:00:00 AM', details: 'Candidate added: Aaliyah Johnson' },
  { id: '5', action: 'ADD_CANDIDATE',   timestamp: '4/21/2026, 10:05:00 AM', details: 'Candidate added: Marcus Webb' },
]

const COLORS = ['#0f2444', '#c8960c', '#1a4a2b', '#4a1a3a']

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  OPEN_ELECTION:    { bg: '#f0fdf4', color: '#1a7a4a' },
  CLOSE_ELECTION:   { bg: '#fef2f2', color: '#c0392b' },
  CREATE_ELECTION:  { bg: '#eff6ff', color: '#1a3a6b' },
  TALLY_RESULTS:    { bg: 'rgba(200,150,12,0.1)', color: '#c8960c' },
  ADD_CANDIDATE:    { bg: '#f5f3ff', color: '#4a1a6b' },
  REMOVE_CANDIDATE: { bg: '#fef2f2', color: '#c0392b' },
}

const EMPTY_CANDIDATE_FORM: CandidateForm = { name: '', position: '', description: '' }
const EMPTY_ELECTION_FORM: ElectionForm   = { title: '', description: '', startDate: '', endDate: '' }

// ── Donut Chart ────────────────────────────────────────────────────────────
function DonutChart({ data, total }: { data: { name: string; votes: number; color: string }[]; total: number }) {
  const size = 160, cx = size / 2, cy = size / 2, r = 56, ir = 36
  let cumAngle = -Math.PI / 2
  const slices = data.map(d => {
    const angle = (d.votes / total) * 2 * Math.PI
    const start = cumAngle
    cumAngle += angle
    return { ...d, startAngle: start, endAngle: cumAngle }
  })
  const arc = (startA: number, endA: number, outerR: number, innerR: number) => {
    const x1 = cx + outerR * Math.cos(startA), y1 = cy + outerR * Math.sin(startA)
    const x2 = cx + outerR * Math.cos(endA),   y2 = cy + outerR * Math.sin(endA)
    const x3 = cx + innerR * Math.cos(endA),   y3 = cy + innerR * Math.sin(endA)
    const x4 = cx + innerR * Math.cos(startA), y4 = cy + innerR * Math.sin(startA)
    const large = endA - startA > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={arc(s.startAngle, s.endAngle, r, ir)} fill={s.color}
            style={{ transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget as SVGPathElement).style.opacity = '0.8'}
            onMouseLeave={e => (e.currentTarget as SVGPathElement).style.opacity = '1'}
          ><title>{s.name}: {s.votes} votes ({Math.round((s.votes / total) * 100)}%)</title></path>
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Serif Display',serif", fill: '#0f2444' }}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 10, fill: '#6b7280' }}>votes</text>
      </svg>
      <div style={{ flex: 1, minWidth: 120 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.name.split(' ')[0]} {s.name.split(' ')[1]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>{s.votes} votes · {Math.round((s.votes / total) * 100)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [results, setResults]       = useState<CandidateResult[]>(MOCK_RESULTS)
  const [election, setElection]     = useState<ElectionInfo | null>(null)
  const [auditLogs, setAuditLogs]   = useState<AuditLog[]>(MOCK_LOGS)
  const [candidates, setCandidates] = useState<CandidateResult[]>(MOCK_RESULTS)
  const [loading, setLoading]       = useState(true)
  const [tallying, setTallying]     = useState(false)
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [activeTab, setActiveTab]   = useState<'results' | 'charts' | 'candidates' | 'election' | 'audit'>('results')
  const [liveIndicator, setLiveIndicator] = useState(false)

  // Candidate modal
  const [showCandidateModal, setShowCandidateModal] = useState(false)
  const [editCandidate, setEditCandidate]           = useState<CandidateResult | null>(null)
  const [candidateForm, setCandidateForm]           = useState<CandidateForm>(EMPTY_CANDIDATE_FORM)
  const [savingCandidate, setSavingCandidate]       = useState(false)

  // Election creation
  const [electionForm, setElectionForm]         = useState<ElectionForm>(EMPTY_ELECTION_FORM)
  const [creatingElection, setCreatingElection] = useState(false)
  const [showCreateSuccess, setShowCreateSuccess] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Real-time listener ───────────────────────────────────────────────────
  useEffect(() => {
    let unsubVotes: (() => void) | null = null

    const init = async () => {
      try {
        const elSnap = await getDocs(query(collection(db, 'elections'), where('status', '==', 'open')))
        if (!elSnap.empty) {
          const elDoc = elSnap.docs[0]
          setElection({ id: elDoc.id, ...elDoc.data() } as ElectionInfo)

          try {
            const res = await tallyResults({ electionId: elDoc.id })
            const data = res.data as any
            if (data?.results) { setResults(data.results); setCandidates(data.results) }
          } catch (_) {}

          const cSnap = await getDocs(query(collection(db, 'candidates'), where('electionId', '==', elDoc.id)))
          if (!cSnap.empty) {
            setCandidates(cSnap.docs.map(d => ({ id: d.id, votes: 0, ...d.data() } as CandidateResult)))
          }

          // Live vote updates
          unsubVotes = onSnapshot(
            query(collection(db, 'votes'), where('electionId', '==', elDoc.id)),
            async () => {
              setLiveIndicator(true)
              setTimeout(() => setLiveIndicator(false), 1500)
              try {
                const res = await tallyResults({ electionId: elDoc.id })
                const data = res.data as any
                if (data?.results) setResults(data.results)
              } catch (_) {}
            }
          )

          try {
            const logSnap = await getDocs(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(20)))
            if (!logSnap.empty) {
              setAuditLogs(logSnap.docs.map(d => ({
                id: d.id, ...d.data(),
                timestamp: d.data().timestamp?.toDate?.()?.toLocaleString() || 'Unknown',
              } as AuditLog)))
            }
          } catch (_) {}
        }
      } catch (_) {}
      finally { setLoading(false) }
    }

    init()
    return () => { if (unsubVotes) unsubVotes() }
  }, [])

  const handleTally = async () => {
    if (!election) return
    setTallying(true)
    try {
      const res = await tallyResults({ electionId: election.id })
      const data = res.data as any
      if (data?.results) setResults(data.results)
      showToast('Results refreshed!', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to tally.', 'error')
    } finally { setTallying(false) }
  }

  const handleCloseElection = async () => {
    if (!election || !window.confirm('Are you sure you want to close this election?')) return
    try {
      await manageElection({ action: 'close', electionId: election.id })
      setElection(e => e ? { ...e, status: 'closed' } : e)
      showToast('Election closed.', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to close election.', 'error')
    }
  }

  const handleOpenElection = async () => {
    if (!election || !window.confirm('Open this election for voting?')) return
    try {
      await manageElection({ action: 'open', electionId: election.id })
      setElection(e => e ? { ...e, status: 'open' } : e)
      showToast('Election is now open!', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to open election.', 'error')
    }
  }

  // ── Election Creation ────────────────────────────────────────────────────
  const handleCreateElection = async () => {
    if (!electionForm.title.trim()) { showToast('Title is required.', 'error'); return }
    if (!electionForm.endDate)      { showToast('End date is required.', 'error'); return }
    setCreatingElection(true)
    try {
      await manageElection({
        action: 'create',
        data: {
          title:       electionForm.title.trim(),
          description: electionForm.description.trim(),
          startDate:   electionForm.startDate,
          endDate:     electionForm.endDate,
        },
      })
      setShowCreateSuccess(true)
      setElectionForm(EMPTY_ELECTION_FORM)
      showToast('Election created!', 'success')
      setTimeout(() => window.location.reload(), 2000)
    } catch (err: any) {
      showToast(err.message || 'Failed to create election.', 'error')
    } finally { setCreatingElection(false) }
  }

  // ── Candidate Management ─────────────────────────────────────────────────
  const openAddCandidate  = () => { setCandidateForm(EMPTY_CANDIDATE_FORM); setEditCandidate(null); setShowCandidateModal(true) }
  const openEditCandidate = (c: CandidateResult) => {
    setCandidateForm({ name: c.name, position: c.position, description: (c as any).description || '' })
    setEditCandidate(c); setShowCandidateModal(true)
  }

  const handleSaveCandidate = async () => {
    if (!election) { showToast('No active election.', 'error'); return }
    if (!candidateForm.name.trim() || !candidateForm.position.trim()) { showToast('Name and position required.', 'error'); return }
    setSavingCandidate(true)
    try {
      if (editCandidate) {
        await manageCandidate({ action: 'edit', electionId: election.id, candidateId: editCandidate.id, data: { name: candidateForm.name.trim(), position: candidateForm.position.trim(), description: candidateForm.description.trim() } })
        setCandidates(cs => cs.map(c => c.id === editCandidate.id ? { ...c, name: candidateForm.name.trim(), position: candidateForm.position.trim() } : c))
        showToast('Candidate updated!', 'success')
      } else {
        const res = await manageCandidate({ action: 'add', electionId: election.id, data: { name: candidateForm.name.trim(), position: candidateForm.position.trim(), description: candidateForm.description.trim() } })
        const newId = (res.data as any)?.candidateId || Date.now().toString()
        setCandidates(cs => [...cs, { id: newId, name: candidateForm.name.trim(), position: candidateForm.position.trim(), votes: 0 }])
        showToast('Candidate added!', 'success')
      }
      setShowCandidateModal(false)
    } catch (err: any) {
      showToast(err.message || 'Failed to save.', 'error')
    } finally { setSavingCandidate(false) }
  }

  const handleRemoveCandidate = async (c: CandidateResult) => {
    if (!election || !window.confirm(`Remove ${c.name}? This cannot be undone.`)) return
    try {
      await manageCandidate({ action: 'remove', electionId: election.id, candidateId: c.id })
      setCandidates(cs => cs.filter(x => x.id !== c.id))
      showToast('Candidate removed.', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to remove.', 'error')
    }
  }

  const positions  = [...new Set(results.map(r => r.position))]
  const totalVotes = results.reduce((s, r) => s + r.votes, 0)
  const initials   = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="cv-spinner" />
    </div>
  )

  return (
    <div className="cv-page-wide">
      {toast && <div className={`cv-toast cv-toast-${toast.type}`}>{toast.msg}</div>}

      {/* Candidate Modal */}
      {showCandidateModal && (
        <div className="cv-overlay" onClick={() => !savingCandidate && setShowCandidateModal(false)}>
          <div className="cv-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '100%', padding: 36 }}>
            <h2 style={{ fontSize: 22, marginBottom: 6 }}>{editCandidate ? 'Edit Candidate' : 'Add Candidate'}</h2>
            <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 24 }}>
              {editCandidate ? `Editing ${editCandidate.name}` : 'Add a new candidate to the election.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="cv-label">Full Name *</label>
                <input className="cv-input" placeholder="e.g. Jordan Smith" value={candidateForm.name} onChange={e => setCandidateForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="cv-label">Position *</label>
                <input className="cv-input" placeholder="e.g. Student Body President" value={candidateForm.position} onChange={e => setCandidateForm(f => ({ ...f, position: e.target.value }))} />
              </div>
              <div>
                <label className="cv-label">Bio / Description</label>
                <textarea className="cv-input" placeholder="Brief candidate description..." value={candidateForm.description} onChange={e => setCandidateForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="cv-btn cv-btn-outline" onClick={() => setShowCandidateModal(false)} disabled={savingCandidate}>Cancel</button>
              <button className="cv-btn cv-btn-primary" onClick={handleSaveCandidate} disabled={savingCandidate}>
                {savingCandidate ? <><span className="cv-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</> : editCandidate ? 'Save Changes' : 'Add Candidate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="cv-fade-up" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="cv-badge" style={{ background: 'rgba(200,150,12,0.12)', color: 'var(--gold)', marginBottom: 8 }}>Admin Dashboard</span>
            <h1 style={{ fontSize: 32, marginTop: 6 }}>Election Control Center</h1>
            <p style={{ color: 'var(--gray)', marginTop: 4 }}>{election?.title ?? 'No active election — create one in the Election tab'}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {liveIndicator && (
              <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                LIVE UPDATE
              </span>
            )}
            <button className="cv-btn cv-btn-outline cv-btn-sm" onClick={handleTally} disabled={tallying}>
              {tallying ? <><span className="cv-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Tallying…</> : '🔄 Refresh'}
            </button>
            {election?.status === 'closed' && <button className="cv-btn cv-btn-success cv-btn-sm" onClick={handleOpenElection}>🟢 Open Election</button>}
            {election?.status === 'open'   && <button className="cv-btn cv-btn-danger cv-btn-sm"  onClick={handleCloseElection}>🔒 Close Election</button>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 24, borderBottom: '2px solid #e8edf5', flexWrap: 'wrap' }}>
          {(['results', 'charts', 'candidates', 'election', 'audit'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none', padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: activeTab === tab ? 'var(--navy2)' : 'var(--gray)',
              borderBottom: activeTab === tab ? '2px solid var(--navy2)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.18s',
            }}>
              {tab === 'results' ? '📊 Results' : tab === 'charts' ? '🥧 Charts' : tab === 'candidates' ? '👤 Candidates' : tab === 'election' ? '⚡ Election' : '📋 Audit Log'}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="cv-fade-up cv-d1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Votes Cast',   value: totalVotes,                 icon: '🗳️' },
          { label: 'Candidates Running', value: candidates.length,          icon: '👤' },
          { label: 'Positions Open',     value: positions.length,           icon: '🏆' },
          { label: 'Election Status',    value: election?.status ?? 'none', icon: election?.status === 'open' ? '🟢' : '🔴' },
        ].map(s => (
          <div key={s.label} className="cv-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontFamily: "'DM Serif Display',serif", color: 'var(--navy2)', textTransform: 'capitalize' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24 }}>
          {positions.map((position, pi) => {
            const posResults = results.filter(r => r.position === position).sort((a, b) => b.votes - a.votes)
            const posTotal   = posResults.reduce((s, r) => s + r.votes, 0)
            const maxVotes   = posResults[0]?.votes || 1
            const leader     = posResults[0]
            return (
              <div key={position} className="cv-card cv-fade-up" style={{ animationDelay: `${pi * 0.12}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 20 }}>{position}</h2>
                  <span className="cv-badge" style={{ background: 'var(--light)', color: 'var(--navy2)' }}>{posTotal} votes</span>
                </div>
                {leader && (
                  <div style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy2))', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--navy)', fontFamily: "'DM Serif Display',serif", flexShrink: 0 }}>{initials(leader.name)}</div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--gold2)', fontWeight: 600, letterSpacing: '1px' }}>LEADING</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{leader.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{leader.votes} votes · {posTotal ? Math.round((leader.votes / posTotal) * 100) : 0}%</div>
                    </div>
                  </div>
                )}
                {posResults.map((r, ri) => (
                  <div key={r.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: COLORS[ri % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: "'DM Serif Display',serif" }}>{initials(r.name)}</div>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy2)' }}>{r.votes}<span style={{ color: 'var(--gray)', fontWeight: 400, fontSize: 11 }}> votes</span></span>
                    </div>
                    <div style={{ height: 10, background: '#e8edf5', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 5, background: COLORS[ri % COLORS.length], width: `${(r.votes / maxVotes) * 100}%`, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
                {posTotal > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 16, borderRadius: 4, overflow: 'hidden', height: 6 }}>
                    {posResults.map((r, ri) => <div key={r.id} title={`${r.name}: ${r.votes}`} style={{ flex: r.votes, background: COLORS[ri % COLORS.length], transition: 'flex 0.8s ease' }} />)}
                  </div>
                )}
              </div>
            )
          })}
          {positions.length === 0 && (
            <div className="cv-card" style={{ textAlign: 'center', padding: 48, color: 'var(--gray)', gridColumn: '1/-1' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <h3 style={{ color: 'var(--navy)', marginBottom: 8 }}>No results yet</h3>
              <p>Results will appear here once votes are cast.</p>
            </div>
          )}
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {positions.map((position, pi) => {
            const posResults = results.filter(r => r.position === position).sort((a, b) => b.votes - a.votes)
            const posTotal   = posResults.reduce((s, r) => s + r.votes, 0)
            const chartData  = posResults.map((r, i) => ({ name: r.name, votes: r.votes, color: COLORS[i % COLORS.length] }))
            return (
              <div key={position} className="cv-card cv-fade-up" style={{ animationDelay: `${pi * 0.12}s` }}>
                <h2 style={{ fontSize: 18, marginBottom: 20 }}>{position}</h2>
                <DonutChart data={chartData} total={posTotal} />
                <div style={{ marginTop: 20, borderTop: '1px solid #f0f4ff', paddingTop: 16 }}>
                  {posResults.map((r, ri) => (
                    <div key={r.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{r.name}</span>
                        <span style={{ color: 'var(--gray)' }}>{posTotal ? Math.round((r.votes / posTotal) * 100) : 0}%</span>
                      </div>
                      <div style={{ height: 6, background: '#e8edf5', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${posTotal ? (r.votes / posTotal) * 100 : 0}%`, background: COLORS[ri % COLORS.length], transition: 'width 1.2s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          <div className="cv-card cv-fade-up cv-d2">
            <h2 style={{ fontSize: 18, marginBottom: 20 }}>Overall Turnout</h2>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 56, fontFamily: "'DM Serif Display',serif", color: 'var(--navy2)' }}>{totalVotes}</div>
              <div style={{ fontSize: 14, color: 'var(--gray)', marginTop: 4 }}>total votes cast</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {positions.map((pos, i) => {
                const posTotal = results.filter(r => r.position === pos).reduce((s, r) => s + r.votes, 0)
                return (
                  <div key={pos} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', background: 'var(--light)', borderRadius: 10 }}>
                    <div style={{ fontSize: 22, fontFamily: "'DM Serif Display',serif", color: COLORS[i % COLORS.length] }}>{posTotal}</div>
                    <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 2, lineHeight: 1.3 }}>{pos}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div className="cv-fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 22 }}>Manage Candidates</h2>
              <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>Add, edit, or remove candidates for the current election.</p>
            </div>
            <button className="cv-btn cv-btn-primary" onClick={openAddCandidate}>+ Add Candidate</button>
          </div>
          {[...new Set(candidates.map(c => c.position))].map(position => (
            <div key={position} style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 16, color: 'var(--navy2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
                {position}
                <span className="cv-badge" style={{ background: 'var(--light)', color: 'var(--gray)' }}>{candidates.filter(c => c.position === position).length} candidates</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {candidates.filter(c => c.position === position).map((c, ci) => (
                  <div key={c.id} className="cv-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: COLORS[ci % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'DM Serif Display',serif" }}>{initials(c.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{c.position}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="cv-btn cv-btn-outline cv-btn-sm" onClick={() => openEditCandidate(c)} style={{ padding: '6px 12px', fontSize: 12 }}>✏️ Edit</button>
                      <button className="cv-btn cv-btn-sm" onClick={() => handleRemoveCandidate(c)} style={{ padding: '6px 12px', fontSize: 12, background: '#fef2f2', color: 'var(--red)', border: '1px solid #fca5a5' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="cv-card" style={{ textAlign: 'center', padding: 48, color: 'var(--gray)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
              <h3 style={{ marginBottom: 8, color: 'var(--navy)' }}>No candidates yet</h3>
              <p style={{ fontSize: 14, marginBottom: 20 }}>Add candidates to the election to get started.</p>
              <button className="cv-btn cv-btn-primary" onClick={openAddCandidate}>+ Add First Candidate</button>
            </div>
          )}
        </div>
      )}

      {/* Election Tab */}
      {activeTab === 'election' && (
        <div className="cv-fade-up" style={{ maxWidth: 600 }}>
          {election && (
            <div className="cv-card" style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20 }}>Current Election</h2>
                <span className="cv-badge" style={{ background: election.status === 'open' ? '#f0fdf4' : '#fef2f2', color: election.status === 'open' ? 'var(--green)' : 'var(--red)' }}>
                  {election.status === 'open' ? '🟢 Open' : '🔴 Closed'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Title</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{election.title}</div>
                </div>
                {election.endDate && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>End Date</div>
                    <div style={{ fontWeight: 600 }}>{election.endDate}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {election.status === 'open'
                  ? <button className="cv-btn cv-btn-danger cv-btn-sm" onClick={handleCloseElection}>🔒 Close Election</button>
                  : <button className="cv-btn cv-btn-success cv-btn-sm" onClick={handleOpenElection}>🟢 Open Election</button>
                }
              </div>
            </div>
          )}

          <div className="cv-card">
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>Create New Election</h2>
            <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 24 }}>
              Set up a new election. After creating, add candidates in the Candidates tab then open it for voting.
            </p>
            {showCreateSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <h3 style={{ marginBottom: 8 }}>Election Created!</h3>
                <p style={{ color: 'var(--gray)', fontSize: 14 }}>Reloading dashboard…</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="cv-label">Election Title *</label>
                  <input className="cv-input" placeholder="e.g. Fall 2026 Student Government Election" value={electionForm.title} onChange={e => setElectionForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="cv-label">Description</label>
                  <textarea className="cv-input" placeholder="Brief description..." value={electionForm.description} onChange={e => setElectionForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="cv-label">Start Date</label>
                    <input className="cv-input" type="date" value={electionForm.startDate} onChange={e => setElectionForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="cv-label">End Date *</label>
                    <input className="cv-input" type="date" value={electionForm.endDate} onChange={e => setElectionForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--light)', fontSize: 12, color: 'var(--gray)' }}>
                  ℹ️ Election starts in <strong>pending</strong> status. Open it manually when ready.
                </div>
                <button className="cv-btn cv-btn-primary" onClick={handleCreateElection} disabled={creatingElection} style={{ alignSelf: 'flex-start' }}>
                  {creatingElection ? <><span className="cv-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Creating…</> : '⚡ Create Election'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="cv-card cv-fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20 }}>System Audit Log</h2>
            <span className="cv-badge" style={{ background: 'var(--light)', color: 'var(--navy2)' }}>{auditLogs.length} entries</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e8edf5' }}>
                  {['Action', 'Details', 'Timestamp'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, i) => {
                  const s = ACTION_COLORS[log.action] ?? { bg: 'var(--light)', color: 'var(--navy2)' }
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f0f4ff', background: i % 2 === 0 ? 'transparent' : '#fafbff' }}>
                      <td style={{ padding: '12px' }}><span className="cv-badge" style={{ background: s.bg, color: s.color }}>{log.action}</span></td>
                      <td style={{ padding: '12px', color: 'var(--gray)' }}>{log.details || '—'}</td>
                      <td style={{ padding: '12px', color: 'var(--gray)', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {auditLogs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <p>No audit logs yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Export */}
      <div className="cv-fade-up cv-d4" style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="cv-btn cv-btn-navy" onClick={() => {
          const csv = ['Candidate,Position,Votes', ...results.map(r => `${r.name},${r.position},${r.votes}`)].join('\n')
          const blob = new Blob([csv], { type: 'text/csv' })
          const url  = URL.createObjectURL(blob)
          const a    = document.createElement('a')
          a.href = url; a.download = 'campusvote-results.csv'; a.click()
          URL.revokeObjectURL(url)
        }}>📥 Export CSV</button>
      </div>
    </div>
  )
}