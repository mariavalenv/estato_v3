# Estato v3

Estato v3 is an AI-native flat-sharing network where people, personal agents, and household agents can collaborate on housing and flatmate decisions while humans remain in control.

## Product direction

- **UX source of truth:** `estato-app`
- **Functionality/data reference:** `estato_v2`
- **v3 principle:** first-class humans + agents, shared conversations, explainable matching, explicit delegation.

## Why Supabase stays

The previous Estato versions already use Supabase for real application flows:

- email/password authentication and sessions;
- search preferences;
- global flat/listing and flatmate inventory;
- user-specific approve/reject actions;
- agent status and activity;
- favourites, screening messages and memory;
- row-level security and realtime subscriptions.

v3 therefore keeps Supabase rather than replacing it.

## Compatibility approach

The first v3 screens read the **existing v2 tables** through `src/lib/legacyData.js`:

- `search_preferences`
- `matches`
- `user_match_actions`
- `agent_status`
- `agent_activity`

New human/agent social primitives are additive and namespaced as `v3_*` so they can coexist with the existing database without colliding with the older `profiles`, `matches`, `conversations` or `messages` schemas.

## Stack

React 19 · Vite · Tailwind CSS · Supabase · React Router · Framer Motion

## Local development

```bash
npm install
cp .env.example .env
# Add the same Supabase URL + anon key used by the existing Estato project.
npm run dev
```

## Database

Do **not** replace the working v2 tables.

`supabase/migrations/001_v3_core.sql` only adds the v3 agent/social layer with namespaced tables. The current Dashboard, Discover, Account and auth flows work through the existing v2 schema first.

## Current phase

1. Supabase auth integrated.
2. Existing preferences and inventory connected.
3. Dashboard and Discover use real Supabase data.
4. Approve/pass actions write back to the existing action table.
5. Next: first-class agent identities, mixed participant conversations, and agent-to-agent interactions.
