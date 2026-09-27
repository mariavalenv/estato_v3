import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'

import { AppLayout } from './components/layout/AppLayout'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Discover } from './pages/Discover'
import { Matches } from './pages/Matches'
import { Chats } from './pages/Chats'
import { Agent } from './pages/Agent'
import { Account } from './pages/Account'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
      <Route path="/discover" element={<AppLayout><Discover /></AppLayout>} />
      <Route path="/matches" element={<AppLayout><Matches /></AppLayout>} />
      <Route path="/chats" element={<AppLayout><Chats /></AppLayout>} />
      <Route path="/agent" element={<AppLayout><Agent /></AppLayout>} />
      <Route path="/account" element={<AppLayout><Account /></AppLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
)
