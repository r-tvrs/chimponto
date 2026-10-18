-- Batidas e histórico (docs/04). O dono lê; escreve só pela RPC upsert_punch, idempotente pelo id
-- e last-write-wins por updated_at (D3). O histórico é escrito só pelo trigger.

create table public.punches (
  id uuid primary key, -- gerado no cliente (UUID v7)
  user_id uuid not null references auth.users (id) on delete cascade,
  punched_at timestamptz not null check (extract(second from punched_at) = 0),
  local_date date not null generated always as ((punched_at at time zone 'America/Sao_Paulo')::date) stored,
  source text not null check (source in ('manual', 'ocr')),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null, -- vem do cliente (LWW)
  deleted_at timestamptz -- exclusão lógica, para a sincronização offline
);

-- Uma batida por minuto por usuário; a exclusão lógica libera o minuto.
create unique index punches_user_minute on public.punches (user_id, punched_at)
  where deleted_at is null;
create index punches_user_local_date on public.punches (user_id, local_date);

create table public.punch_history (
  id bigint generated always as identity primary key,
  punch_id uuid not null references public.punches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('insert', 'update', 'delete')),
  old jsonb,
  new jsonb,
  changed_at timestamptz not null default now()
);

create index punch_history_punch on public.punch_history (punch_id);
create index punch_history_user on public.punch_history (user_id);

alter table public.punches enable row level security;
alter table public.punch_history enable row level security;

revoke all on public.punches, public.punch_history from anon, authenticated;
grant select on public.punches, public.punch_history to authenticated;

create policy "owner reads own punches" on public.punches
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "owner reads own punch history" on public.punch_history
  for select to authenticated
  using (user_id = (select auth.uid()));

create type public.upsert_punch_result as enum ('applied', 'stale', 'duplicate_minute');

-- Grava a batida com o id do cliente. Reenviar a mesma escrita (mesmo updated_at) é aceito sem
-- mudar nada; escrita mais antiga que a gravada é `stale`; outra batida não excluída no mesmo
-- minuto é `duplicate_minute`. Uma batida de outro usuário com o mesmo id dá 42501.
create function public.upsert_punch(
  id uuid,
  punched_at timestamptz,
  source text,
  note text,
  updated_at timestamptz,
  deleted_at timestamptz
)
returns public.upsert_punch_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  current public.punches;
  violated text;
begin
  select * into current from public.punches p where p.id = upsert_punch.id for update;

  if found and current.user_id <> caller then
    raise exception 'Batida de outro usuário' using errcode = 'insufficient_privilege';
  end if;
  if found and upsert_punch.updated_at < current.updated_at then
    return 'stale';
  end if;
  if found and upsert_punch.updated_at = current.updated_at then
    return 'applied';
  end if;

  begin
    if found then
      update public.punches p set
        punched_at = upsert_punch.punched_at,
        source = upsert_punch.source,
        note = upsert_punch.note,
        updated_at = upsert_punch.updated_at,
        deleted_at = upsert_punch.deleted_at
      where p.id = upsert_punch.id;
    else
      insert into public.punches (id, user_id, punched_at, source, note, updated_at, deleted_at)
        values (upsert_punch.id, caller, upsert_punch.punched_at, upsert_punch.source,
                upsert_punch.note, upsert_punch.updated_at, upsert_punch.deleted_at);
    end if;
  exception when unique_violation then
    get stacked diagnostics violated = constraint_name;
    if violated = 'punches_user_minute' then
      return 'duplicate_minute';
    end if;
    raise;
  end;

  return 'applied';
end;
$$;

revoke execute on function public.upsert_punch(uuid, timestamptz, text, text, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.upsert_punch(uuid, timestamptz, text, text, timestamptz, timestamptz)
  to authenticated;

-- Toda criação, edição e exclusão lógica de batida vai para o histórico (docs/02 §2).
create function public.record_punch_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.punch_history (punch_id, user_id, action, old, new)
  values (
    new.id,
    new.user_id,
    case
      when tg_op = 'INSERT' then 'insert'
      when old.deleted_at is null and new.deleted_at is not null then 'delete'
      else 'update'
    end,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new)
  );
  return null;
end;
$$;

revoke execute on function public.record_punch_history() from public, anon, authenticated;

create trigger punches_history
  after insert or update on public.punches
  for each row execute function public.record_punch_history();
