-- Perfil do usuário (docs/04). Criado junto com o usuário do Auth; só o dono lê e escreve.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  reminders_enabled boolean not null default true,
  reminder_lead_minutes integer not null default 10 check (reminder_lead_minutes > 0)
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

create policy "owner reads own profile" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "owner creates own profile" on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "owner updates own profile" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- O link mágico cria o usuário em auth.users; o perfil nasce junto, sem depender do cliente.
create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;

create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();
