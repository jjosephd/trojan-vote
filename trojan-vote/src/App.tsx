import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './lib/firebase'
import LoginPage from './pages/LoginPage'
import StudentDashboard from './pages/StudentDashboard'
import CandidatesPage from './pages/CandidatesPage'
import AdminDashboard from './pages/AdminDashboard'
import ResultsPage from './pages/ResultsPage'
import NavBar from './components/NavBar'
import './App.css'

export type AppUser = {
  uid: string
  name: string
  email: string
  role: 'student' | 'admin'
  gradeLevel?: string   // Freshman | Sophomore | Junior | Senior | Graduate
  major?: string        // used for voting subgroups
  studentId?: string    // VSU student ID
}

export type Page = 'dashboard' | 'candidates' | 'results' | 'admin'

export default function App() {
  const [user, setUser]       = useState<AppUser | null>(null)
  const [page, setPage]       = useState<Page>('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        let role: 'student' | 'admin' = 'student'
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (snap.exists()) role = snap.data().role ?? 'student'
        } catch (_) {}

        setUser({
          uid:   firebaseUser.uid,
          name:  firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
          email: firebaseUser.email || '',
          role,
        })
        setPage(role === 'admin' ? 'admin' : 'dashboard')
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f2444',
    }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div className="cv-spinner" />
        <p style={{
          marginTop: 16,
          fontFamily: 'DM Sans, sans-serif',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 14,
        }}>
          Loading CampusVote…
        </p>
      </div>
    </div>
  )

  if (!user) return <LoginPage onLogin={setUser} />

  return (
    <>
      <NavBar
        page={page}
        setPage={setPage}
        user={user}
        onLogout={() => {
          auth.signOut()
          setUser(null)
        }}
      />
      {page === 'dashboard'  && <StudentDashboard user={user} />}
      {page === 'candidates' && <CandidatesPage />}
      {page === 'results'    && <ResultsPage />}
      {page === 'admin'      && user.role === 'admin' && <AdminDashboard />}
      {page === 'admin'      && user.role !== 'admin' && (
        <div style={{ padding: 60, textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
          <h2>Access Denied</h2>
          <p style={{ color: '#6b7280', marginTop: 8 }}>
            You need admin privileges to view this page.
          </p>
        </div>
      )}
    </>
  )
}