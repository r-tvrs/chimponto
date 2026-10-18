-- companies e company_members: membro lê a própria empresa; só admin altera; escrita só via
-- create_company, que falha para quem já é membro (docs/04 §RLS e §RPCs).
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ana@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'bruno@example.com'),
  ('00000000-0000-4000-8000-00000000000c', 'carla@example.com'),
  ('00000000-0000-4000-8000-00000000000d', 'davi@example.com');

set local role authenticated;

-- Como B
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select isnt(
  public.create_company('Bananal Ltda', '{"dailyMinutes":528}'),
  null,
  'B cria a própria empresa'
);

-- Como A
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select isnt(
  public.create_company('  Lumen Software  ', '{"dailyMinutes":480}'),
  null,
  'A cria a própria empresa'
);

select results_eq(
  $$ select name, timezone, rules from public.companies $$,
  $$ values ('Lumen Software', 'America/Sao_Paulo', '{"dailyMinutes":480}'::jsonb) $$,
  'A lê só a própria empresa, com o nome sem espaços nas pontas'
);

select results_eq(
  $$ select user_id, role from public.company_members $$,
  $$ values ('00000000-0000-4000-8000-00000000000a'::uuid, 'admin') $$,
  'A vira admin e não lê o vínculo de B'
);

select throws_ok(
  $$ select public.create_company('Outra Empresa', '{}') $$,
  '23505',
  null,
  'create_company falha para quem já é membro'
);

update public.companies set name = 'Lumen Software Ltda';

select is(
  (select name from public.companies),
  'Lumen Software Ltda',
  'admin altera a própria empresa'
);

select throws_ok(
  $$ insert into public.companies (name, rules) values ('Direta', '{}') $$,
  '42501',
  null,
  'empresa não é criada fora da RPC'
);

select throws_ok(
  $$ insert into public.company_members (company_id, user_id, role)
     select id, '00000000-0000-4000-8000-00000000000a', 'admin' from public.companies $$,
  '42501',
  null,
  'vínculo não é criado fora da RPC'
);

select throws_ok(
  $$ update public.company_members set role = 'member' $$,
  '42501',
  null,
  'vínculo não é alterado pelo cliente'
);

select throws_ok(
  $$ delete from public.companies $$,
  '42501',
  null,
  'empresa não é excluída pelo cliente'
);

-- A não enxerga a empresa de B, então o UPDATE não a atinge.
update public.companies set name = 'Invadida' where name = 'Bananal Ltda';

-- Como B
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select is(
  (select name from public.companies),
  'Bananal Ltda',
  'A não altera a empresa de B'
);

-- C entra na empresa de A como membro comum (o convite chega na v1.4).
reset role;
insert into public.company_members (company_id, user_id, role)
  select id, '00000000-0000-4000-8000-00000000000c', 'member'
  from public.companies where name = 'Lumen Software Ltda';
set local role authenticated;

-- Como C
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}';

select results_eq(
  $$ select name from public.companies $$,
  $$ values ('Lumen Software Ltda') $$,
  'membro lê a empresa'
);

update public.companies set name = 'Alterada pelo membro', rules = '{}';

select results_eq(
  $$ select name, rules from public.companies $$,
  $$ values ('Lumen Software Ltda', '{"dailyMinutes":480}'::jsonb) $$,
  'membro não altera a empresa'
);

-- Como D, ainda sem empresa
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000d","role":"authenticated"}';

select throws_ok(
  $$ select public.create_company('   ', '{}') $$,
  '23514',
  null,
  'nome em branco é rejeitado'
);

select throws_ok(
  $$ select public.create_company('Davi ME', '[480]') $$,
  '23514',
  null,
  'regras que não são um objeto são rejeitadas'
);

select is(
  (select count(*) from public.company_members),
  0::bigint,
  'D continua sem empresa depois das falhas'
);

-- Sem sessão
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok(
  $$ select * from public.companies $$,
  '42501',
  null,
  'anônimo não lê empresas'
);

select throws_ok(
  $$ select public.create_company('Anônima', '{}') $$,
  '42501',
  null,
  'anônimo não cria empresa'
);

select * from finish();
rollback;
