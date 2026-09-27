import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getFlatmateProfile(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('v3_flatmate_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function saveFlatmateProfile(userId, profile) {
  const client = requireClient()
  const payload = {
    user_id: userId,
    display_name: profile.display_name?.trim() || 'Estato user',
    avatar_url: profile.avatar_url || null,
    bio: profile.bio?.trim() || null,
    city: profile.city?.trim() || null,
    occupation: profile.occupation?.trim() || null,
    budget_min: profile.budget_min === '' || profile.budget_min == null ? null : Number(profile.budget_min),
    budget_max: profile.budget_max === '' || profile.budget_max == null ? null : Number(profile.budget_max),
    preferred_neighbourhoods: Array.isArray(profile.preferred_neighbourhoods)
      ? profile.preferred_neighbourhoods
      : [],
    move_in_date: profile.move_in_date || null,
    schedule: profile.schedule || null,
    cleanliness: profile.cleanliness === '' || profile.cleanliness == null ? null : Number(profile.cleanliness),
    social_level: profile.social_level === '' || profile.social_level == null ? null : Number(profile.social_level),
    work_from_home: profile.work_from_home == null ? null : Boolean(profile.work_from_home),
    smoking: profile.smoking || null,
    has_pets: profile.has_pets == null ? null : Boolean(profile.has_pets),
    pet_details: profile.pet_details?.trim() || null,
    lifestyle_tags: Array.isArray(profile.lifestyle_tags) ? profile.lifestyle_tags : [],
    is_discoverable: Boolean(profile.is_discoverable),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await client
    .from('v3_flatmate_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listDiscoverablePeople(userId, { city } = {}) {
  const client = requireClient()
  let query = client
    .from('v3_flatmate_profiles')
    .select('*')
    .eq('is_discoverable', true)
    .neq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (city) query = query.eq('city', city)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getOwnSocialDecisions(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('v3_social_decisions')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

export async function decideOnPerson(userId, candidateUserId, decision) {
  const client = requireClient()
  const { data, error } = await client
    .from('v3_social_decisions')
    .upsert({
      user_id: userId,
      subject_type: 'user',
      subject_id: candidateUserId,
      decision,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,subject_type,subject_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

export function humanPairConversationKey(userA, userB) {
  return 'human:' + [userA, userB].sort().join(':')
}

export async function getMutualConversation(userId, candidateUserId) {
  const client = requireClient()
  const key = humanPairConversationKey(userId, candidateUserId)
  const { data, error } = await client
    .from('v3_conversations')
    .select('*')
    .eq('conversation_key', key)
    .maybeSingle()

  if (error) throw error
  return data
}
