# 03 — Arquitetura

## Stack

| Camada | Escolha |
|---|---|
| Repositório | Monorepo pnpm: `apps/web`, `packages/domain`, `supabase/` |
| Frontend | React + Vite + TypeScript, PWA (`vite-plugin-pwa`) |
| Estado do servidor | TanStack Query |
| Estado do cliente | Zustand — apenas estado do cofre (chave em memória, bloqueado/desbloqueado) |
| Offline | IndexedDB via Dexie (outbox + cache) |
| Validação | Zod (schemas em `packages/domain`) |
| UI | shadcn/ui + Tailwind + Radix + lucide-react |
| OCR | Tesseract.js (no navegador, carregado sob demanda) |
| Criptografia | WebCrypto (AES-GCM 256, PBKDF2-SHA256) |
| Backend | Supabase: Postgres, Auth, RLS, RPC, Edge Functions (Deno/TS), pg_cron, pg_net |
| Push | Web Push (VAPID) a partir de Edge Function |
| Testes | Vitest (`packages/domain`, web) + Testing Library; RLS em pgTAP (`supabase test db`); E2E com Playwright. TDD obrigatório (ver `AGENTS.md`) |
| Hospedagem web | Cloudflare Pages (`*.pages.dev`) |
| CI / rotinas | GitHub Actions |

## Estrutura

```
apps/web/              PWA
packages/domain/       regras puras: dia, período, lembretes, salário, tabelas fiscais, schemas Zod
supabase/migrations/   SQL versionado (tabelas, RLS, triggers, cron)
supabase/functions/    Edge Functions
supabase/tests/        testes de RLS
docs/
```

## Componentes

```
 PWA (React)                              Supabase
 ┌───────────────────────────┐   HTTPS   ┌─────────────────────────────────┐
 │ UI (shadcn)               │◄─────────►│ Auth (magic link, Google)       │
 │ TanStack Query            │           │ PostgREST + RLS                 │
 │ Outbox (Dexie/IndexedDB)  │           │ RPC: upsert_punch, accept_invite│
 │ packages/domain           │           │ Trigger: agenda lembretes       │
 │ Tesseract.js / WebCrypto  │           │ pg_cron (1/min) → pg_net ──┐    │
 │ Service Worker (push)     │◄── push ──│ Edge Fn send-notifications ◄┘   │
 └───────────────────────────┘           └─────────────────────────────────┘
  Cloudflare Pages                         GitHub Actions: backup diário → R2,
                                           keepalive diário
```

## Decisões

### D1 — Supabase em vez de backend próprio
Custo zero, RLS garante isolamento no banco, menos código. Saída: Postgres padrão (`pg_dump`).

### D2 — Cálculo no cliente
Salário é cifrado ponta a ponta; o servidor não pode calcular. Saldo também é calculado no cliente (funciona offline). `packages/domain` é a única implementação das regras.

### D3 — Offline-first com outbox
- O cliente gera o `id` da batida (UUID v7).
- Toda escrita entra primeiro na outbox (IndexedDB) e é refletida na UI imediatamente.
- Sincronização via RPC idempotente `upsert_punch(id, punched_at, source, note, updated_at, deleted_at)`.
- Conflito: *last-write-wins* por `updated_at`; o RPC ignora escrita com `updated_at` mais antigo que o persistido.
- Reenvio com backoff ao voltar a conexão (`online` event + ao abrir o app).
- Leitura: cache do TanStack Query persistido no IndexedDB.

### D4 — Lembretes agendados no banco
- Trigger em `punches` (insert/update/delete) recalcula as linhas de `scheduled_notifications` do dia afetado, conforme `02-regras-de-negocio.md` §7.
- `pg_cron` a cada minuto chama (via `pg_net`) a Edge Function `send-notifications`, que busca `status='pending' AND send_at <= now()`, envia Web Push e marca `sent`/`failed`.
- Seleção com `FOR UPDATE SKIP LOCKED` para evitar envio duplicado.
- Subscription inválida (HTTP 404/410) → removida.
- Garantia: entrega ao menos uma vez; sobrevive a reinícios.
- A lógica de classificação no trigger SQL deve espelhar `packages/domain` (por ordem de horário no dia) e ter teste equivalente.

### D5 — Autenticação
- Supabase Auth: link mágico por e-mail e Google OAuth. Sem senha de login.
- Senha do cofre é separada e nunca sai do navegador (ver `05-seguranca.md`).
- Sessão gerenciada pelo SDK do Supabase.

### D6 — Multiusuário
- Todo usuário pertence a uma empresa (`company_members`, um por usuário na v1).
- Entrada por convite: link com token de uso limitado e expiração; aceito via RPC `accept_invite`.
- Sem convite: o usuário cria a própria empresa e vira admin.
- Admin edita configurações e feriados da empresa; não lê dados de outros membros.

### D7 — Feriados nacionais
Edge Function (ou GitHub Action) anual busca a BrasilAPI e grava em `holidays` com `company_id = null`.

## Rotinas (GitHub Actions)

| Rotina | Frequência | Função |
|---|---|---|
| Backup | diária | `pg_dump` → Cloudflare R2 (retenção 30 dias). Credenciais em GitHub Secrets |
| Keepalive | diária | Consulta simples para evitar pausa do projeto gratuito (7 dias sem atividade) |
| CI | por push/PR | lint, typecheck, Vitest, pgTAP, Playwright, gitleaks |

## Custos

| Item | Custo |
|---|---|
| Supabase Free (500 MB DB, 50k MAU, 500k invocações Edge) | R$ 0 |
| Cloudflare Pages | R$ 0 |
| Cloudflare R2 (10 GB) | R$ 0 |
| GitHub (repo público, Actions) | R$ 0 |
| E-mail de autenticação | R$ 0 (SMTP do Supabase; limite baixo de envio — trocar por Resend free se necessário) |
| Domínio | R$ 0 (`*.pages.dev`) |
| **Total** | **R$ 0** |

Riscos: limites do plano grátis podem mudar; sem backup nativo no Free (coberto pela rotina); pausa por inatividade (coberta pelo keepalive).

## Escala futura (não implementar agora)

Plano Pro do Supabase (backups, sem pausa), fila dedicada para push, CDN já incluído no Pages. A arquitetura não exige mudanças estruturais para isso.
