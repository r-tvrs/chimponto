-- profiles: criado no cadastro; dono lê e escreve; ninguém mais (docs/04 §RLS).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ana@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'bruno@example.com');

select results_eq(
  $$ select user_id, display_name, reminders_enabled, reminder_lead_minutes
     from public.profiles
     where user_id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b')
     order by user_id $$,
  $$ values ('00000000-0000-4000-8000-00000000000a'::uuid, null::text, true, 10),
            ('00000000-0000-4000-8000-00000000000b'::uuid, null::text, true, 10) $$,
  'cadastro cria o perfil com os padrões'
);

-- Como A
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select results_eq(
  $$ select user_id from public.profiles $$,
  $$ values ('00000000-0000-4000-8000-00000000000a'::uuid) $$,
  'A lê só o próprio perfil'
);

update public.profiles set display_name = 'Ana Lima'
  where user_id = '00000000-0000-4000-8000-00000000000a';
update public.profiles set display_name = 'Invadido'
  where user_id = '00000000-0000-4000-8000-00000000000b';

select is(
  (select display_name from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a'),
  'Ana Lima',
  'A edita o próprio nome de exibição'
);

select throws_ok(
  $$ insert into public.profiles (user_id) values ('00000000-0000-4000-8000-00000000000b') $$,
  '42501',
  null,
  'A não cria perfil em nome de B'
);

select throws_ok(
  $$ update public.profiles set user_id = '00000000-0000-4000-8000-00000000000b'
     where user_id = '00000000-0000-4000-8000-00000000000a' $$,
  '42501',
  null,
  'A não transfere o próprio perfil para B'
);

-- Exclusão de conta vem por RPC (delete_account); o cliente não apaga perfis.
select throws_ok(
  $$ delete from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b' $$,
  '42501',
  null,
  'A não exclui o perfil de B'
);

-- Como B
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select is(
  (select display_name from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b'),
  null,
  'A não altera o perfil de B'
);

-- Sem sessão
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  null,
  'anônimo não acessa perfis'
);

select * from finish();
rollback;
