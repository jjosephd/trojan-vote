import type { AppUser, Page } from '../App'

type Props = {
  page: Page
  setPage: (p: Page) => void
  user: AppUser
  onLogout: () => void
}

export default function NavBar({ page, setPage, user, onLogout }: Props) {
  const initials  = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const homePage: Page = user.role === 'admin' ? 'admin' : 'dashboard'

  const navItems: { id: Page; label: string }[] = user.role === 'admin'
    ? [
        { id: 'admin',      label: 'Dashboard'  },
        { id: 'candidates', label: 'Candidates' },
        { id: 'results',    label: 'Results'    },
      ]
    : [
        { id: 'dashboard',  label: 'Vote'       },
        { id: 'candidates', label: 'Candidates' },
        { id: 'results',    label: 'Results'    },
      ]

  return (
    <nav style={{
      background: 'var(--navy)', color: '#fff',
      padding: '0 28px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 200,
      boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
    }}>
      {/* Logo — clicking brings you home */}
      <button
        onClick={() => setPage(homePage)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 8px 6px 0', borderRadius: 8,
          transition: 'opacity 0.18s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        title="Go to home"
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--gold)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18, fontWeight: 700,
          color: 'var(--navy)', fontFamily: "'DM Serif Display', serif",
        }}>V</div>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, letterSpacing: '-0.3px', color: '#fff' }}>
          CampusVote
        </span>
      </button>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            background: page === n.id ? 'rgba(200,150,12,0.18)' : 'transparent',
            color: page === n.id ? 'var(--gold2)' : 'rgba(255,255,255,0.65)',
            border: 'none', padding: '8px 18px', borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            borderBottom: page === n.id ? '2px solid var(--gold)' : '2px solid transparent',
            transition: 'all 0.18s',
          }}>{n.label}</button>
        ))}
      </div>

      {/* User + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: 10, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {user.role}
          </div>
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--gold)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--navy)',
        }}>{initials}</div>
        <button onClick={onLogout} style={{
          background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
          padding: '6px 13px', fontSize: 12, cursor: 'pointer',
        }}>Logout</button>
      </div>
    </nav>
  )
}