"use client";
import { addCommentAction, deleteCommentAction } from "@/actions/comment-actions";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime } from "@/lib/format";

type Comment = { id: string; body: string; author: string; authorId: string; createdAt: Date };

export function CommentThread({ opportunityId, comments, currentUserId, isElevated }: { opportunityId: string; comments: Comment[]; currentUserId: string; isElevated: boolean }) {
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
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-gbg px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gink">{c.author}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ggrey-2">{relativeTime(new Date(c.createdAt))}</span>
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
              <p className="mt-0.5 text-sm text-gink-2">{c.body}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="rounded-xl bg-gbg px-4 py-6 text-center text-sm text-ggrey">No comments yet — start the conversation.</p>
        )}
      </div>

      <form action={addCommentAction.bind(null, opportunityId)} className="flex items-center gap-2">
        <input
          name="body"
          placeholder="Add a comment…"
          className="h-10 flex-1 rounded-full border border-gline bg-gsurface px-4 text-sm outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-1 focus:ring-gblue"
        />
        <Button type="submit">Post</Button>
      </form>
    </div>
  );
}
