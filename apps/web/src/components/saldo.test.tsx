import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Saldo } from "./saldo";

describe("<Saldo>", () => {
  it("shows a positive balance with sign, positive color and spoken label", () => {
    render(<Saldo min={80} />);
    const el = screen.getByLabelText("mais 1 hora e 20 minutos");
    expect(el).toHaveTextContent("+1h20");
    expect(el).toHaveClass("text-positive");
  });

  it("shows a negative balance with U+2212 and negative color", () => {
    render(<Saldo min={-35} />);
    const el = screen.getByLabelText("menos 0 horas e 35 minutos");
    expect(el).toHaveTextContent("−0h35");
    expect(el).toHaveClass("text-negative");
  });

  it("shows zero as ±0h00 in muted color", () => {
    render(<Saldo min={0} />);
    expect(screen.getByText("±0h00")).toHaveClass("text-muted-foreground");
  });
});
