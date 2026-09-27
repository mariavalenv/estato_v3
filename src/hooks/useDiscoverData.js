import { useCallback, useEffect, useState } from 'react'
import { getDiscoverData } from '../lib/legacyData'

export function useDiscoverData(userId) {
  const [data, setData] = useState({ listings: [], flatmates: [], preferences: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      setData(await getDiscoverData(userId))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, setData, loading, error, refresh }
}
