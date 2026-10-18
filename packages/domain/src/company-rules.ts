import { z } from "zod";

// Configuração de jornada da empresa (docs/02 §1). Única definição dos campos e dos padrões;
// os marcados 🔶 são provisórios, pendentes de confirmação com o RH (docs/08).

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const MINUTES_PER_DAY = 24 * 60;

const minutesInADay = z.int().min(0).max(MINUTES_PER_DAY);
// Até 28: todo mês, inclusive fevereiro, tem o dia.
const dayOfMonth = z.int().min(1).max(28);
const overtimeRate = z.number().min(0);

export const companyRulesSchema = z.object({
  dailyMinutes: minutesInADay.min(1).default(480),
  workdays: z
    .array(z.enum(WEEKDAYS))
    .min(1)
    .refine((days) => new Set(days).size === days.length, "Dia da semana repetido")
    .default((): Weekday[] => ["mon", "tue", "wed", "thu", "fri"]),
  expectedLunchMinutes: minutesInADay.default(60),
  scheduleMode: z.enum(["flexible"]).default("flexible"),
  dailyToleranceMinutes: minutesInADay.default(10), // 🔶
  closingDay: dayOfMonth.default(19),
  payday: dayOfMonth.default(1),
  hourDivisor: z.int().min(1).default(200),
  overtimeRateWeekday: overtimeRate.default(0.5),
  overtimeRateSaturday: overtimeRate.default(0.5), // 🔶
  overtimeRateSundayHoliday: overtimeRate.default(1),
  compensateWithinPeriod: z.boolean().default(false), // 🔶
  dsrOnOvertime: z.boolean().default(true), // 🔶
  absenceDeductsDsr: z.boolean().default(true), // 🔶
});

export type CompanyRules = z.infer<typeof companyRulesSchema>;
