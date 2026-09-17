import { describe, it, expect } from "vitest";
import { ORDER, nextStage, prevStage, canAdvance, canMoveBack } from "@/lib/domain/lifecycle";

describe("lifecycle", () => {
  it("defines the stage order", () => {
    expect(ORDER).toEqual(["PROSPECT", "SALES", "CONTRACT", "PROJECT"]);
  });
  it("advances one step", () => {
    expect(nextStage("PROSPECT")).toBe("SALES");
    expect(nextStage("PROJECT")).toBeNull();
  });
  it("moves back one step", () => {
    expect(prevStage("SALES")).toBe("PROSPECT");
    expect(prevStage("PROSPECT")).toBeNull();
  });
  it("cannot advance past the last stage", () => {
    expect(canAdvance("PROJECT")).toBe(false);
    expect(canAdvance("SALES")).toBe(true);
  });
  it("cannot move back from the first stage", () => {
    expect(canMoveBack("PROSPECT")).toBe(false);
    expect(canMoveBack("CONTRACT")).toBe(true);
  });
});
