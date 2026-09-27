import { supabase } from './supabase'

export const DEFAULT_AGENT_PERMISSIONS = {
  message_agents: 'allowed',
  message_humans: 'ask',
  propose_matches: 'allowed',
  initiate_introductions: 'ask',
  schedule_viewings: 'ask',
  make_payments: 'never',
  sign_contracts: 'never',
  limits: {},
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function defaultAgentName(user) {
  const fullName = user?.user_metadata?.full_name?.trim()
  const firstName = fullName?.split(/\s+/)[0]
  if (firstName) return `${firstName}'s Estato`
  return 'My Estato agent'
}

export async function getPersonalAgent(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('v3_agents')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('agent_type', 'personal')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getV3AgentPermissions(agentId) {
  const client = requireClient()
  const { data, error } = await client
    .from('v3_agent_permissions')
    .select('*')
    .eq('agent_id', agentId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function ensurePersonalAgent(user) {
  if (!user?.id) throw new Error('A signed-in user is required')

  let agent = await getPersonalAgent(user.id)

  if (!agent) {
    const client = requireClient()
    const { data, error } = await client
      .from('v3_agents')
      .insert({
        owner_user_id: user.id,
        name: defaultAgentName(user),
        agent_type: 'personal',
        bio: 'Personal housing and flatmate agent',
        status: 'active',
        public_metadata: {},
      })
      .select()
      .single()

    if (error) {
      // A simultaneous tab may have created the personal agent first.
      if (error.code === '23505') {
        agent = await getPersonalAgent(user.id)
      } else {
        throw error
      }
    } else {
      agent = data
    }
  }

  let permissions = await getV3AgentPermissions(agent.id)

  if (!permissions) {
    const client = requireClient()
    const { data, error } = await client
      .from('v3_agent_permissions')
      .upsert({
        agent_id: agent.id,
        ...DEFAULT_AGENT_PERMISSIONS,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_id' })
      .select()
      .single()

    if (error) throw error
    permissions = data
  }

  return { agent, permissions }
}

export async function updateV3Agent(agentId, updates) {
  const client = requireClient()
  const { data, error } = await client
    .from('v3_agents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', agentId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveV3AgentPermissions(agentId, permissions) {
  const client = requireClient()
  const payload = {
    agent_id: agentId,
    message_agents: permissions.message_agents,
    message_humans: permissions.message_humans,
    propose_matches: permissions.propose_matches,
    initiate_introductions: permissions.initiate_introductions,
    schedule_viewings: permissions.schedule_viewings,
    make_payments: permissions.make_payments,
    sign_contracts: permissions.sign_contracts,
    limits: permissions.limits ?? {},
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await client
    .from('v3_agent_permissions')
    .upsert(payload, { onConflict: 'agent_id' })
    .select()
    .single()

  if (error) throw error
  return data
}
