"use client";
import { addCommentAction, deleteCommentAction } from "@/actions/comment-actions";
import { Button } from "@/components/ui/Button";
import { relativeTime } from "@/lib/format";

type Comment = { id: string; body: string; author: string; authorId: string; createdAt: Date };

export function CommentThread({ opportunityId, comments, currentUserId, isElevated }: { opportunityId: string; comments: Comment[]; currentUserId: string; isElevated: boolean }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-neutral-500">Comments</h2>
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="group flex items-start justify-between rounded-lg bg-neutral-50 p-3">
            <div>
              <div className="text-sm text-neutral-900">{c.body}</div>
              <div className="mt-1 text-xs text-neutral-400">{c.author} · {relativeTime(new Date(c.createdAt))}</div>
            </div>
            {(c.authorId === currentUserId || isElevated) && (
              <button onClick={() => deleteCommentAction(opportunityId, c.id)} className="text-xs text-neutral-300 opacity-0 hover:text-red-500 group-hover:opacity-100">Delete</button>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-neutral-400">No comments yet</p>}
      </div>
      <form action={addCommentAction.bind(null, opportunityId)} className="flex gap-2">
        <input name="body" placeholder="Add a comment…" className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        <Button type="submit">Post</Button>
      </form>
    </div>
  );
}
