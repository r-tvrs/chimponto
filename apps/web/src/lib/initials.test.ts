import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it.each([
    ["Marina Costa", "marina@lumen.dev", "MC"],
    ["Ana Paula de Souza", "ana@lumen.dev", "AS"],
    ["ângela", "angela@lumen.dev", "Â"],
  ])("name %s -> %s", (name, email, expected) => {
    expect(initials(name, email)).toBe(expected);
  });

  it.each([
    [null, "marina.costa@lumen.dev", "MC"],
    [null, "rafael@example.com", "R"],
    ["   ", "joao_silva2@example.com", "JS"],
  ])("without a name, uses the e-mail %s -> %s", (name, email, expected) => {
    expect(initials(name, email)).toBe(expected);
  });
});
