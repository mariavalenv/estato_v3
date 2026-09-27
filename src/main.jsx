import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'

import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AgentBootstrap } from './components/agents/AgentBootstrap'
import { AppLayout } from './components/layout/AppLayout'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Discover } from './pages/Discover'
import { Matches } from './pages/Matches'
import { Chats } from './pages/Chats'
import { Agent } from './pages/Agent'
import { Account } from './pages/Account'

function ProtectedApp({ children }) {
  return (
    <ProtectedRoute>
      <AgentBootstrap>
        <AppLayout>{children}</AppLayout>
      </AgentBootstrap>
    </ProtectedRoute>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<ProtectedApp><Dashboard /></ProtectedApp>} />
      <Route path="/discover" element={<ProtectedApp><Discover /></ProtectedApp>} />
      <Route path="/matches" element={<ProtectedApp><Matches /></ProtectedApp>} />
      <Route path="/chats" element={<ProtectedApp><Chats /></ProtectedApp>} />
      <Route path="/agent" element={<ProtectedApp><Agent /></ProtectedApp>} />
      <Route path="/account" element={<ProtectedApp><Account /></ProtectedApp>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
