-- UMIÑA WORLD CUP · Supabase setup
-- Ejecuta este archivo completo en Supabase > SQL Editor > New query.
-- El acceso de edición queda limitado al correo indicado en la función is_tournament_admin().

create extension if not exists pgcrypto;

create or replace function public.is_tournament_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'ashleesoledispavilla@gmail.com';
$$;

create table if not exists public.matches (
  id text primary key,
  "group" text check ("group" in ('A','B','C')),
  kickoff text,
  end_time text,
  home_team text not null,
  away_team text not null,
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  status text not null default 'scheduled' check (status in ('scheduled','live','finished')),
  round text not null default 'group' check (round in ('group','quarterfinal','semifinal','final')),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.matches enable row level security;

drop policy if exists "Public can view matches" on public.matches;
create policy "Public can view matches" on public.matches
  for select to anon, authenticated using (true);

drop policy if exists "Only tournament admin can insert matches" on public.matches;
create policy "Only tournament admin can insert matches" on public.matches
  for insert to authenticated with check (public.is_tournament_admin());

drop policy if exists "Only tournament admin can update matches" on public.matches;
create policy "Only tournament admin can update matches" on public.matches
  for update to authenticated using (public.is_tournament_admin()) with check (public.is_tournament_admin());

drop policy if exists "Only tournament admin can delete matches" on public.matches;
create policy "Only tournament admin can delete matches" on public.matches
  for delete to authenticated using (public.is_tournament_admin());

-- Seed group-stage fixtures. Safe to rerun: existing IDs are left unchanged.
insert into public.matches (id, "group", kickoff, end_time, home_team, away_team, status, round, sort_order)
values
('A-1','A','11:00','11:12','Deportivo del Valle','AC Detox','scheduled','group',1),
('A-2','A','11:45','11:57','Inter de Mami','Jorgito Lopez','scheduled','group',2),
('A-3','A','12:30','12:42','Deportivo del Valle','Inter de Mami','scheduled','group',3),
('A-4','A','13:15','13:27','AC Detox','Jorgito Lopez','scheduled','group',4),
('A-5','A','14:00','14:12','Deportivo del Valle','Jorgito Lopez','scheduled','group',5),
('A-6','A','14:45','14:57','AC Detox','Inter de Mami','scheduled','group',6),
('B-1','B','11:15','11:27','Kallad FC','Escombro FC','scheduled','group',1),
('B-2','B','12:00','12:12','Los X Men FC','Zapos FC','scheduled','group',2),
('B-3','B','12:45','12:57','Kallad FC','Los X Men FC','scheduled','group',3),
('B-4','B','13:30','13:42','Escombro FC','Zapos FC','scheduled','group',4),
('B-5','B','14:15','14:27','Kallad FC','Zapos FC','scheduled','group',5),
('B-6','B','15:00','15:12','Escombro FC','Los X Men FC','scheduled','group',6),
('C-1','C','11:30','11:42','Amigos de Monda','Senecinos FC','scheduled','group',1),
('C-2','C','12:15','12:27','Mortex','Vikingos FC','scheduled','group',2),
('C-3','C','13:00','13:12','Amigos de Monda','Mortex','scheduled','group',3),
('C-4','C','13:45','13:57','Senecinos FC','Vikingos FC','scheduled','group',4),
('C-5','C','14:30','14:42','Amigos de Monda','Vikingos FC','scheduled','group',5),
('C-6','C','15:15','15:27','Senecinos FC','Mortex','scheduled','group',6)
on conflict (id) do nothing;

-- Create placeholder knockout fixtures so the referee can enter scores for them too.
insert into public.matches (id, "group", kickoff, end_time, home_team, away_team, status, round, sort_order)
values
('QF-1',null,null,null,'Clasificado 1','Clasificado 8','scheduled','quarterfinal',1),
('QF-2',null,null,null,'Clasificado 2','Clasificado 7','scheduled','quarterfinal',2),
('QF-3',null,null,null,'Clasificado 3','Clasificado 6','scheduled','quarterfinal',3),
('QF-4',null,null,null,'Clasificado 4','Clasificado 5','scheduled','quarterfinal',4),
('SF-1',null,null,null,'Ganador Cuartos 1','Ganador Cuartos 4','scheduled','semifinal',1),
('SF-2',null,null,null,'Ganador Cuartos 2','Ganador Cuartos 3','scheduled','semifinal',2),
('FINAL',null,null,null,'Ganador Semifinal 1','Ganador Semifinal 2','scheduled','final',1)
on conflict (id) do nothing;

-- Enable Realtime for the live scoreboard (safe if already added).
do $$
begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

-- IMPORTANT:
-- 1. In Authentication > Users, create/invite ashleesoledispavilla@gmail.com and set its password.
-- 2. Do not put the Supabase service_role key in VITE_* variables or in this project.
-- 3. The frontend checks the same email; RLS above is the actual database security boundary.
