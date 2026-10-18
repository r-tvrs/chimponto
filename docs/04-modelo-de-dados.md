# 04 — Modelo de dados (Postgres / Supabase)

Todas as tabelas em `public` com **RLS habilitado**. `auth.uid()` identifica o usuário. Escritas de sistema (trigger, cron, Edge Functions) usam `security definer` ou `service_role`.

## Tabelas

### `companies`
| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid pk | |
| name | text | |
| timezone | text | `America/Sao_Paulo` |
| rules | jsonb | Configuração de jornada (`02-regras-de-negocio.md` §1), validada por schema Zod. O banco só exige um objeto; todo leitor passa `rules` por `companyRulesSchema.parse` |
| created_at | timestamptz | |

### `company_members`
| Coluna | Tipo | Nota |
|---|---|---|
| company_id | uuid fk | |
| user_id | uuid fk `auth.users` | **unique** (uma empresa por usuário na v1) |
| role | text | `admin` \| `member` |
| created_at | timestamptz | |

### `company_invites`
| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid pk | |
| company_id | uuid fk | |
| token_hash | text | SHA-256 do token; o token só aparece no link |
| expires_at | timestamptz | padrão: 7 dias |
| max_uses / uses | int | |
| created_by | uuid | |

### `profiles`
| Coluna | Tipo | Nota |
|---|---|---|
| user_id | uuid pk | |
| display_name | text | |
| reminders_enabled | boolean | padrão true |
| reminder_lead_minutes | int | padrão 10 |

### `holidays`
| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid pk | |
| company_id | uuid null | `null` = nacional |
| date | date | |
| name | text | |
| kind | text | `holiday` \| `company_day_off` |
unique(company_id, date)

### `punches`
| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid pk | gerado no cliente (UUID v7) |
| user_id | uuid | |
| punched_at | timestamptz | segundos = 0 |
| local_date | date | gerada: `(punched_at at time zone 'America/Sao_Paulo')::date` |
| source | text | `manual` \| `ocr` |
| note | text null | até 200 caracteres |
| created_at / updated_at | timestamptz | `updated_at` vem do cliente (LWW) |
| deleted_at | timestamptz null | soft delete |
Índice único parcial: `(user_id, punched_at) where deleted_at is null`. Índice `(user_id, local_date)`.

### `punch_history`
`id, punch_id, user_id, action (insert|update|delete), old jsonb, new jsonb, changed_at` — preenchida por trigger.

### `day_marks`
| Coluna | Tipo | Nota |
|---|---|---|
| user_id | uuid | pk composta |
| date | date | pk composta |
| type | text | `falta` \| `atestado` \| `ferias` \| `folga_compensada` \| `abono` |
| note | text null | |
| updated_at / deleted_at | timestamptz | sincronização offline |

### `vaults`
| Coluna | Tipo | Nota |
|---|---|---|
| user_id | uuid pk | |
| kdf | jsonb | `{ alg: 'PBKDF2-SHA256', iterations, salt }` |
| wrapped_dek_password | text | DEK cifrada pela chave da senha do cofre (base64) |
| wrapped_dek_recovery | text | DEK cifrada pela chave do código de recuperação |
| verifier | text | valor conhecido cifrado com a DEK, para validar a senha |
| version | int | |

### `salary_profiles`
| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | |
| valid_from | date | vigência (reajustes não alteram o passado) |
| ciphertext | text | JSON de `02-regras-de-negocio.md` §8.1 cifrado (AES-GCM) |
| iv | text | |
| schema_version | int | |

### `payslip_actuals`
`id, user_id, period_end date, ciphertext, iv` — líquido real informado pelo usuário, cifrado.

### `push_subscriptions`
`id, user_id, endpoint (unique), p256dh, auth, user_agent, created_at`

### `scheduled_notifications`
| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | |
| local_date | date | |
| type | text | `lunch_return` \| `end_of_day` |
| send_at | timestamptz | |
| status | text | `pending` \| `sent` \| `canceled` \| `failed` |
| attempts | int | |
unique(user_id, local_date, type). Índice `(status, send_at)`.

## RLS

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| companies | membro | admin (UPDATE); INSERT via RPC `create_company` |
| company_members | o próprio registro; admin vê membros (sem dados pessoais além do nome) | via RPC |
| company_invites | admin | admin |
| profiles | dono | dono (INSERT/UPDATE); criado por trigger no cadastro; exclusão só via `delete_account` |
| holidays | nacional ou da própria empresa | admin da empresa |
| punches, punch_history | dono | `punches` só via RPC `upsert_punch` (sem DELETE físico; exclusão é `deleted_at`); `punch_history` só via trigger |
| day_marks | dono | dono |
| vaults, salary_profiles, payslip_actuals | dono | dono |
| push_subscriptions | dono | dono |
| scheduled_notifications | dono | apenas sistema |

Cada política tem teste: usuário A não lê/escreve linhas do usuário B; membro não altera empresa; admin não lê `punches`/`salary_profiles` de membros.

## RPCs

| Função | Descrição |
|---|---|
| `create_company(name, rules)` | Cria empresa e torna o chamador admin (falha se já for membro) |
| `create_invite(max_uses, expires_in)` | Admin; retorna token em claro uma única vez |
| `accept_invite(token)` | Valida hash/expiração/usos e insere membro |
| `upsert_punch(...)` | Idempotente, LWW por `updated_at` |
| `upsert_day_mark(...)` | Idem |
| `delete_account()` | Remove todos os dados do usuário (LGPD) |

## Triggers

- `auth.users` (insert) → cria o `profiles` do novo usuário (o link mágico cria o usuário).
- `punches` → grava `punch_history`; recalcula `scheduled_notifications` de `local_date` (cancela/cria/atualiza conforme §7 das regras).
