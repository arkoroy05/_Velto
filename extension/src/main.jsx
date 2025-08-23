import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import Welcome from './pages/Welcome.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ContextDetail from './pages/ContextDetail.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Capture from './pages/Capture.jsx'
import Projets from './pages/Projets.jsx'


const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'login', element: <Login /> },
      { path: 'welcome', element: <Welcome /> },
      { path: 'onboarding', element: <Onboarding /> },
      { path: 'capture', element: <Capture /> },
      { path: 'projets', element: <Projets /> },
      { path: 'context/:id', element: <ContextDetail /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
