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

Vindas do #8 (tela Dia). Comportamento atual mantido até decidir.

| # | Questão | Comportamento atual | Afeta |
|---|---|---|---|
| 15 | Observação do dia (handoff §6.6). Os critérios do #9 não citam o campo, e `day_marks.type` (`docs/04`) é obrigatório e não tem "normal": um dia Normal com observação não tem onde ser gravado sem mudar o schema | Sem o campo na tela. `day_marks.note` existe e a RPC grava; o Dia preserva a nota salva ao trocar o tipo | Tela Dia, `docs/04` |
| 16 | Rótulos mudam enquanto o usuário digita (a linha editada pode trocar de rótulo com as outras) | Rótulo sempre pela ordem cronológica, linhas paradas na ordem da tela | Tela Dia |
| 17 | Trocar as horas de batidas em ciclo (A vai para o minuto de B e B para o de A): a primeira edição chega ao servidor com o minuto ainda ocupado | As edições do ciclo viram conflito `duplicate_minute` na Hoje (todas: como a primeira falha, o minuto que a seguinte quer continua ocupado). Exclusões sobem antes das edições e uma cadeia de edições é ordenada (quem libera o minuto sobe antes); só o ciclo não tem ordem possível | "Salvar dia", sincronização |
| 18 | Batida criada, movida ou excluída em outro aparelho depois da primeira edição no Dia | O rascunho para de acompanhar as salvas e continua mostrando como estavam; "Salvar dia" grava só o que o usuário mudou desde a primeira edição, sem desfazer o que veio do outro aparelho | Tela Dia |
| 19 | Sair do Dia com `replace` deixa duas entradas do Período seguidas no histórico (a de antes do Dia e a da volta) | O voltar do sistema logo depois passa pela entrada antiga do Período (no período atual, porque ela não guarda o escolhido). Alternativa: guardar o período escolhido no estado do histórico e sair do Dia com `navigate(-1)` | Tela Dia, Período |
| 20 | "Salvar dia" falha no meio (o aparelho grava parte das escritas na outbox) | Saindo pelo voltar, o que já entrou na fila sobe sozinho e o dia fica meio salvo, embora o toast tenha dito que não salvou. Salvando de novo, `base` continua o da primeira edição: as escritas que já entraram se repetem com `updatedAt` novo (linhas a mais no `punch_history`; o comentário de `save()` em `day.tsx` diz "mesmo id e valores", o que não é exato), e desfazer no rascunho algo que já entrou na fila não gera escrita (ex.: A movida de 09:00 para 09:10 entra, a falha vem depois; voltar A para 09:00 e salvar deixa A às 09:10 no servidor). Correção prevista: aplicar a `base` cada escrita que entrou na fila | Tela Dia |
| 21 | Período sem conexão num período que o aparelho nunca baixou | Mostra os dias como vazios ("Sem registro"), pela regra do D3; o Dia desses dias espera a conexão | Período |
| 22 | Releitura do Período que falha com o resumo já na tela | Troca o resumo por "Não deu para abrir o período" (o Dia mantém o editor; ver `docs/07`) | Período |
| 23 | Marcação do dia recusada pelo servidor (`rejected`: RLS, argumento inválido) | Sai da fila sem aviso; a tela volta a mostrar o tipo salvo no servidor. Correção prevista: conflito visível na Hoje, como nas batidas | Sincronização |
| 24 | Tipo do dia mudado em outro aparelho com o Dia aberto | "Salvar dia" compara o tipo escolhido com o salvo no momento de salvar (não no da primeira edição, como as batidas); se forem iguais, não grava | Tela Dia |
| 25 | Hoje não lê `day_marks` | A Hoje calcula o dia sem marcação. O Dia só abre dias passados, então a marcação de hoje só chega por outro caminho (não existe na v1) | Hoje |
| 26 | Contagem de faltas do período | `summarizePeriod` devolve `absenceDays`, mas nenhuma tela mostra; cada dia da lista mostra o badge "Falta" | Período |
| 27 | Cobertura de testes do #9 | O pgTAP "B marca a mesma data sem tocar na de A" não relê a linha de A (o isolamento vem do `auth.uid()` da RPC); nenhum teste salva uma marcação sem conexão de ponta a ponta (fila, outbox e mescla testadas em separado) | Testes |

Refatorações apontadas na review do #8 (sem efeito no comportamento):

- `labelDraftDay` copia de `daySlots` a montagem dos rótulos que faltam (`missing`/`splice`); candidato a `missingLabels(total, used)`.
- `OFFLINE_TOAST` e a escolha entre o toast online e o offline repetidos em `day.tsx` e `today/punch-sheet.tsx`, que divergem: o sheet lê `onlineManager.isOnline()` na hora de gravar, o Dia usa o `useOnline()` do render. Candidato a um helper em `punches/`.
- `<input type="time">` cru em `day/day-punches-card.tsx` repete as classes base de `components/ui/input.tsx`; o sheet usa `<Input className=…>`.
- `DayAlerts`, `DayTiles` e `Tile` com o mesmo nome em `today/` e `day/`, e o `switch (alert.kind)` repetido nos dois `day-alerts.tsx` (a microcopy difere: handoff §1.4 e §6.2).
- `DraftRow` (domínio) é o resultado com rótulo e duplicado, não a linha; ao lado de `DraftPunch` e `DraftRowValue`, o nome confunde. Candidato a `LabeledDraftRow`.
- `fromLocal(date, "12:00")` usado como validador de data em `day.tsx`; candidato a `isLocalDate` no domínio. `Number(date.slice(8, 10))` no toast é o mesmo caso do `LocalDate` desmontado com `slice` acima.
- `day.test.tsx` é a 4ª cópia dos fakes de `auth`, `punches` e `companies` (period, today, company); candidato a `src/test/fakes.ts`.
- `day.tsx` tem o único `eslint-disable` do repo (`exhaustive-deps`, com a chave `savedKey` montada em string).
- `today/punch-sheet.tsx` tem a mesma falha que o Dia tinha: se `writePunch` rejeitar, `saving` fica `true` e o erro some.
- `writesOf` e `vacatingFirst` são lógica de escrita e sincronização dentro de `day.tsx`; caberiam em `punches/`, ao lado de `withQueue`.
- Filtro "linhas do rascunho com hora" repetido em `day.tsx` (`flatMap`) e em `labelDraftDay` (`filter`).
- Regra "hoje vai para a Hoje, passado abre o Dia, futuro não abre" escrita em `period/day-list.tsx` e nos `Navigate` de `day.tsx`.
- Formato do estado do histórico `{ date }` repetido em `day.tsx` (dois pontos) e lido em `period.tsx` com `as`; candidato a um helper tipado.
- E2E: `punchDay` copiado entre `day.spec.ts` e `period.spec.ts`, e o laço "voltar até 20 ago → 19 set" três vezes; cabem em `e2e/onboarding.ts`.
- `ChildLayout` junta `pb-6` e `pb-[max(…)]` por template string; qual vence depende da ordem do CSS gerado. O repo usa `cn()` (tailwind-merge).
- `day.tsx` junta as linhas com os rótulos por índice (`labeled[i]!`), embora `labelDraftDay` devolva o `id`.
- "6h" escrito na microcopy de `day/day-alerts.tsx`, com `MAX_MINUTES_WITHOUT_LUNCH` no domínio.
- `usePunchesOn` e `usePunchesBetween` divergem: só o segundo expõe `queueOnly`, e a regra "consulta pausada sem dados = só a fila" está escrita de dois jeitos. Candidato a um helper comum aos dois.
- `OfflineDay` (`day.tsx`) copia o layout de `ErrorState`; candidato a um `MascotState` com `onRetry` opcional.
- O Dia offline depende de montar a mesma chave de consulta que `usePeriodSummary` (`periodContaining` → `usePunchesBetween`); só o comentário, o `docs/03` e o teste amarram as duas pontas.
- `edited?.base ?? saved` escrito duas vezes em `DayEditor` (`setRows` e `save`); calcular `base` uma vez. `setRows` também congela `base` na primeira edição, e o nome esconde isso (candidato a `editRows`).
- `DayAlerts` recebe `punchCount` e `expectedLunchMinutes` ao lado de `alerts` porque `odd_punches` não traz a contagem (`short_lunch` traz os minutos); candidato a `{ kind: "odd_punches"; punchCount }` no domínio.
- `day.test.tsx` dispara as releituras com `queryClient.invalidateQueries()`; o `onlineManager.setOnline` (a releitura da reconexão) é um gatilho que o usuário vê.
- `day/day-punches-card.tsx` monta ids de dois jeitos: `${row.id}-error` para o erro e `useId()` para o título.

`summarizeDay` ainda não considera feriados: `expectedMinutes` vem de `workdays`, `dailyMinutes` e do tipo do dia. Chegam com o #11.

Vindas do #9 (tipo do dia). Comportamento atual mantido até decidir.

- `Punches` (porta de dados das batidas) ganhou `marksBetween` e `upsertMark`; o nome não cobre mais o que expõe. `useQueuedPunches` e `createPunchSync` idem: a fila leva marcações.
- `QueuedDayMark` e `QueuedPunch` se distinguem por `"mark" in item` / `"write" in item`, sem campo discriminante; os itens antigos da outbox não têm `kind`, e acrescentar um pede migração do Dexie.
- `useDayMarksBetween` repete de `usePunchesBetween` a regra da consulta pausada (`queueOnly`) e a mescla com a fila.
- `period.test.tsx` e `day.test.tsx` ganharam o mesmo `marksBetween` no fake (ver o item dos fakes acima).
- A regra "falta ou abonado" escrita em três lugares: `day-type-chips.tsx` (`NOTES[value === "falta" ? …]`), `period/day-list.tsx` (variante do badge) e `absenceDays` no domínio. Candidato a `isAbsence(mark)` no domínio.
- `DayMarkType | null` com `null` = "Normal": espalha `?? null` e `?? "normal"`, e deixa `chosenType` em `day.tsx` com três estados (`undefined`/`null`/tipo).
- `save()` em `day.tsx` monta o `DayMarkWrite` à mão nos dois ramos e depende do `savedMark!`; candidato a `markWriteOf(savedMark, type, at)` ao lado de `writesOf`.
- `"write" in item` em `sync.ts` repete o `isPunch` exportado por `punches.ts`; `"mark" in item` em `useDayMarksBetween` idem.
- `sync.test.ts` repete o literal de `DayMarkWrite` nos dois testes de marcação; candidato a um `mark()` ao lado de `write()`. O teste da marcação recusada não confere a chamada a `upsertMark` (coberto de forma implícita: a marcação só sai da fila depois de enviada).
- O comentário de `createPunchSync` (`sync.ts`) diz que `rejected` vira conflito antes de abrir a exceção da marcação; a leitura fica ambígua.

## Implementação

- Preencher `packages/domain/src/tax-tables/2026.ts` (INSS, IRRF, dedução por dependente, desconto simplificado, redutor Lei 15.270/2025) a partir de fonte oficial.
- Escolher biblioteca Web Push compatível com Deno para a Edge Function.

