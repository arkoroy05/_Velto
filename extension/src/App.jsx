import { Outlet, Link, useLocation } from 'react-router-dom'

function Nav() {
  const { pathname } = useLocation()
  const Tab = ({ to, children }) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-transform duration-150 ${
        pathname === to ? 'bg-card text-white' : 'text-gray-300 hover:text-white hover:bg-card'
      }`}
      aria-current={pathname === to ? 'page' : undefined}
    >
      {children}
    </Link>
  )
  return (
    <nav className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#1a1f3a]">
      <div className="flex items-center gap-2">
        <span aria-label="Velto" className="text-white font-semibold">Velto</span>
      </div>
      <div className="flex items-center gap-2">
        <Tab to="/">Home</Tab>
        <Tab to="/settings">Settings</Tab>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <div className="h-[600px] w-[380px] bg-[#1a1f3a] text-gray-200">
      <Nav />
      <main className="p-3">
        <Outlet />
      </main>
    </div>
  )
}
