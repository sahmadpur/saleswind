"use client";
import { useRef, useState } from "react";
import { addCommentAction, deleteCommentAction } from "@/actions/comment-actions";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { shortName } from "@/lib/format";
import { mentionToken, ROLE_MENTIONS, segments } from "@/lib/mentions";

type Comment = { id: string; body: string; author: string; authorId: string; when: string; whenFull?: string };
type User = { id: string; name: string; group?: boolean };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Body({ body, currentUserId }: { body: string; currentUserId: string }) {
  return (
    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gink-2">
      {segments(body).map((s, i) =>
        s.type === "text" ? (
          s.text
        ) : (
          <span
            key={i}
            className={cn("rounded px-1 font-medium", s.userId === currentUserId ? "bg-gyellow-50 text-gyellow-dark" : "bg-gblue-50 text-gblue-dark")}
          >
            @{s.name}
          </span>
        ),
      )}
    </p>
  );
}

/** Comment box with @-mention autocomplete. Shows "@Name" while typing; converts picked names to tokens on post. */
function Composer({ opportunityId, users }: { opportunityId: string; users: User[] }) {
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<User[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const matches = query === null ? [] : users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  function onChange(value: string, caret: number) {
    setBody(value);
    const m = /(^|\s)@([^\s@]{0,30})$/.exec(value.slice(0, caret));
    setQuery(m ? m[2] : null);
    setActive(0);
  }

  function pick(u: User) {
    const el = ref.current!;
    const caret = el.selectionStart;
    const before = body.slice(0, caret).replace(/@([^\s@]{0,30})$/, `@${u.name} `);
    const next = before + body.slice(caret);
    setBody(next);
    setPicked((p) => (p.some((x) => x.id === u.id) ? p : [...p, u]));
    setQuery(null);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(before.length, before.length); });
  }

  async function submit() {
    // Longest names first so "@Ann Lee" wins over "@Ann".
    let out = body.trim();
    if (!out || pending) return;
    for (const u of [...picked].sort((a, b) => b.name.length - a.name.length)) {
      out = out.replace(new RegExp(`(^|[^\\[])@${escapeRe(u.name)}(?![\\w\\]])`, "g"), (_m, pre) => pre + mentionToken(u.name, u.id));
    }
    const fd = new FormData();
    fd.set("body", out);
    setPending(true);
    try {
      await addCommentAction(opportunityId, fd);
      setBody("");
      setPicked([]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          name="body"
          rows={2}
          value={body}
          placeholder="Add a comment… type @ to mention someone"
          onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            if (matches.length > 0) {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % matches.length); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); return; }
              if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[active]); return; }
              if (e.key === "Escape") { e.preventDefault(); setQuery(null); return; }
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
          }}
          onBlur={() => setTimeout(() => setQuery(null), 150)}
          className="min-h-10 flex-1 resize-y rounded-md border border-gline bg-gsurface px-3 py-2 text-sm outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-2 focus:ring-gblue/25"
        />
        <Button type="button" onClick={submit} disabled={pending || !body.trim()}>{pending ? "Posting…" : "Post"}</Button>
      </div>
      {matches.length > 0 && (
        <ul role="listbox" aria-label="Mention a user" className="g-pop absolute bottom-full left-0 z-20 mb-1 w-64 overflow-hidden rounded-md border border-gline-2 bg-gsurface py-1 shadow-g2">
          {matches.map((u, i) => (
            <li key={u.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gink", i === active ? "bg-ghover" : "hover:bg-ghover")}
              >
                {u.group ? (
                  <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-gviolet-50 text-gviolet">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>groups</span>
                  </span>
                ) : (
                  <Avatar name={u.name} size={22} />
                )}
                {u.name}
                {u.group && <span className="ml-auto text-xs text-ggrey">everyone</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CommentThread({ opportunityId, comments, currentUserId, isElevated, users }: {
  opportunityId: string; comments: Comment[]; currentUserId: string; isElevated: boolean; users: User[];
}) {
  return (
    <div className="space-y-5">
      <h2 className="flex items-center gap-2 text-sm font-medium text-gink">
        <span className="material-symbols-outlined text-ggrey" style={{ fontSize: 20 }}>forum</span>
        Comments
        {comments.length > 0 && (
          <span className="rounded-full bg-ghover px-2 py-0.5 text-xs font-medium text-ggrey">{comments.length}</span>
        )}
      </h2>

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="group flex items-start gap-3">
            <Avatar name={c.author} size={32} />
            <div className="min-w-0 flex-1 rounded-lg rounded-tl-sm bg-gbg px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gink" title={c.author}>{shortName(c.author)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ggrey-2" title={c.whenFull}>{c.when}</span>
                  {(c.authorId === currentUserId || isElevated) && (
                    <button
                      onClick={() => deleteCommentAction(opportunityId, c.id)}
                      aria-label="Delete comment"
                      className="grid h-6 w-6 place-items-center rounded-full text-ggrey-2 opacity-0 transition-all hover:bg-gred-50 hover:text-gred group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  )}
                </div>
              </div>
              <Body body={c.body} currentUserId={currentUserId} />
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="rounded-md bg-gbg px-4 py-6 text-center text-sm text-ggrey">No comments yet — start the conversation.</p>
        )}
      </div>

      <Composer
        opportunityId={opportunityId}
        users={[...ROLE_MENTIONS.map((r) => ({ id: r.id, name: r.name, group: true })), ...users.filter((u) => u.id !== currentUserId)]}
      />
    </div>
  );
}
