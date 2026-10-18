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

`summarizeDay` ainda não considera feriados nem tipos de dia: `expectedMinutes` vem só de `workdays` e `dailyMinutes`. Chegam com o #9 (tipo do dia) e o #11 (feriados).

## Implementação

- Preencher `packages/domain/src/tax-tables/2026.ts` (INSS, IRRF, dedução por dependente, desconto simplificado, redutor Lei 15.270/2025) a partir de fonte oficial.
- Escolher biblioteca Web Push compatível com Deno para a Edge Function.

