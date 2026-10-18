import { describe, expect, it } from "vitest";
import { companyRulesSchema } from "./company-rules";

describe("companyRulesSchema", () => {
  it("fills every missing field with the defaults of docs/02 §1", () => {
    expect(companyRulesSchema.parse({})).toEqual({
      dailyMinutes: 480,
      workdays: ["mon", "tue", "wed", "thu", "fri"],
      expectedLunchMinutes: 60,
      scheduleMode: "flexible",
      dailyToleranceMinutes: 10,
      closingDay: 19,
      payday: 1,
      hourDivisor: 200,
      overtimeRateWeekday: 0.5,
      overtimeRateSaturday: 0.5,
      overtimeRateSundayHoliday: 1,
      compensateWithinPeriod: false,
      dsrOnOvertime: true,
      absenceDeductsDsr: true,
    });
  });

  it("keeps the fields it receives and fills only the missing ones", () => {
    const rules = companyRulesSchema.parse({
      dailyMinutes: 528,
      workdays: ["mon", "tue", "wed", "thu", "fri", "sat"],
      compensateWithinPeriod: true,
    });

    expect(rules).toMatchObject({
      dailyMinutes: 528,
      workdays: ["mon", "tue", "wed", "thu", "fri", "sat"],
      compensateWithinPeriod: true,
      expectedLunchMinutes: 60,
      closingDay: 19,
    });
  });

  it.each([
    ["no daily minutes", { dailyMinutes: 0 }],
    ["negative daily minutes", { dailyMinutes: -60 }],
    ["fractional daily minutes", { dailyMinutes: 480.5 }],
    ["daily minutes longer than a day", { dailyMinutes: 24 * 60 + 1 }],
    ["daily minutes as text", { dailyMinutes: "480" }],
    ["no workdays", { workdays: [] }],
    ["a repeated workday", { workdays: ["mon", "mon"] }],
    ["an unknown weekday", { workdays: ["seg"] }],
    ["a negative lunch", { expectedLunchMinutes: -1 }],
    ["a lunch longer than a day", { expectedLunchMinutes: 24 * 60 + 1 }],
    ["an unknown schedule mode", { scheduleMode: "fixed" }],
    ["a negative tolerance", { dailyToleranceMinutes: -1 }],
    ["a tolerance longer than a day", { dailyToleranceMinutes: 24 * 60 + 1 }],
    ["closing day 0", { closingDay: 0 }],
    // Do 29 em diante, fevereiro não teria o dia de fechamento.
    ["closing day 29", { closingDay: 29 }],
    ["payday 0", { payday: 0 }],
    ["payday 29", { payday: 29 }],
    ["hour divisor 0", { hourDivisor: 0 }],
    ["a fractional hour divisor", { hourDivisor: 200.5 }],
    ["a negative weekday overtime rate", { overtimeRateWeekday: -0.5 }],
    ["a negative Saturday overtime rate", { overtimeRateSaturday: -0.5 }],
    ["a negative Sunday/holiday overtime rate", { overtimeRateSundayHoliday: -1 }],
    ["a boolean as text", { compensateWithinPeriod: "false" }],
    ["a boolean as number", { dsrOnOvertime: 1 }],
    ["a null boolean", { absenceDeductsDsr: null }],
    ["something that is not an object", "8h00"],
  ])("rejects %s", (_, input) => {
    expect(companyRulesSchema.safeParse(input).success).toBe(false);
  });
});
