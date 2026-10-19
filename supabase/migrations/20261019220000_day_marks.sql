-- Tipo do dia marcado à mão (docs/02 §3.1, docs/04). O dono lê; escreve só pela RPC
-- upsert_day_mark, idempotente por (usuário, data) e last-write-wins por updated_at (D3). Voltar a
-- Normal é exclusão lógica.

create table public.day_marks (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  type text not null check (type in ('falta', 'atestado', 'ferias', 'folga_compensada', 'abono')),
  note text check (char_length(note) <= 200),
  updated_at timestamptz not null, -- vem do cliente (LWW)
  deleted_at timestamptz, -- exclusão lógica, para a sincronização offline
  primary key (user_id, date)
);

alter table public.day_marks enable row level security;

revoke all on public.day_marks from anon, authenticated;
grant select on public.day_marks to authenticated;

create policy "owner reads own day marks" on public.day_marks
  for select to authenticated
  using (user_id = (select auth.uid()));

create type public.upsert_day_mark_result as enum ('applied', 'stale');

-- Grava a marcação do dia do usuário da sessão. Reenviar a mesma escrita (mesmo updated_at) é
-- aceito sem mudar nada; escrita mais antiga que a gravada é `stale`.
create function public.upsert_day_mark(
  date date,
  type text,
  note text,
  updated_at timestamptz,
  deleted_at timestamptz
)
returns public.upsert_day_mark_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  current public.day_marks;
begin
  if caller is null then
    raise exception 'Sem sessão' using errcode = 'insufficient_privilege';
  end if;

  select * into current from public.day_marks m
    where m.user_id = caller and m.date = upsert_day_mark.date for update;

  if found and upsert_day_mark.updated_at <= current.updated_at then
    return case when upsert_day_mark.updated_at = current.updated_at then 'applied' else 'stale' end;
  end if;

  insert into public.day_marks (user_id, date, type, note, updated_at, deleted_at)
    values (caller, upsert_day_mark.date, upsert_day_mark.type, upsert_day_mark.note,
            upsert_day_mark.updated_at, upsert_day_mark.deleted_at)
    on conflict on constraint day_marks_pkey do update set
      type = excluded.type,
      note = excluded.note,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at;

  return 'applied';
end;
$$;

revoke execute on function public.upsert_day_mark(date, text, text, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.upsert_day_mark(date, text, text, timestamptz, timestamptz)
  to authenticated;
