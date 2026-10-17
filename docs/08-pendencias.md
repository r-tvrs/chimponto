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

## Implementação

- Preencher `packages/domain/src/tax-tables/2026.ts` (INSS, IRRF, dedução por dependente, desconto simplificado, redutor Lei 15.270/2025) a partir de fonte oficial.
- Escolher biblioteca Web Push compatível com Deno para a Edge Function.

