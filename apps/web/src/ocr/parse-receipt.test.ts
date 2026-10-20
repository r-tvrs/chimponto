import { describe, expect, it } from "vitest";
import { parseReceipt } from "./parse-receipt";

// Textos sintéticos no formato do REP (docs/06), com o ruído típico da leitura.
const NOW = new Date("2026-10-16T15:00:00Z"); // 12:00 em São Paulo

describe("parseReceipt", () => {
  it.each([
    ["PIS:021283582676 16/10/2026 09:03", "09:03"],
    ["PIS:021283582676 16/10/2026 09.03", "09:03"],
    ["PIS:021283582676 16/10/2026 0903", "09:03"],
    ["PIS:021283582676 16/10/2026 09 ; 03", "09:03"],
  ])("reads the date and time from %s", (text, time) => {
    expect(parseReceipt(text, NOW)).toEqual({ date: "2026-10-16", time });
  });

  it("prefers the PIS line over other dates in the receipt", () => {
    const text = [
      "COMPROVANTE DE REGISTRO",
      "NF:01/02/2026 11:11",
      "PIS:000000000000 15/10/2026 13:58",
      "NOME DO TRABALHADOR",
    ].join("\n");
    expect(parseReceipt(text, NOW)).toEqual({ date: "2026-10-15", time: "13:58" });
  });

  it("falls back to the whole text when the PIS line is unreadable", () => {
    expect(parseReceipt("P1S:0000\n16/10/2026 08:30\nNOME", NOW)).toEqual({
      date: "2026-10-16",
      time: "08:30",
    });
  });

  it.each([
    ["no date at all", "COMPROVANTE DE REGISTRO\nNOME"],
    ["an impossible date", "PIS:0 31/02/2026 09:03"],
    ["an impossible hour", "PIS:0 16/10/2026 25:03"],
    ["an impossible minute", "PIS:0 16/10/2026 09:63"],
    ["a future instant", "PIS:0 16/10/2026 12:01"],
    ["more than 60 days ago", "PIS:0 16/08/2026 09:00"],
  ])("returns null for %s", (_, text) => {
    expect(parseReceipt(text, NOW)).toBeNull();
  });

  it("accepts exactly 60 days ago", () => {
    expect(parseReceipt("PIS:0 17/08/2026 09:00", NOW)).toEqual({
      date: "2026-08-17",
      time: "09:00",
    });
  });
});
