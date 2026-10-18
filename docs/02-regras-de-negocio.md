# 02 — Regras de negócio

Todas as regras são implementadas em `packages/domain` como funções puras e cobertas por testes com exemplos desta página. Valores 🔶 são padrões provisórios (pendentes de confirmação com o RH) e devem ser **configuráveis por empresa**.

Unidades: durações em **minutos inteiros**, dinheiro em **centavos inteiros**, fuso `America/Sao_Paulo`.

---

## 1. Configuração de jornada (por empresa)

| Campo | Padrão | Observação |
|---|---|---|
| `dailyMinutes` | 480 | 8h por dia útil |
| `workdays` | seg–sex | Sábado e domingo não são dias de jornada |
| `expectedLunchMinutes` | 60 | Usado em lembretes e alertas |
| `scheduleMode` | `flexible` | Entrada livre (8h–9h); conta o total trabalhado, não o horário de entrada |
| `dailyToleranceMinutes` | 10 🔶 | Ver §4 |
| `closingDay` | 19 | Último dia do período de apuração |
| `payday` | 1 | Dia do pagamento (mês seguinte ao fechamento) |
| `hourDivisor` | 200 | Divisor do salário-hora (40h semanais) |
| `overtimeRateWeekday` | 0.50 | Adicional em dia útil |
| `overtimeRateSaturday` | 0.50 🔶 | Adicional em sábado |
| `overtimeRateSundayHoliday` | 1.00 | Adicional em domingo/feriado |
| `compensateWithinPeriod` | `false` 🔶 | Ver §6 |
| `dsrOnOvertime` | `true` 🔶 | Ver §8.3 |
| `absenceDeductsDsr` | `true` 🔶 | Ver §8.4 |

Campos e padrões definidos só em `companyRulesSchema` (`packages/domain`), que preenche os ausentes e rejeita os inválidos. `closingDay` e `payday` vão de 1 a 28, para que todo mês tenha o dia.

## 2. Batidas

- Uma batida = um instante (`punched_at`, precisão de minuto) + origem (`manual` | `ocr`) + observação opcional.
- O registro manual vem pré-preenchido com o horário atual; data e hora são editáveis.
- Pode-se registrar batidas de dias anteriores. Vale a data/hora da batida, não a data do cadastro.
- **Duplicidade**: não pode existir duas batidas do mesmo usuário no mesmo minuto (`unique(user_id, punched_at)`). Ao detectar, o app avisa e não cria outra.
- **Edição/exclusão**: permitidas; toda alteração gera registro em histórico (`punch_history`).
- Batidas excluídas são *soft delete* (`deleted_at`) para permitir sincronização offline.

### 2.1 Classificação (inferida pela ordem no dia)

Batidas do dia ordenadas por horário:

| Posição | Rótulo |
|---|---|
| 1ª | Entrada |
| 2ª | Saída almoço |
| 3ª | Volta almoço |
| 4ª | Saída |
| 5ª+ | Saída/retorno extra (alterna) |

Exceção — dia com exatamente 2 batidas: se a data já passou **ou** `t2 − t1 > 360` min, os rótulos são Entrada e Saída.

O rótulo não é persistido; é sempre derivado da ordem cronológica, então batidas podem ser registradas em qualquer ordem (ex.: entrada e saída durante o dia, almoço à noite). O usuário não escolhe o tipo; a UI só exibe o rótulo que a batida vai assumir. O "dia" de uma batida é sua data local em `America/Sao_Paulo`.

## 3. Cálculo do dia

1. Ordenar batidas; formar pares `(1,2), (3,4), (5,6)...`.
2. **Número ímpar de batidas** → dia `incomplete`: não entra em nenhum cálculo; exibe alerta até ser corrigido.
   **Exatamente 2 batidas com `t2 − t1 > 360` min** (mais de 6h sem intervalo) → também `incomplete`, alerta "Falta registrar o almoço".
3. `workedMinutes` = soma de `(saída − entrada)` de cada par.
4. `expectedMinutes`:
   - dia útil sem marcação especial → `dailyMinutes`
   - sábado, domingo, feriado → 0
   - dia com tipo `atestado`, `ferias`, `folga_compensada`, `abono` → 0
   - dia com tipo `falta` → ver §8.4
5. `rawBalance = workedMinutes − expectedMinutes`.
6. Aplicar tolerância (§4) → `balance`.

### 3.1 Tipos de dia (marcação manual)

`falta` · `atestado` · `ferias` · `folga_compensada` · `abono`

### 3.2 Dia útil passado sem batidas e sem tipo

Estado `pending`: **não** é tratado como falta automaticamente. Fica fora do cálculo e gera alerta ("X dias pendentes") no período e na tela de salário.

### 3.3 Alertas (não alteram cálculo)

- Intervalo de almoço (`volta − saída almoço`) < `expectedLunchMinutes` → alerta. 🔶 CLT art. 71 §4 prevê pagamento do tempo suprimido +50%; não calculado na v1.
- Dia `incomplete` ou `pending`.

## 4. Tolerância 🔶

CLT art. 58 §1º: variações de até 5 min por marcação, limitadas a 10 min diários, não são computadas. Súmula 366 TST: ultrapassado o limite, conta-se a totalidade.

Como o horário é flexível (não há horário previsto por marcação), a v1 aplica apenas o limite diário:

```
se |rawBalance| <= dailyToleranceMinutes → balance = 0
senão                                    → balance = rawBalance (integral)
```

Só aplica em dias com `expectedMinutes > 0`. Em sábado/domingo/feriado, todo minuto trabalhado conta.

## 5. Período de apuração

- Período `P(M)` = **dia 20 do mês M−1 até dia 19 do mês M** (inclusive), independentemente de dia da semana.
- Pago no **dia 1º do mês M+1**.
- Exemplo: 20/09/2026 a 19/10/2026 → pagamento em 01/11/2026.
- Fórmula geral: `start = (closingDay + 1)` do mês anterior; `end = closingDay` do mês M; `payDate = payday` do mês M+1.

## 6. Saldo do período

Modelo adotado: **horas extras pagas e atrasos descontados todo mês** (sem banco de horas; nada é transportado para o período seguinte).

- `compensateWithinPeriod = false` (padrão 🔶): cada dia é tratado isoladamente.
  - `overtimeMinutes[tipo]` = soma dos `balance > 0`, separados por tipo de adicional (útil / sábado / domingo-feriado).
  - `deficitMinutes` = soma dos `|balance|` com `balance < 0`.
- `compensateWithinPeriod = true`: somar todos os `balance`; resultado positivo vira hora extra (adicional de dia útil), negativo vira débito. Horas em domingo/feriado não compensam débito e mantêm 100%.

A tela de período mostra: saldo líquido em horas, horas extras por tipo, débito, dias pendentes/incompletos.

- Entram nos totais só os dias `complete` até hoje. Hoje entra quando fecha; dias futuros nunca, mesmo com batidas.
- Pendências: dias passados `pending` ou `incomplete`. Hoje e futuros não contam.
- O tipo de adicional sai do dia da semana do calendário (sábado, domingo); feriados entram em domingo/feriado com o #11.
- Saldo líquido = soma dos `balance` dos dias que entram; é o mesmo nos dois modos.
- Com `compensateWithinPeriod = true`, o sábado se compensa com os outros dias e o saldo positivo vira hora extra de dia útil.

## 7. Lembretes

Antecedência padrão: `leadMinutes = 10` (configurável por usuário). Sem lembrete para ir almoçar.

| Gatilho | Lembrete | Horário de envio |
|---|---|---|
| 2ª batida do dia registrada (saída almoço, `t2`), **somente se `t2 < t1 + dailyMinutes`** | "Volta do almoço às HH:MM" | `t2 + expectedLunchMinutes − leadMinutes` |
| 3ª batida registrada (volta almoço, `t3`) | "Saída às HH:MM" | `t1 + dailyMinutes + (t3 − t2) − leadMinutes` |

- Exemplo: saída almoço 13:28 → aviso às 14:18 ("bata às 14:28").
- Exemplo: entrada 09:03, almoço 13:00–14:05 → saída prevista 18:08 → aviso às 17:58.
- Ao registrar a batida esperada antes do envio, o lembrete pendente é cancelado.
- Editar/excluir batidas do dia recalcula os lembretes do dia.
- Lembrete com horário de envio no passado não é enviado.
- Só em dias com `expectedMinutes > 0`.
- Ação da notificação: apenas "Bater agora" (abre o app com o sheet de batida na hora atual; nada é registrado sem confirmação). Sem "adiar".

## 8. Salário (estimativa)

Calculado **no navegador** (dados cifrados; ver `05-seguranca.md`). Referente ao período `P(M)`, pago em `M+1/dia 1`.

### 8.1 Entradas do usuário (cifradas, com vigência `validFrom`)

| Campo | Exemplo |
|---|---|
| `baseSalaryCents` | salário-base mensal |
| `advance` | adiantamento: `{ type: 'percent' \| 'fixed', value }` — padrão 40% 🔶 |
| `healthPlanCents` | plano de saúde |
| `dentalPlanCents` | odontológico |
| `dependents` | nº de dependentes para IRRF |
| `otherDeductions[]` | `{ label, cents }` |
| `otherEarnings[]` | `{ label, cents, taxable: boolean }` |

Usa-se o registro com maior `validFrom <= fim do período`.

### 8.2 Valores-base

```
hourlyRate        = baseSalary / hourDivisor
overtimePay[tipo] = overtimeMinutes[tipo] / 60 × hourlyRate × (1 + rate[tipo])
deficitDeduction  = deficitMinutes / 60 × hourlyRate
```

### 8.3 DSR sobre horas extras 🔶

```
dsrOvertime = (Σ overtimePay / businessDaysInPeriod) × restDaysInPeriod
```

- `businessDaysInPeriod`: segunda a sábado, excluindo feriados.
- `restDaysInPeriod`: domingos + feriados.
- Só se `dsrOnOvertime = true`.

### 8.4 Faltas 🔶

Dia com tipo `falta`:
- desconta `baseSalary / 30` pelo dia;
- se `absenceDeductsDsr = true`, desconta mais `baseSalary / 30` por domingo/feriado da mesma semana (seg–dom) — Lei 605/49.
- Dias de `falta` não geram `deficitMinutes` (evitar desconto duplicado).

### 8.5 Bruto

```
gross = baseSalary
      + Σ overtimePay + dsrOvertime
      + Σ otherEarnings
      − deficitDeduction − absenceDeductions
```

### 8.6 Encargos

- **INSS**: tabela progressiva sobre `taxableGross` (bruto menos `otherEarnings` não tributáveis), limitado ao teto.
- **IRRF**: base = `taxableGross − INSS − dependents × deducaoPorDependente`; aplicar tabela progressiva; comparar com o desconto simplificado e usar o menor imposto; aplicar o redutor da Lei 15.270/2025 (isenção até R$ 5.000 e redução gradual até R$ 7.350, vigente desde 01/2026).
- Tabelas ficam em `packages/domain/src/tax-tables/{ano}.ts` como dados versionados, com fonte oficial (gov.br / Receita Federal) citada no arquivo. **Os valores devem ser conferidos na fonte oficial ao implementar** — não confiar em valores de memória.
- A tabela usada é a vigente na **data de pagamento**.

### 8.7 Líquido

```
net = gross − INSS − IRRF − advance − healthPlan − dentalPlan − Σ otherDeductions
```

`advance` em percentual incide sobre `baseSalary`. 🔶 Confirmar no holerite como o adiantamento é calculado e descontado.

### 8.8 Exibição

- Detalhamento linha a linha (estilo holerite): proventos, descontos, líquido.
- Aviso fixo: "Estimativa. O valor oficial é o do holerite."
- Se houver dias `pending` ou `incomplete`: aviso com a quantidade e link para resolver.
- Permitir informar o líquido real do holerite para comparar com a estimativa (cifrado).

## 9. Feriados

- Nacionais: obtidos da BrasilAPI (`/api/feriados/v1/{ano}`), gravados globalmente.
- Municipais, estaduais e emendas: cadastrados pelo admin da empresa.
- Ponto facultativo/emenda: cadastrável como `folga` da empresa (expected = 0) ou ignorado, a critério do admin.
