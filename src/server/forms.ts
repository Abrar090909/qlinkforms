import { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomSlug } from "@/lib/slug";
import { getCurrentWorkspace } from "@/server/workspaces";

export const DEFAULT_FORM_TITLE = "Untitled form";

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** Create a draft form in the user's current workspace. */
export async function createDraftForm(user: SessionUser) {
  const workspace = await getCurrentWorkspace(user);
  // 31^10 slugs make a clash very unlikely; retry a few times anyway.
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const form = await tx.form.create({
          data: {
            workspaceId: workspace.id,
            slug: randomSlug(),
            title: DEFAULT_FORM_TITLE,
          },
          select: { id: true, slug: true, title: true },
        });
        await tx.auditLog.create({
          data: {
            workspaceId: workspace.id,
            actorId: user.id,
            action: "form.created",
            metaJson: { formId: form.id },
          },
        });
        return form;
      });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= 2) throw error;
    }
  }
}

/** Forms in the user's current workspace, newest first. */
export async function listForms(user: SessionUser) {
  const workspace = await getCurrentWorkspace(user);
  return db.form.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, updatedAt: true },
  });
}

/**
 * One form, only if the user is a member of its workspace. Returns null for
 * both "missing" and "not yours" so ids can't be probed.
 */
export async function getFormForUser(user: SessionUser, formId: string) {
  return db.form.findFirst({
    where: {
      id: formId,
      workspace: { memberships: { some: { userId: user.id } } },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      workspaceId: true,
    },
  });
}
