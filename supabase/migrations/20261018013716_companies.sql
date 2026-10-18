-- Empresa e vínculo do usuário (docs/04). Membro lê a própria empresa; só o admin altera;
-- empresa e vínculo nascem só pela RPC create_company.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> '' and char_length(name) <= 100),
  timezone text not null default 'America/Sao_Paulo',
  -- Configuração de jornada (docs/02 §1). Campos e padrões vêm do schema de regras do domínio.
  rules jsonb not null check (jsonb_typeof(rules) = 'object'),
  created_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  -- unique: uma empresa por usuário na v1.
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

revoke all on public.companies, public.company_members from anon, authenticated;
grant select, update (name, rules) on public.companies to authenticated;
grant select on public.company_members to authenticated;

create policy "member reads own company" on public.companies
  for select to authenticated
  using (id in (select company_id from public.company_members where user_id = (select auth.uid())));

create policy "admin updates own company" on public.companies
  for update to authenticated
  using (id in (
    select company_id from public.company_members
    where user_id = (select auth.uid()) and role = 'admin'
  ))
  with check (id in (
    select company_id from public.company_members
    where user_id = (select auth.uid()) and role = 'admin'
  ));

create policy "member reads own membership" on public.company_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Cria a empresa e torna o chamador admin. Quem já é membro recebe 23505 (unique_violation),
-- o mesmo erro da corrida entre duas chamadas simultâneas, barrada pelo unique de user_id.
create function public.create_company(name text, rules jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  company uuid;
begin
  if exists (select 1 from public.company_members where user_id = caller) then
    raise exception 'O usuário já pertence a uma empresa' using errcode = 'unique_violation';
  end if;

  insert into public.companies (name, rules)
    values (btrim(create_company.name), create_company.rules)
    returning id into company;

  insert into public.company_members (company_id, user_id, role)
    values (company, caller, 'admin');

  return company;
end;
$$;

revoke execute on function public.create_company(text, jsonb) from public, anon;
grant execute on function public.create_company(text, jsonb) to authenticated;
