-- ============================================================================
-- BioGenie – Chat History Schema (Supabase)
-- Stores per-user chat sessions for Notes, Summarizer, Doubt Solver, PPT Maker
-- ============================================================================

-- 1. Create the chat_sessions table
create table if not exists chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  feature text not null,                    -- 'notes', 'summarizer', 'doubt', 'ppt'
  title text not null default 'New Chat',   -- auto-generated from first message
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Index for faster queries
create index if not exists idx_chat_sessions_user_feature on chat_sessions(user_id, feature);
create index if not exists idx_chat_sessions_updated on chat_sessions(updated_at desc);

-- 3. Enable Row Level Security
alter table chat_sessions enable row level security;

-- 4. RLS Policies – users can only access their own sessions
create policy "Users can view own chat sessions"
  on chat_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat sessions"
  on chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chat sessions"
  on chat_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own chat sessions"
  on chat_sessions for delete
  using (auth.uid() = user_id);
