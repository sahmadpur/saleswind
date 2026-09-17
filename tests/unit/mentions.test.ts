import { describe, it, expect } from "vitest";
import { mentionToken, parseMentions, plainText, segments } from "@/lib/mentions";

describe("mentions", () => {
  const body = `Hi ${mentionToken("Ruslan Sultanov", "u1")} and ${mentionToken("Maya", "u2")}, cc ${mentionToken("Ruslan Sultanov", "u1")}`;
  it("extracts distinct mentioned ids", () => {
    expect(parseMentions(body)).toEqual(["u1", "u2"]);
    expect(parseMentions("no mentions @here")).toEqual([]);
  });
  it("splits into segments", () => {
    expect(segments("a @[B C](x1) d")).toEqual([
      { type: "text", text: "a " }, { type: "mention", name: "B C", userId: "x1" }, { type: "text", text: " d" },
    ]);
  });
  it("strips brackets from names and renders plain text", () => {
    expect(mentionToken("We[ird]", "id")).toBe("@[Weird](id)");
    expect(plainText(body)).toBe("Hi @Ruslan Sultanov and @Maya, cc @Ruslan Sultanov");
  });
});
