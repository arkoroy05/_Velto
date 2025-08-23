import { useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import grad from './assets/grad.jpg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartColumn, faMagnifyingGlass, faCamera, faFolder, faGear } from '@fortawesome/free-solid-svg-icons'

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
      <div aria-hidden className="text-base"><FontAwesomeIcon icon={icon} /></div>
      <div>{label}</div>
    </Link>
  )
  return (
    <nav className="fixed bottom-0 left-0 right-0 w-[380px] mx-auto border-t border-gray-700 bg-[#1a1f3a] flex">
      <Item to="/" label="Dashboard" icon={faChartColumn} />
      <Item to="/search" label="Search" icon={faMagnifyingGlass} />
      <Item to="/capture" label="Capture" icon={faCamera} />
      <Item to="/projets" label="Projects" icon={faFolder} />
    </nav>
  )
}

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // simple auth gate
  useEffect(() => {
    try {
      chrome.storage.local.get(['velto_settings'], (res) => {
        if (chrome.runtime.lastError) {
          // If storage fails, route to login to keep UX sane
          if (pathname !== '/login') navigate('/login', { replace: true })
          return
        }
        const loggedIn = !!res?.velto_settings?.loggedIn
        if (!loggedIn && pathname !== '/login') {
          navigate('/login', { replace: true })
        } else if (loggedIn && pathname === '/') {
          // Dashboard is already at root
        }
      })
      // If background asked to pick a project, route to capture
      chrome.storage.local.get(['velto_capture_pick'], (res) => {
        if (res?.velto_capture_pick && pathname !== '/capture') {
          navigate('/capture')
        }
      })
    } catch (_) {
      if (pathname !== '/login') navigate('/login', { replace: true })
    }
  }, [navigate, pathname])

  return (
    <div
      className="h-[600px] w-[380px] bg-[#1a1f3a] text-gray-200 relative"
      style={{
        backgroundImage: `url(${grad})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {pathname !== '/login' && (
        <header className="flex items-center justify-between p-3 border-b border-gray-700">
          <span aria-label="Velto" className="text-white font-semibold">Velto</span>
          <Link to="/settings" className="text-gray-300 hover:text-white text-sm" aria-label="Settings">
            <FontAwesomeIcon icon={faGear} />
          </Link>
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
