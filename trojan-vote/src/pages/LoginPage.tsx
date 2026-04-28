import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { AppUser } from '../App'

type Props = { onLogin: (u: AppUser) => void }

const GRADE_LEVELS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']

const MAJORS = [
  'Accounting', 'Biology', 'Business Administration', 'Chemistry',
  'Communications', 'Computer Science', 'Criminal Justice', 'Education',
  'Engineering Technology', 'English', 'Finance', 'History',
  'Mathematics', 'Music', 'Nursing', 'Physical Education',
  'Political Science', 'Psychology', 'Social Work', 'Sociology',
  'Other',
]

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode]           = useState<'login' | 'signup'>('login')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [name, setName]           = useState('')
  const [studentId, setStudentId] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [major, setMajor]         = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const resetForm = () => {
    setEmail(''); setPassword(''); setName('')
    setStudentId(''); setGradeLevel(''); setMajor('')
    setError('')
  }

  const handle = async () => {
    setError('')

    if (!email || !password) { setError('Please fill in all fields.'); return }

    const emailLower = email.toLowerCase().trim()
    const isValidEmail = emailLower.endsWith('@vsu.edu') || emailLower.endsWith('@students.vsu.edu')
    if (!isValidEmail) { setError('You must use your VSU email (@vsu.edu or @students.vsu.edu).'); return }

    if (mode === 'signup') {
      if (!name.trim())       { setError('Please enter your full name.'); return }
      if (!studentId.trim())  { setError('Please enter your VSU Student ID.'); return }
      if (!/^\d{6,9}$/.test(studentId.trim())) { setError('Student ID must be 6–9 digits.'); return }
      if (!gradeLevel)        { setError('Please select your grade level.'); return }
      if (!major)             { setError('Please select your major.'); return }
    }

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, emailLower, password)
        const snap = await getDoc(doc(db, 'users', cred.user.uid))
        const data = snap.exists() ? snap.data() : {}
        const role: 'student' | 'admin' = data.role ?? 'student'

        onLogin({
          uid:        cred.user.uid,
          name:       cred.user.displayName || emailLower.split('@')[0],
          email:      cred.user.email || emailLower,
          role,
          gradeLevel: data.gradeLevel,
          major:      data.major,
          studentId:  data.studentId,
        })
      } else {
        const cred = await createUserWithEmailAndPassword(auth, emailLower, password)
        await updateProfile(cred.user, { displayName: name.trim() })

        const userData = {
          name:       name.trim(),
          email:      emailLower,
          role:       'student',
          studentId:  studentId.trim(),
          gradeLevel,
          major,
          createdAt:  serverTimestamp(),
        }

        await setDoc(doc(db, 'users', cred.user.uid), userData)

        onLogin({
          uid:        cred.user.uid,
          name:       name.trim(),
          email:      emailLower,
          role:       'student',
          gradeLevel,
          major,
          studentId:  studentId.trim(),
        })
      }
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found':       'No account found with that email.',
        'auth/wrong-password':       'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/too-many-requests':    'Too many attempts. Please try again later.',
        'auth/invalid-credential':   'Invalid email or password.',
      }
      setError(msg[err.code] || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch' }}>

      {/* ── Left panel ── */}
      <div style={{
        width: '44%', background: 'var(--navy)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: 52, position: 'relative', overflow: 'hidden',
      }}>
        {[280, 200, 130].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            top: '50%', left: '50%', width: s, height: s,
            transform: 'translate(-50%,-50%)',
            border: `1px solid rgba(200,150,12,${0.07 + i * 0.06})`,
            pointerEvents: 'none',
          }} />
        ))}
        <div className="cv-fade-up" style={{ position: 'relative', textAlign: 'center', color: '#fff' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'var(--gold)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 24px',
            fontSize: 44, fontWeight: 700, color: 'var(--navy)',
            fontFamily: "'DM Serif Display', serif",
          }}>V</div>
          <h1 style={{ fontSize: 38, color: '#fff', marginBottom: 12 }}>CampusVote</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, maxWidth: 260, lineHeight: 1.8, margin: '0 auto' }}>
            Virginia State University's official student government election platform.
          </p>
          <div style={{
            marginTop: 40, padding: '18px 24px', borderRadius: 14,
            background: 'rgba(200,150,12,0.1)', border: '1px solid rgba(200,150,12,0.22)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--gold2)', fontWeight: 600, letterSpacing: '1.2px', marginBottom: 6 }}>
              SPRING 2026 ELECTION
            </div>
            <div style={{ fontSize: 26, fontFamily: "'DM Serif Display',serif" }}>Polls Are Open</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
              Closes May 20, 2026
            </div>
          </div>

          {/* Registration benefits — shown on signup */}
          {mode === 'signup' && (
            <div className="cv-fade-in" style={{ marginTop: 28, textAlign: 'left' }}>
              {[
                'Vote in all open elections',
                'Get election reminders',
                'Vote in your class elections',
                'Track your vote history',
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: 'var(--gold2)', fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 52px',
        background: 'var(--cream)', overflowY: 'auto',
      }}>
        <div className="cv-fade-up cv-d1" style={{ width: '100%', maxWidth: 420 }}>
          <h2 style={{ fontSize: 28, marginBottom: 6 }}>
            {mode === 'login' ? 'Welcome back' : 'Register to Vote'}
          </h2>
          <p style={{ color: 'var(--gray)', marginBottom: 28, fontSize: 14 }}>
            {mode === 'login'
              ? 'Sign in with your VSU email to cast your vote.'
              : 'Create your voter account with your VSU credentials.'}
          </p>

          {error && <div className="cv-error-box" style={{ marginBottom: 20 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Signup-only fields ── */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="cv-label">Full Name *</label>
                  <input className="cv-input" placeholder="e.g. Kyra Evans"
                    value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div>
                  <label className="cv-label">VSU Student ID *</label>
                  <input className="cv-input" placeholder="e.g. 900123456"
                    value={studentId} onChange={e => setStudentId(e.target.value)}
                    maxLength={9} inputMode="numeric" />
                  <p style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>
                    Found on your VSU ID card or myVSU portal
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="cv-label">Grade Level *</label>
                    <select className="cv-input" value={gradeLevel}
                      onChange={e => setGradeLevel(e.target.value)}
                      style={{ appearance: 'auto', cursor: 'pointer' }}>
                      <option value="">Select…</option>
                      {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="cv-label">Major *</label>
                    <select className="cv-input" value={major}
                      onChange={e => setMajor(e.target.value)}
                      style={{ appearance: 'auto', cursor: 'pointer' }}>
                      <option value="">Select…</option>
                      {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid #e8edf5', paddingTop: 4 }} />
              </>
            )}

            {/* ── Always visible ── */}
            <div>
              <label className="cv-label">VSU Email *</label>
              <input className="cv-input" type="email"
                placeholder="yourname@vsu.edu or @students.vsu.edu"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="cv-label">Password *</label>
              <input className="cv-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handle()} />
              {mode === 'signup' && (
                <p style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>Minimum 6 characters</p>
              )}
            </div>

            <button
              className="cv-btn cv-btn-primary cv-btn-lg cv-btn-full"
              onClick={handle}
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading
                ? <><span className="cv-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                : mode === 'login' ? 'Sign In' : 'Register & Continue'
              }
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
              <button style={{
                background: 'none', border: 'none', color: 'var(--navy2)',
                fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: 13,
              }}
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); resetForm() }}
              >
                {mode === 'login' ? 'Register to vote' : 'Sign in'}
              </button>
            </p>
          </div>

          <div style={{
            marginTop: 24, padding: 14, borderRadius: 10,
            background: 'var(--light)', fontSize: 12, color: 'var(--gray)', textAlign: 'center',
          }}>
            🔒 Secured by Firebase Authentication · VSU Students Only
          </div>
        </div>
      </div>
    </div>
  )
}