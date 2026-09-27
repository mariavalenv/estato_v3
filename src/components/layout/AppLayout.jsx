import { NavLink } from 'react-router-dom'
import { Home, Search, Sparkles, MessageSquare, Bot, User } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Home', to: '/dashboard', Icon: Home },
  { label: 'Discover', to: '/discover', Icon: Search },
  { label: 'Matches', to: '/matches', Icon: Sparkles },
  { label: 'Chats', to: '/chats', Icon: MessageSquare },
  { label: 'Agent', to: '/agent', Icon: Bot },
  { label: 'Account', to: '/account', Icon: User },
]

function NavItem({ label, to, Icon, mobile = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        mobile
          ? `flex flex-col items-center gap-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`
          : `flex items-center gap-3 px-4 py-2 rounded-btn text-body font-medium transition-all ${isActive ? 'text-accent bg-accent/10' : 'text-secondary hover:text-primary hover:bg-white/5'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={mobile ? 20 : 18} style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }} />
          <span className={mobile ? 'text-meta' : ''}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 px-4 py-8"
        style={{ background: 'var(--surface)', boxShadow: '1px 0 0 rgba(255,255,255,0.06)' }}
      >
        <div className="mb-10 px-4 tracking-widest text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          ✦ ESTATO
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>

        <div className="mt-auto px-4 pt-6 text-meta" style={{ color: 'var(--text-secondary)' }}>
          Humans decide. Agents help.
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-3 py-3"
        style={{ background: 'var(--surface)', boxShadow: '0 -1px 0 rgba(255,255,255,0.06)' }}
      >
        {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} mobile />)}
      </nav>
    </div>
  )
}
