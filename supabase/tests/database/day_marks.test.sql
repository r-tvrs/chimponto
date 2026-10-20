-- day_marks: dono lê; escrita só via upsert_day_mark (idempotente, LWW por updated_at, exclusão
-- lógica); admin da empresa não lê as marcações dos membros (docs/04 §RLS e §RPCs).
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ana@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'bruno@example.com'),
  ('00000000-0000-4000-8000-00000000000c', 'clara@example.com');

-- C é admin da empresa em que A é membro.
insert into public.companies (id, name, rules)
  values ('00000000-0000-4000-8000-0000000000e1', 'Bananal Ltda', '{}');
insert into public.company_members (company_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000c', 'admin'),
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000a', 'member');

set local role authenticated;

-- Como A
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select is(
  public.upsert_day_mark('2026-10-14', 'atestado', 'Dentista', '2026-10-15 09:00-03', null),
  'applied',
  'A marca um dia'
);
select is(
  public.upsert_day_mark('2026-10-14', 'atestado', 'Dentista', '2026-10-15 09:00-03', null),
  'applied',
  'reenviar a mesma escrita é aceito'
);
select results_eq(
  $$ select user_id, date, type, note, deleted_at from public.day_marks $$,
  $$ values ('00000000-0000-4000-8000-00000000000a'::uuid, '2026-10-14'::date, 'atestado',
             'Dentista', null::timestamptz) $$,
  'reenviar não duplica: uma linha, do usuário da sessão'
);

-- LWW por updated_at
select is(
  public.upsert_day_mark('2026-10-14', 'falta', null, '2026-10-15 08:00-03', null),
  'stale',
  'escrita com updated_at mais antigo é stale'
);
select is(
  (select type from public.day_marks),
  'atestado',
  'stale não altera a marcação'
);
select is(
  public.upsert_day_mark('2026-10-14', 'ferias', null, '2026-10-15 10:00-03', null),
  'applied',
  'escrita mais nova troca o tipo'
);
select is((select type from public.day_marks), 'ferias', 'a escrita mais nova prevalece');

-- Exclusão lógica (volta a Normal) e nova marcação no mesmo dia
select is(
  public.upsert_day_mark('2026-10-14', 'ferias', null, '2026-10-15 11:00-03', '2026-10-15 11:00-03'),
  'applied',
  'A desmarca o dia (soft delete)'
);
select is(
  (select deleted_at from public.day_marks),
  '2026-10-15 11:00-03'::timestamptz,
  'a marcação fica com deleted_at'
);
select is(
  public.upsert_day_mark('2026-10-14', 'abono', null, '2026-10-15 12:00-03', null),
  'applied',
  'A marca de novo o dia desmarcado'
);
select results_eq(
  $$ select type, deleted_at from public.day_marks $$,
  $$ values ('abono', null::timestamptz) $$,
  'a nova marcação tira o deleted_at'
);

select throws_ok(
  $$ select public.upsert_day_mark('2026-10-13', 'plantao', null, now(), null) $$,
  '23514',
  null,
  'tipo fora da lista é recusado'
);
select is(
  public.upsert_day_mark('2026-10-12', 'feriado', null, now(), null),
  'applied',
  'feriado é um tipo do dia'
);

-- Escrita direta
select throws_ok(
  $$ insert into public.day_marks (user_id, date, type, updated_at)
     values ('00000000-0000-4000-8000-00000000000a', '2026-10-13', 'falta', now()) $$,
  '42501',
  null,
  'marcação não é criada fora da RPC'
);
select throws_ok(
  $$ delete from public.day_marks $$,
  '42501',
  null,
  'marcação não é apagada de verdade'
);

-- Como B: mesma data, linha própria
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select is((select count(*) from public.day_marks), 0::bigint, 'B não lê as marcações de A');
select is(
  public.upsert_day_mark('2026-10-14', 'falta', null, '2026-10-15 09:00-03', null),
  'applied',
  'B marca a mesma data sem tocar na de A'
);

-- Como C, admin da empresa de A
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}';

select is((select count(*) from public.day_marks), 0::bigint, 'admin não lê as marcações dos membros');

select * from finish();
rollback;
