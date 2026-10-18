import { type DaySummary, fromLocal } from "@chimponto/domain";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NextCard } from "./next-card";
import { PunchCta } from "./punch-cta";

// Os cartões recebem o resumo pronto do domínio; aqui só importa o que cada estado mostra.

const open: DaySummary = {
  status: "in_progress",
  workedMinutes: 0,
  expectedMinutes: 480,
  rawBalance: null,
  balance: null,
  alerts: [],
  next: { label: "entry", at: null, minutesUntil: null },
  forecast: {},
};

const closed = (balance: number): DaySummary => ({
  ...open,
  status: "complete",
  workedMinutes: 480 + balance,
  rawBalance: balance,
  balance,
  next: null,
});

const exitIn = (minutesUntil: number): DaySummary => ({
  ...open,
  next: { label: "exit", at: fromLocal("2026-10-16", "18:08")!, minutesUntil },
});

describe("NextCard mascot", () => {
  it.each<[string, DaySummary, string]>([
    ["no punches yet", open, "Bolota acenando"],
    ["a day without a journey", { ...open, status: "off", expectedMinutes: 0 }, "Bolota acenando"],
    [
      "after the entry",
      { ...open, next: { label: "lunch_out", at: null, minutesUntil: null } },
      "Bolota tranquila fazendo joinha",
    ],
    [
      "at lunch",
      {
        ...open,
        next: { label: "lunch_return", at: fromLocal("2026-10-16", "14:28")!, minutesUntil: 7 },
      },
      "Bolota terminando de comer uma banana",
    ],
    ["30 min before the exit", exitIn(30), "Bolota pegando a mochila"],
    ["past the expected exit", exitIn(-5), "Bolota pegando a mochila"],
    ["31 min before the exit", exitIn(31), "Bolota tranquila fazendo joinha"],
    [
      "a closed day with a positive balance",
      closed(22),
      "Bolota comemorando com um cacho de bananas",
    ],
    ["a closed day with a negative balance", closed(-38), "Bolota preocupada, correndo atrasada"],
    ["a closed day with a zero balance", closed(0), "Bolota tranquila fazendo joinha"],
    [
      "a day missing the lunch",
      { ...open, status: "incomplete", alerts: [{ kind: "missing_lunch" }] },
      "Bolota coçando a cabeça",
    ],
  ])("shows its mood for %s", (_, summary, alt) => {
    render(<NextCard summary={summary} expectedLunchMinutes={60} offline={false} />);

    expect(screen.getByRole("img", { name: alt })).toBeVisible();
  });
});

describe("PunchCta", () => {
  it("offers the next punch while the day is open", () => {
    const onPunch = vi.fn();
    render(<PunchCta summary={open} done={0} total={4} onPunch={onPunch} />);

    const cta = screen.getByRole("button", { name: /Bater ponto/ });
    expect(cta).toHaveTextContent("entrada");
    expect(cta).toBeEnabled();
    cta.click();
    expect(onPunch).toHaveBeenCalledOnce();
  });

  it("turns into the complete day once the day closes, still open for an extra punch", () => {
    const onPunch = vi.fn();
    render(<PunchCta summary={closed(22)} done={4} total={4} onPunch={onPunch} />);

    expect(screen.queryByRole("button", { name: /Bater ponto/ })).not.toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /Dia completo · 4 de 4 batidas/ });
    expect(cta).toHaveTextContent("registrar nova batida");
    expect(cta).toBeEnabled();
    cta.click();
    expect(onPunch).toHaveBeenCalledOnce();
  });

  it("counts every punch on a day past 4", () => {
    render(<PunchCta summary={closed(0)} done={6} total={6} onPunch={() => {}} />);

    expect(screen.getByRole("button", { name: /Dia completo · 6 de 6 batidas/ })).toBeEnabled();
  });
});
