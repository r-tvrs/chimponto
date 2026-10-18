# 08 — Pendências

## Confirmar com o RH 🔶

| # | Pergunta | Padrão atual | Afeta |
|---|---|---|---|
| 1 | Como a tolerância é aplicada (5 min/marcação, 10 min/dia)? | 10 min/dia, integral se ultrapassar | §4 |
| 2 | Horas positivas e negativas se compensam dentro do período ou são tratadas dia a dia? | Dia a dia (`compensateWithinPeriod=false`) | §6 |
| 3 | Há reflexo de horas extras no DSR? | Sim | §8.3 |
| 4 | Falta injustificada desconta o DSR da semana? | Sim | §8.4 |
| 5 | Adicional de sábado é 50%? | 50% | §1 |
| 6 | Almoço menor que 1h gera pagamento do tempo suprimido? | Só alerta | §3.3 |
| 7 | Fechamento é sempre no dia 19? | 19 | §5 |
| 8 | Adiantamento: percentual, data de pagamento e forma de desconto | 40% do salário-base, descontado no dia 1º | §8.1, §8.7 |

## Validar com o holerite

- Rubricas existentes (proventos e descontos) e ordem de cálculo.
- Base de cálculo de INSS/IRRF (o que é tributável).
- Como aparecem HE, DSR, atrasos e adiantamento.
- Conferir uma estimativa do app contra um holerite real.

## Decisões em aberto

Vindas da review do #4 (bater ponto). Comportamento atual mantido até decidir.

| # | Questão | Comportamento atual | Afeta |
|---|---|---|---|
| 1 | Dia com 6+ batidas: a última vira "Retorno extra" e a 4ª, no meio do expediente, fica "Saída". O rótulo deveria refletir que a última é a saída do dia? | `docs/02` §2.1 ao pé da letra: 5ª+ alterna saída/retorno extra | `docs/02` §2.1, `labelDay`, toasts |
| 2 | Limite da observação da batida | 200 caracteres (check no banco e `maxLength` no input) | `docs/04` `punches.note` |
| 3 | Duas escritas da mesma batida com o mesmo `updated_at` e conteúdo diferente | `upsert_punch` mantém a primeira e devolve `applied` para a segunda | `upsert_punch`, sincronização offline (#6) |
| 4 | Visual do erro de minuto duplicado no sheet | Bloco tingido `negative` com `TriangleAlert`; o handoff pede borda `negative` no campo + mensagem 12,5/700 | Sheet "Bater ponto" |
| 5 | Teste da Hoje usa `vi.mock("@/data/profile")` (o perfil lê o Supabase direto) | Mock de módulo; alternativa é injetar o perfil por Context, como `Companies` e `Punches` | `today.test.tsx`, `data/profile.ts` |

Vindas do #5 (saldo do dia). Comportamento atual mantido até decidir.

| # | Questão | Comportamento atual | Afeta |
|---|---|---|---|
| 7 | "Trabalhadas" conta só os pares fechados; com a volta do almoço batida, o tile não anda até a saída | Pares fechados | Tile "Trabalhadas" |

Vindas da review do #6 (offline). Comportamento atual mantido até decidir.

| # | Questão | Comportamento atual | Afeta |
|---|---|---|---|
| 8 | Teste "online com fila" pode ficar instável: o servidor falso falha uma vez e a nova tentativa, com timer real de 1 s, esconde a pill | Passa porque a pill aparece antes de 1 s; correção é o servidor falso falhar sempre | `today.test.tsx` |
| 9 | Conexão caiu logo depois do último envio: o recarregamento das batidas fica pausado e os itens já aceitos só saem da fila quando a conexão volta | A pill conta como "na fila" batidas que já estão no servidor, até voltar o sinal | `createPunchSync`, pill de sync |
| 10 | Sessão expirada (401) é tratada como falha de rede | Nova tentativa a cada 1 min, sem fim, até o usuário entrar de novo | `supabasePunches.upsert`, sincronizador |
| 11 | "Cache de leitura limpo ao sair" (D3) não tem teste | Funciona pelo `queryClient.clear()` do provider de auth, que o persister acompanha | `supabase-auth-provider.tsx` |
| 12 | Abrir o app já sem rede: o `onlineManager` do TanStack v5 começa online e só muda com eventos | Banner, pill "Offline ·" e toast offline só aparecem depois de um evento `offline`; iniciar pelo `navigator.onLine` resolve | #12 (PWA que abre sem conexão) |

Refatorações apontadas em todas as rodadas da review do #6 (sem efeito no comportamento):

- Status online lido direto do `onlineManager` em `punch-sheet.tsx` e `punch-sync.tsx`; a tela usa `useOnline()`.
- Componente e tipo com o mesmo nome `PunchSync` (importado como `Sync`).
- `whenOf` em `conflict-alerts.tsx` monta `DD/MM` com `split("-")`; candidato a `formatShortDate` em `packages/domain/src/format.ts`.
- O filtro "pula conflito" aparece em `withQueue`, no sincronizador e na Hoje; um seletor único de pendentes e conflitos.
- Props de `ConflictAlerts` e `ConflictAlert` declaradas duas vezes.
- `lib/offline-db.ts` importa `OutboxItem` de `punches/` (`lib` dependendo de uma feature).
- `freshOutbox` e a limpeza dos bancos repetidos em `today.test.tsx` e `sync.test.ts`.

Vindas do #7 (período). Comportamento atual mantido até decidir.

| # | Questão | Comportamento atual | Afeta |
|---|---|---|---|
| 13 | Empresa com sábado em `workdays`: a hora extra do sábado leva o adicional de sábado ou o de dia útil? | Adicional pelo dia do calendário (sábado) | `summarizePeriod`, salário (#10) |
| 14 | E2E com relógio fixo: o `page.clock` do Playwright quebra o `Intl.DateTimeFormat.formatToParts` do app ("this is not a Date object") | `period.spec.ts` usa um período já fechado (20/08 → 19/09/2026) e o relógio real | E2E que dependem da data |

Refatorações apontadas na review do #7 (sem efeito no comportamento):

- Total de horas extras (`summary-card.tsx`) e soma `pendingDays + incompleteDays` (`period.tsx`, `summary-card.tsx`) calculados na UI; candidatos a `overtimeTotal` e `unresolvedDays` em `PeriodSummary`.
- `usePunchesBetween` repete o corpo de `usePunchesOn`, e `between` torna `onDate` redundante (`onDate(d)` = `between(d, d)`).
- `new Date(Date.UTC(...)).toISOString().slice(0, 10)` repetido em `period.ts` (`dayOf`) e `local-time.ts` (`addDays`).
- Humor do mascote por sinal em `summary-card.tsx` reimplementa `balanceTone`; a Hoje usa `humorOf`.
- `LocalDate` desmontado com `slice` na UI (`day-list.tsx`) e em `format.ts` (`monthOf`, `formatDayMonth`); mesmo caso do `whenOf` acima.
- `usePeriodSummary` aceita `rules: CompanyRules | undefined`, mas os dois chamadores sempre passam `rules`.
- `today/period-tile.tsx` importa `usePeriodSummary` de `screens/period/`; o hook caberia em `punches/` ou num módulo compartilhado.
- `period-selector.tsx` usa `React.ReactNode` sem importar `React`; `day-list.tsx` importa `type ReactNode`.
- Texto "começa em …" do seletor para período futuro nunca aparece, porque o "próximo" fica desabilitado no período atual.
- Filtro "Pendências (0)" mostra o card da lista vazio, sem estado vazio.

`summarizeDay` ainda não considera feriados nem tipos de dia: `expectedMinutes` vem só de `workdays` e `dailyMinutes`. Chegam com o #9 (tipo do dia) e o #11 (feriados).

## Implementação

- Preencher `packages/domain/src/tax-tables/2026.ts` (INSS, IRRF, dedução por dependente, desconto simplificado, redutor Lei 15.270/2025) a partir de fonte oficial.
- Escolher biblioteca Web Push compatível com Deno para a Edge Function.

