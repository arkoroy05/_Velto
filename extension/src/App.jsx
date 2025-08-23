import { useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'

function BottomNav() {
  const { pathname } = useLocation()
  const Item = ({ to, label, icon }) => (
    <Link
      to={to}
      className={`flex-1 flex flex-col items-center justify-center py-2 text-xs ${
        pathname === to ? 'text-white' : 'text-gray-300 hover:text-white'
      }`}
      aria-current={pathname === to ? 'page' : undefined}
    >
      <div aria-hidden>{icon}</div>
      <div>{label}</div>
    </Link>
  )
  return (
    <nav className="fixed bottom-0 left-0 right-0 w-[380px] mx-auto border-t border-gray-700 bg-[#1a1f3a] flex">
      <Item to="/" label="Dashboard" icon="📊" />
      <Item to="/search" label="Search" icon="🔍" />
      <Item to="/capture" label="Capture" icon="📸" />
    </nav>
  )
}

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // simple auth gate
  useEffect(() => {
    chrome.storage.local.get(['velto_settings']).then((res) => {
      const loggedIn = !!res?.velto_settings?.loggedIn
      if (!loggedIn && pathname !== '/login') {
        navigate('/login', { replace: true })
      } else if (loggedIn && pathname === '/') {
        // Dashboard is already at root, no need to redirect
        // navigate('/dashboard', { replace: true })
      }
    })
  }, [navigate, pathname])

  return (
    <div className="h-[600px] w-[380px] bg-[#1a1f3a] text-gray-200 relative">
      {pathname !== '/login' && (
        <header className="flex items-center justify-between p-3 border-b border-gray-700">
          <span aria-label="Velto" className="text-white font-semibold">Velto</span>
          <Link to="/settings" className="text-gray-300 hover:text-white text-sm">⚙️</Link>
        </header>
      )}
      <main className={
        `p-3 overflow-auto ${
          pathname !== '/login' ? 'pb-14 h-[calc(600px-48px)]' : 'h-[600px]'
        }`
      }>
        <Outlet />
      </main>
      {pathname !== '/login' && <BottomNav />}
    </div>
  )
}
