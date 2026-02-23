-- ============================================================================
-- BioGenie – Backend-Controlled RAG Schema (Supabase)
-- Developer-only indexing. Users have read-only access via RPC.
-- ============================================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Drop old table if migrating
drop table if exists biotech_notes;
drop table if exists biotech_rag_chunks;

-- 3. Create the locked-down RAG chunks table
-- HuggingFace all-MiniLM-L6-v2 → 384 dimensions
create table biotech_rag_chunks (
  id bigserial primary key,
  class_level text not null,      -- '9', '10', '11', '12'
  chapter text not null,           -- e.g. 'Genetic Engineering'
  content_chunk text not null,
  embedding vector(384) not null, -- HuggingFace all-MiniLM-L6-v2
  source_pdf text not null,        -- original PDF filename
  created_at timestamptz default now()
);

-- 4. Enable Row Level Security
alter table biotech_rag_chunks enable row level security;

-- 5. RLS Policies
-- Users (anon role) can only SELECT — never insert, update, or delete
create policy "Allow read access for all users"
  on biotech_rag_chunks for select
  using (true);

-- Only service_role (developer backend) can insert/update/delete
-- (service_role bypasses RLS by default, so no explicit policy needed)

-- 6. Similarity search RPC function
create or replace function match_rag_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_class_level text default null
)
returns table (
  id bigint,
  content_chunk text,
  chapter text,
  class_level text,
  source_pdf text,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    biotech_rag_chunks.id,
    biotech_rag_chunks.content_chunk,
    biotech_rag_chunks.chapter,
    biotech_rag_chunks.class_level,
    biotech_rag_chunks.source_pdf,
    1 - (biotech_rag_chunks.embedding <=> query_embedding) as similarity
  from biotech_rag_chunks
  where (1 - (biotech_rag_chunks.embedding <=> query_embedding) > match_threshold)
    and (p_class_level is null or biotech_rag_chunks.class_level = p_class_level)
  order by biotech_rag_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
