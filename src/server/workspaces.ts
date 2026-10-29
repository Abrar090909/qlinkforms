import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export function defaultWorkspaceName(user: Pick<SessionUser, "name">): string {
  const firstName = user.name?.trim().split(/\s+/)[0];
  return firstName ? `${firstName}'s workspace` : "My workspace";
}

/**
 * First-login setup: create the profile, a default workspace and an owner
 * membership. Safe to call on every login and from concurrent requests.
 * Returns the user's first workspace.
 */
export async function ensureUserSetup(user: SessionUser) {
  return db.$transaction(async (tx) => {
    // Serialise setup per user so two tabs can't create two workspaces.
    await tx.$executeRaw`select pg_advisory_xact_lock(hashtextextended(${user.id}, 0))`;

    await tx.profile.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email, name: user.name },
      update: { email: user.email },
    });

    const membership = await tx.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { workspace: true },
    });
    if (membership) return membership.workspace;

    const workspace = await tx.workspace.create({
      data: {
        ownerId: user.id,
        name: defaultWorkspaceName(user),
        memberships: { create: { userId: user.id, role: "owner" } },
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorId: user.id,
        action: "workspace.created",
      },
    });
    return workspace;
  });
}

/** The workspace shown in the app. One per user for now. */
export async function getCurrentWorkspace(user: SessionUser) {
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { workspace: { select: { id: true, name: true } } },
  });
  // Self-heal if first-login setup never ran (for example, it errored).
  return membership?.workspace ?? ensureUserSetup(user);
}

/** Rename the user's workspace. Owners and admins only. */
export async function renameWorkspace(user: SessionUser, name: string) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 1 || clean.length > 60) {
    return { ok: false as const, message: "Use 1 to 60 characters" };
  }
  const workspace = await getCurrentWorkspace(user);
  const membership = await db.membership.findUnique({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
    },
    select: { role: true },
  });
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return {
      ok: false as const,
      message: "Only the owner or an admin can rename the workspace",
    };
  }
  await db.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: workspace.id },
      data: { name: clean },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorId: user.id,
        action: "workspace.renamed",
        metaJson: { name: clean },
      },
    });
  });
  return { ok: true as const };
}
