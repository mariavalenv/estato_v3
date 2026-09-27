# Estato v3

Estato v3 is an AI-native flat-sharing network where people, personal agents, and household agents can collaborate on housing and flatmate decisions while humans remain in control.

## Product direction

- **UX source of truth:** `estato-app`
- **Functionality reference:** `estato_v2`
- **v3 principle:** first-class humans + agents, shared conversations, explainable matching, explicit delegation.

## Core model

A conversation can contain humans and agents. Agents belong to a human or household and operate within explicit permissions. They may search, compare, ask questions, and propose matches; consequential actions remain human-controlled unless explicitly delegated.

## Stack

React 19 · Vite · Tailwind CSS · Supabase · React Router · Framer Motion

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

## Current phase

Foundation / Phase 1:

1. Restore the compact Estato app shell and information hierarchy.
2. Establish v3 domain primitives for humans, agents, households, matches, and conversations.
3. Port v2 functionality selectively behind the new UX.
