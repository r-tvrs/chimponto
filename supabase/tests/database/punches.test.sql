-- punches e punch_history: dono lê; escrita só via upsert_punch (idempotente, LWW por updated_at,
-- uma batida por minuto); histórico só por trigger (docs/04 §RLS, §RPCs e §Triggers).
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ana@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'bruno@example.com');

set local role authenticated;

-- Como A
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000001', '2026-10-16 09:02-03', 'manual', 'Chuva',
    '2026-10-16 09:02:10-03', null
  ),
  'applied',
  'A registra uma batida'
);

select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000001', '2026-10-16 09:02-03', 'manual', 'Chuva',
    '2026-10-16 09:02:10-03', null
  ),
  'applied',
  'reenviar a mesma escrita é aceito'
);

select results_eq(
  $$ select user_id, punched_at, source, note, local_date from public.punches $$,
  $$ values ('00000000-0000-4000-8000-00000000000a'::uuid, '2026-10-16 09:02-03'::timestamptz,
             'manual', 'Chuva', '2026-10-16'::date) $$,
  'reenviar não duplica: uma linha, do usuário da sessão'
);

-- local_date perto da meia-noite em São Paulo (mesmo caso do domínio, local-time.test.ts).
select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000002', '2026-10-17 02:59Z', 'manual', null, now(), null
  ),
  'applied',
  'A registra 23:59 em São Paulo'
);
select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000003', '2026-10-17 03:00Z', 'ocr', null, now(), null
  ),
  'applied',
  'A registra 00:00 do dia seguinte em São Paulo'
);
select results_eq(
  $$ select local_date from public.punches
     where id in ('01900000-0000-7000-8000-000000000002', '01900000-0000-7000-8000-000000000003')
     order by punched_at $$,
  $$ values ('2026-10-16'::date), ('2026-10-17'::date) $$,
  'local_date é a data de São Paulo: 02:59Z ainda é o dia anterior, 03:00Z já é o seguinte'
);

-- LWW por updated_at
select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000001', '2026-10-16 09:30-03', 'manual', 'Antiga',
    '2026-10-16 09:00-03', null
  ),
  'stale',
  'escrita com updated_at mais antigo é stale'
);
select results_eq(
  $$ select punched_at, note from public.punches where id = '01900000-0000-7000-8000-000000000001' $$,
  $$ values ('2026-10-16 09:02-03'::timestamptz, 'Chuva') $$,
  'stale não altera a batida'
);

select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000001', '2026-10-16 09:05-03', 'manual', null,
    '2026-10-16 10:00-03', null
  ),
  'applied',
  'escrita mais nova edita a batida'
);
select results_eq(
  $$ select punched_at, note from public.punches where id = '01900000-0000-7000-8000-000000000001' $$,
  $$ values ('2026-10-16 09:05-03'::timestamptz, null::text) $$,
  'a edição mais nova prevalece'
);

-- Uma batida por minuto
select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000004', '2026-10-16 09:05-03', 'manual', null, now(), null
  ),
  'duplicate_minute',
  'outra batida no mesmo minuto é duplicate_minute'
);
select is(
  (select count(*) from public.punches where punched_at = '2026-10-16 09:05-03'),
  1::bigint,
  'duplicate_minute não cria a batida'
);

select throws_ok(
  $$ select public.upsert_punch(
       '01900000-0000-7000-8000-000000000005', '2026-10-16 09:10:30-03', 'manual', null, now(), null
     ) $$,
  '23514',
  null,
  'batida com segundos é recusada'
);

-- Exclusão lógica libera o minuto
select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000001', '2026-10-16 09:05-03', 'manual', null,
    '2026-10-16 11:00-03', '2026-10-16 11:00-03'
  ),
  'applied',
  'A exclui a batida (soft delete)'
);
select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000004', '2026-10-16 09:05-03', 'manual', null, now(), null
  ),
  'applied',
  'o minuto de uma batida excluída fica livre'
);

-- Histórico por trigger
select results_eq(
  $$ select action, old is null, new ->> 'punched_at' from public.punch_history
     where punch_id = '01900000-0000-7000-8000-000000000001' order by id $$,
  $$ values ('insert', true, '2026-10-16T12:02:00+00:00'),
            ('update', false, '2026-10-16T12:05:00+00:00'),
            ('delete', false, '2026-10-16T12:05:00+00:00') $$,
  'insert, edição e exclusão lógica ficam no histórico; reenvio e stale não'
);

-- Escrita direta
select throws_ok(
  $$ insert into public.punches (id, punched_at, source, updated_at)
     values ('01900000-0000-7000-8000-000000000006', '2026-10-16 18:00-03', 'manual', now()) $$,
  '42501',
  null,
  'batida não é criada fora da RPC'
);
select throws_ok(
  $$ update public.punches set note = 'x' $$,
  '42501',
  null,
  'batida não é alterada fora da RPC'
);
select throws_ok(
  $$ delete from public.punches $$,
  '42501',
  null,
  'batida não é apagada de verdade'
);
select throws_ok(
  $$ insert into public.punch_history (punch_id, user_id, action)
     values ('01900000-0000-7000-8000-000000000004', '00000000-0000-4000-8000-00000000000a', 'insert') $$,
  '42501',
  null,
  'histórico não é escrito pelo cliente'
);

-- Como B
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select is((select count(*) from public.punches), 0::bigint, 'B não lê as batidas de A');
select is((select count(*) from public.punch_history), 0::bigint, 'B não lê o histórico de A');

select throws_ok(
  $$ select public.upsert_punch(
       '01900000-0000-7000-8000-000000000004', '2026-10-16 18:00-03', 'manual', null,
       '2099-01-01', null
     ) $$,
  '42501',
  null,
  'B não altera uma batida de A pelo id'
);

select is(
  public.upsert_punch(
    '01900000-0000-7000-8000-000000000007', '2026-10-16 09:05-03', 'manual', null, now(), null
  ),
  'applied',
  'B bate no mesmo minuto de A: a unicidade é por usuário'
);

-- Sem sessão
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok(
  $$ select * from public.punches $$,
  '42501',
  null,
  'anônimo não lê batidas'
);
select throws_ok(
  $$ select public.upsert_punch(
       '01900000-0000-7000-8000-000000000008', '2026-10-16 09:00-03', 'manual', null, now(), null
     ) $$,
  '42501',
  null,
  'anônimo não registra batida'
);

select * from finish();
rollback;
