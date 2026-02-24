-- 1. Create the `user_chats` table to store chat sessions
create table if not exists public.user_chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tool_name text not null, -- 'Notes Generator', 'Summarizer', or 'Doubt Solver'
  title text not null default 'New Chat',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Create the `chat_messages` table to store individual messages inside a session
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.user_chats(id) on delete cascade not null,
  sender text not null check (sender in ('user', 'bot')), -- who sent the message
  text_content text not null,
  sources jsonb default '[]'::jsonb, -- to store textbook citations (mainly for Doubt Solver)
  created_at timestamptz default now() not null
);

-- 3. Enable Row Level Security (RLS) on both tables
alter table public.user_chats enable row level security;
alter table public.chat_messages enable row level security;

-- 4. Create RLS Policies so users can only view/edit their own chats

-- User Chats Policies
create policy "Users can view their own chats"
  on public.user_chats for select
  using (auth.uid() = user_id);

create policy "Users can insert their own chats"
  on public.user_chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own chats"
  on public.user_chats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own chats"
  on public.user_chats for delete
  using (auth.uid() = user_id);

-- Chat Messages Policies
create policy "Users can view messages of their own chats"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.user_chats
      where user_chats.id = chat_messages.chat_id
      and user_chats.user_id = auth.uid()
    )
  );

create policy "Users can insert messages to their own chats"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.user_chats
      where user_chats.id = chat_messages.chat_id
      and user_chats.user_id = auth.uid()
    )
  );
