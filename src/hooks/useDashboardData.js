import { useCallback, useEffect, useState } from 'react'
import { getDashboardData } from '../lib/legacyData'

export function useDashboardData(userId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      setData(await getDashboardData(userId))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
