import { createClient } from '@supabase/supabase-js'
import { SOCIAL_AGENT_SYSTEM_PROMPT } from '../../src/lib/agents/socialAgentSkill.js'

function getBearerToken(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim()
}

function createUserClient(token) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase server environment is not configured')
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    },
  })
}

function compactProfile(profile) {
  if (!profile) return null

  return {
    display_name: profile.display_name,
    bio: profile.bio,
    city: profile.city,
    occupation: profile.occupation,
    budget_min: profile.budget_min,
    budget_max: profile.budget_max,
    preferred_neighbourhoods: profile.preferred_neighbourhoods,
    move_in_date: profile.move_in_date,
    schedule: profile.schedule,
    cleanliness: profile.cleanliness,
    social_level: profile.social_level,
    work_from_home: profile.work_from_home,
    smoking: profile.smoking,
    has_pets: profile.has_pets,
    pet_details: profile.pet_details,
    lifestyle_tags: profile.lifestyle_tags,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const conversationId = req.body?.conversationId
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return res.status(503).json({ error: 'Agent model is not configured' })
  }

  try {
    const supabase = createUserClient(token)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const { data: agent, error: agentError } = await supabase
      .from('v3_agents')
      .select('*')
      .eq('owner_user_id', user.id)
      .eq('agent_type', 'personal')
      .single()

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Personal agent not found' })
    }

    const { data: permissions, error: permissionError } = await supabase
      .from('v3_agent_permissions')
      .select('*')
      .eq('agent_id', agent.id)
      .single()

    if (permissionError || !permissions) {
      return res.status(403).json({ error: 'Agent permissions are unavailable' })
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('v3_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (conversationError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const { data: participants, error: participantsError } = await supabase
      .from('v3_conversation_participants')
      .select('*, agent:v3_agents(id,name,owner_user_id,agent_type)')
      .eq('conversation_id', conversationId)

    if (participantsError) throw participantsError

    const ownAgentParticipant = (participants || []).some(
      (participant) => participant.agent_id === agent.id
    )

    if (!ownAgentParticipant) {
      return res.status(403).json({ error: 'Your agent is not a participant in this conversation' })
    }

    const hasOtherHuman = (participants || []).some(
      (participant) =>
        participant.participant_type === 'human'
        && participant.human_user_id !== user.id
    )

    const hasOtherAgent = (participants || []).some(
      (participant) =>
        participant.participant_type === 'agent'
        && participant.agent_id !== agent.id
    )

    // "ask" is permitted here because this endpoint is explicitly user-triggered.
    if (hasOtherHuman && permissions.message_humans === 'never') {
      return res.status(403).json({ error: 'Your agent is not allowed to message humans' })
    }

    if (hasOtherAgent && permissions.message_agents === 'never') {
      return res.status(403).json({ error: 'Your agent is not allowed to message other agents' })
    }

    const humanIds = (participants || [])
      .filter((participant) => participant.human_user_id)
      .map((participant) => participant.human_user_id)

    const { data: profiles, error: profilesError } = humanIds.length
      ? await supabase
          .from('v3_flatmate_profiles')
          .select('*')
          .in('user_id', humanIds)
      : { data: [], error: null }

    if (profilesError) throw profilesError

    const profilesByUser = Object.fromEntries(
      (profiles || []).map((profile) => [profile.user_id, compactProfile(profile)])
    )

    const { data: history, error: historyError } = await supabase
      .from('v3_messages')
      .select('sender_type,sender_user_id,sender_agent_id,content,created_at,agent:v3_agents(name,owner_user_id)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(30)

    if (historyError) throw historyError

    const context = {
      agent: {
        id: agent.id,
        name: agent.name,
        bio: agent.bio,
      },
      owner_profile: profilesByUser[user.id] || null,
      other_profiles: humanIds
        .filter((id) => id !== user.id)
        .map((id) => profilesByUser[id])
        .filter(Boolean),
      participants: (participants || []).map((participant) => ({
        type: participant.participant_type,
        human_user_id: participant.human_user_id || null,
        agent_name: participant.agent?.name || null,
        agent_owner_user_id: participant.agent?.owner_user_id || null,
      })),
      conversation_history: (history || []).map((message) => ({
        author:
          message.sender_type === 'agent'
            ? message.agent?.name || 'Agent'
            : message.sender_user_id === user.id
              ? 'Owner'
              : profilesByUser[message.sender_user_id]?.display_name || 'Other human',
        author_type: message.sender_type,
        content: message.content,
      })),
    }

    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: SOCIAL_AGENT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content:
              'Write the next useful message as this Estato agent. Context:\n'
              + JSON.stringify(context),
          },
        ],
      }),
    })

    const modelResponse = await upstream.json()

    if (!upstream.ok) {
      console.error('[agent/respond] Anthropic error', upstream.status, modelResponse?.error?.message)
      return res.status(502).json({ error: 'Agent model request failed' })
    }

    const content = (modelResponse.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    if (!content) {
      return res.status(502).json({ error: 'Agent returned an empty response' })
    }

    const { data: storedMessage, error: storeError } = await supabase
      .from('v3_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_agent_id: agent.id,
        content,
        provenance: {
          authored_by: 'agent',
          trigger: 'human_approval',
          model,
        },
      })
      .select('*, agent:v3_agents(id,name,owner_user_id)')
      .single()

    if (storeError) throw storeError

    await supabase
      .from('v3_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return res.status(200).json({ message: storedMessage })
  } catch (error) {
    console.error('[agent/respond]', error)
    return res.status(500).json({ error: error.message || 'Unexpected server error' })
  }
}
