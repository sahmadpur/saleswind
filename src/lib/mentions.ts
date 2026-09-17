/** Mentions are stored inline in comment bodies as `@[Full Name](userId)`. */
const MENTION = /@\[([^\]\n]+)\]\(([A-Za-z0-9_-]+)\)/g;

export const mentionToken = (name: string, userId: string) => `@[${name.replace(/[\[\]\n]/g, "")}](${userId})`;

/** Distinct user ids mentioned in a body, in order of first appearance. */
export function parseMentions(body: string): string[] {
  return [...new Set([...body.matchAll(MENTION)].map((m) => m[2]))];
}

export type Segment = { type: "text"; text: string } | { type: "mention"; name: string; userId: string };

/** Split a body into plain text and mention segments for rendering. */
export function segments(body: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of body.matchAll(MENTION)) {
    if (m.index > last) out.push({ type: "text", text: body.slice(last, m.index) });
    out.push({ type: "mention", name: m[1], userId: m[2] });
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push({ type: "text", text: body.slice(last) });
  return out;
}

/** Body with mention tokens rendered as "@Name", for notifications and exports. */
export const plainText = (body: string) => body.replace(MENTION, "@$1");
