import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function listMyV3Conversations(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('v3_conversation_participants')
    .select('conversation_id, conversation:v3_conversations(*)')
    .eq('participant_type', 'human')
    .eq('human_user_id', userId)

  if (error) throw error

  return (data ?? [])
    .map((row) => row.conversation)
    .filter(Boolean)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
}

export async function getConversationParticipants(conversationId) {
  const client = requireClient()
  const { data, error } = await client
    .from('v3_conversation_participants')
    .select('*, agent:v3_agents(id,name,agent_type,status,owner_user_id)')
    .eq('conversation_id', conversationId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getV3Messages(conversationId) {
  const client = requireClient()
  const { data, error } = await client
    .from('v3_messages')
    .select('*, agent:v3_agents(id,name,owner_user_id)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function sendHumanMessage(conversationId, userId, content) {
  const client = requireClient()
  const trimmed = content.trim()
  if (!trimmed) return null

  const { data, error } = await client
    .from('v3_messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'human',
      sender_user_id: userId,
      content: trimmed,
      provenance: { authored_by: 'human' },
    })
    .select()
    .single()

  if (error) throw error

  await client
    .from('v3_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data
}
