"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { addComment, deleteComment } from "@/services/comment-service";

export async function addCommentAction(opportunityId: string, formData: FormData) {
  const user = await requireRole("comment:write");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await addComment(opportunityId, body, user.id);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function deleteCommentAction(opportunityId: string, commentId: string) {
  await requireRole("comment:write");
  await deleteComment(commentId);
  revalidatePath(`/opportunities/${opportunityId}`);
}
