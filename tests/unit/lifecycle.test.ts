import { describe, it, expect } from "vitest";
import { ORDER, nextState, prevState, canAdvance, canMoveBack } from "@/lib/domain/lifecycle";

describe("lifecycle", () => {
  it("defines the state order", () => {
    expect(ORDER).toEqual(["PROSPECT", "SALES", "CONTRACT", "PROJECT"]);
  });
  it("advances one step", () => {
    expect(nextState("PROSPECT")).toBe("SALES");
    expect(nextState("PROJECT")).toBeNull();
  });
  it("moves back one step", () => {
    expect(prevState("SALES")).toBe("PROSPECT");
    expect(prevState("PROSPECT")).toBeNull();
  });
  it("cannot advance past the last state", () => {
    expect(canAdvance("PROJECT")).toBe(false);
    expect(canAdvance("SALES")).toBe(true);
  });
  it("cannot move back from the first state", () => {
    expect(canMoveBack("PROSPECT")).toBe(false);
    expect(canMoveBack("CONTRACT")).toBe(true);
  });
});
