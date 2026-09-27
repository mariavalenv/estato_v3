import { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ensurePersonalAgent } from '../../lib/v3Agents'

export function AgentBootstrap({ children }) {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    ensurePersonalAgent(user).catch((error) => {
      console.warn('Could not initialise personal agent:', error.message)
    })
  }, [user])

  return children
}
