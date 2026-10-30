-- ============================================================================
-- CivicPulse AI: From Complaints to Action
-- Supabase PostgreSQL Schema for `public.reports`
-- ============================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  title text not null,
  description text not null,
  category text not null,
  image_url text,
  latitude double precision not null,
  longitude double precision not null,
  address text not null,
  ai_category text,
  ai_summary text,
  ai_priority text check (ai_priority in ('Critical', 'High', 'Medium', 'Low')),
  ai_priority_score integer check (ai_priority_score >= 0 and ai_priority_score <= 100),
  ai_reasoning text,
  duplicate_of uuid references public.reports(id) on delete set null,
  cluster_id text,
  status text not null default 'Triaged' check (status in ('Submitted', 'Triaged', 'Assigned', 'In Progress', 'Resolved')),
  assigned_department text,
  resolution_notes text
);

-- Enable Row Level Security with open demo policy for hackathon judging
alter table public.reports enable row level security;

create policy "Allow public read access on reports"
  on public.reports for select
  using (true);

create policy "Allow public insert access on reports"
  on public.reports for insert
  with check (true);

create policy "Allow public update access on reports"
  on public.reports for update
  using (true)
  with check (true);

create policy "Allow public delete access on reports"
  on public.reports for delete
  using (true);

