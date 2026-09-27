import { useCallback, useEffect, useState } from 'react'
import { ensurePersonalAgent, saveV3AgentPermissions, updateV3Agent } from '../lib/v3Agents'

export function usePersonalAgent(user) {
  const [agent, setAgent] = useState(null)
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const result = await ensurePersonalAgent(user)
      setAgent(result.agent)
      setPermissions(result.permissions)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const savePermissions = useCallback(async (nextPermissions) => {
    if (!agent) return null
    const saved = await saveV3AgentPermissions(agent.id, nextPermissions)
    setPermissions(saved)
    return saved
  }, [agent])

  const saveAgent = useCallback(async (updates) => {
    if (!agent) return null
    const saved = await updateV3Agent(agent.id, updates)
    setAgent(saved)
    return saved
  }, [agent])

  return {
    agent,
    permissions,
    loading,
    error,
    refresh,
    savePermissions,
    saveAgent,
  }
}
