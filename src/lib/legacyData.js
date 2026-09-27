import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export function denormalizePreferences(row) {
  if (!row) return null
  return {
    ...row,
    city: row.cities?.[0] || '',
    neighbourhoods: row.areas || [],
    move_in_timeline: row.timeline || '',
    budget: {
      min: row.budget_min ?? null,
      max: row.budget_max ?? null,
    },
    flat_type: row.intent || '',
    bedrooms: row.min_beds ?? 1,
    commute_anchor: row.commute_destination || '',
    deal_breakers: row.notes
      ? row.notes.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  }
}

export async function getPreferences(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('search_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return denormalizePreferences(data)
}

export async function savePreferences(userId, prefs) {
  const client = requireClient()
  const row = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    cities: prefs.city ? [prefs.city] : [],
    areas: Array.isArray(prefs.neighbourhoods) ? prefs.neighbourhoods : [],
    timeline: prefs.move_in_timeline || null,
    budget_min: prefs.budget?.min ?? null,
    budget_max: prefs.budget?.max ?? null,
    intent: prefs.flat_type || null,
    min_beds: prefs.bedrooms === 'Studio' ? 0 : Number(prefs.bedrooms || 1),
    commute_destination: prefs.commute_anchor || null,
    commute_max_minutes: prefs.commute_max_minutes ?? null,
    notes: Array.isArray(prefs.deal_breakers)
      ? prefs.deal_breakers.join(', ')
      : (prefs.deal_breakers || null),
  }

  const { data: existing, error: readError } = await client
    .from('search_preferences')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (readError) throw readError
  if (existing?.id) row.id = existing.id

  const { data, error } = await client
    .from('search_preferences')
    .upsert(row)
    .select()
    .single()

  if (error) throw error
  return denormalizePreferences(data)
}

export async function getActionedMatchIds(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('user_match_actions')
    .select('match_id')
    .eq('user_id', userId)

  if (error) throw error
  return new Set((data ?? []).map((row) => row.match_id))
}

export async function recordMatchAction(userId, matchId, action, note = null) {
  const client = requireClient()
  const { error } = await client
    .from('user_match_actions')
    .upsert(
      { user_id: userId, match_id: matchId, action, note },
      { onConflict: 'user_id,match_id' }
    )

  if (error) throw error

  const activityLabel =
    action === 'approved' ? 'Match approved'
      : action === 'rejected' ? 'Match rejected'
        : 'Match viewed'

  await client
    .from('agent_activity')
    .insert({
      user_id: userId,
      action: activityLabel,
      detail: `match_id:${matchId}`,
    })
    .then(({ error: activityError }) => {
      if (activityError) console.warn('Agent activity log failed:', activityError.message)
    })
}

async function getAgentStatus(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('agent_status')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function getRecentActivity(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('agent_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) throw error
  return data ?? []
}

export async function getInventoryMatches(userId, {
  type,
  limit = 30,
  minScore = 55,
  preferences = null,
} = {}) {
  const client = requireClient()
  const prefs = preferences ?? await getPreferences(userId)
  const actionedIds = await getActionedMatchIds(userId)

  let query = client
    .from('matches')
    .select('*')
    .is('user_id', null)
    .gte('score', minScore)
    .order('score', { ascending: false })
    .limit(Math.min(limit + actionedIds.size + 50, 500))

  if (type) query = query.eq('type', type)
  if (prefs?.city) query = query.eq('data->>city', prefs.city)

  const { data, error } = await query
  if (error) throw error

  let results = (data ?? []).filter((match) => !actionedIds.has(match.id))

  if (prefs?.budget?.max) {
    results = results.filter((match) => {
      if (match.type !== 'listing') return true
      const price = Number(match.data?.price ?? 0)
      return !price || price <= prefs.budget.max * 1.15
    })
  }

  return results.slice(0, limit)
}

export async function getDashboardData(userId) {
  const preferences = await getPreferences(userId)

  const [agentStatus, recentActivity, listings, flatmates] = await Promise.all([
    getAgentStatus(userId),
    getRecentActivity(userId),
    getInventoryMatches(userId, { type: 'listing', limit: 6, minScore: 65, preferences }),
    getInventoryMatches(userId, { type: 'flatmate', limit: 6, minScore: 65, preferences }),
  ])

  const strongMatches = [...listings, ...flatmates]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6)

  return {
    preferences,
    agentStatus,
    recentActivity,
    strongMatches,
  }
}

export async function getDiscoverData(userId) {
  const preferences = await getPreferences(userId)
  const [listings, flatmates] = await Promise.all([
    getInventoryMatches(userId, { type: 'listing', limit: 30, preferences }),
    getInventoryMatches(userId, { type: 'flatmate', limit: 30, preferences }),
  ])

  return {
    preferences,
    listings,
    flatmates,
  }
}


export async function getApprovedMatches(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('user_match_actions')
    .select('id, match_id, action, note, created_at, match:matches(*)')
    .eq('user_id', userId)
    .eq('action', 'approved')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? [])
    .map((row) => row.match)
    .filter(Boolean)
}

export function matchToCard(match) {
  const data = match?.data ?? {}
  const isFlatmate = match?.type === 'flatmate'

  const image =
    data.image
    || data.image_url
    || data.images?.[0]
    || data.photos?.[0]
    || null

  if (isFlatmate) {
    return {
      id: match.id,
      type: 'person',
      image,
      title: data.name || data.display_name || 'Potential flatmate',
      subtitle: [
        data.age,
        data.occupation || data.job_title,
        data.city || data.neighbourhood,
      ].filter(Boolean).join(' · '),
      score: match.score,
      reasons: match.match_reasons ?? [],
      discuss: match.trade_offs ?? [],
      agentReasoning: match.agent_reasoning,
    }
  }

  const price = Number(data.price)
  return {
    id: match.id,
    type: 'flat',
    image,
    title: data.title || data.address || data.neighbourhood || 'Flat',
    subtitle: [
      price ? `€${price.toLocaleString()} / month` : null,
      data.neighbourhood || data.city,
    ].filter(Boolean).join(' · '),
    score: match.score,
    reasons: match.match_reasons ?? [],
    discuss: match.trade_offs ?? [],
    agentReasoning: match.agent_reasoning,
  }
}
