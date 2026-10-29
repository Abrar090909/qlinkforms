import { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  emptyFormSchema,
  type FormSchema,
  parseFormSchema,
} from "@/lib/forms/schema";
import { buildTemplate } from "@/lib/forms/templates";
import { randomSlug } from "@/lib/slug";
import { getCurrentWorkspace } from "@/server/workspaces";

export const DEFAULT_FORM_TITLE = "Untitled form";

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function audit(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  actorId: string,
  action: string,
  meta: Prisma.InputJsonValue,
) {
  await tx.auditLog.create({
    data: { workspaceId, actorId, action, metaJson: meta },
  });
}

/** Create a draft form in the user's current workspace, optionally from a template. */
export async function createDraftForm(
  user: SessionUser,
  options: { templateId?: string } = {},
) {
  const workspace = await getCurrentWorkspace(user);
  const draft =
    (options.templateId && buildTemplate(options.templateId)) ||
    emptyFormSchema(DEFAULT_FORM_TITLE);
  // 31^10 slugs make a clash very unlikely; retry a few times anyway.
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const form = await tx.form.create({
          data: {
            workspaceId: workspace.id,
            slug: randomSlug(),
            title: draft.title,
            draftJson: draft as unknown as Prisma.InputJsonValue,
          },
          select: { id: true, slug: true, title: true },
        });
        await audit(tx, workspace.id, user.id, "form.created", {
          formId: form.id,
          templateId: options.templateId ?? null,
        });
        return form;
      });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= 2) throw error;
    }
  }
}

/** Forms in the user's current workspace with response and revenue totals. */
export async function listForms(user: SessionUser) {
  const workspace = await getCurrentWorkspace(user);
  const forms = await db.form.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      updatedAt: true,
    },
  });
  if (forms.length === 0) return [];
  const ids = forms.map((f) => f.id);
  const [counts, revenue] = await Promise.all([
    db.submission.groupBy({
      by: ["formId"],
      where: { formId: { in: ids }, status: { in: ["completed", "paid"] } },
      _count: { _all: true },
    }),
    db.submission.groupBy({
      by: ["formId"],
      where: { formId: { in: ids }, status: "paid" },
      _sum: { amountMinor: true },
    }),
  ]);
  return forms.map((form) => ({
    ...form,
    responses: counts.find((c) => c.formId === form.id)?._count._all ?? 0,
    revenueMinor:
      revenue.find((r) => r.formId === form.id)?._sum.amountMinor ?? 0,
  }));
}

const memberOf = (user: SessionUser) => ({
  workspace: { memberships: { some: { userId: user.id } } },
});

/**
 * One form, only if the user is a member of its workspace. Returns null for
 * both "missing" and "not yours" so ids can't be probed.
 */
export async function getFormForUser(user: SessionUser, formId: string) {
  return db.form.findFirst({
    where: { id: formId, ...memberOf(user) },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      workspaceId: true,
      updatedAt: true,
      publishedAt: true,
      draftJson: true,
      currentVersionId: true,
    },
  });
}

/** The draft as a valid FormSchema. Old or empty drafts get a fresh schema. */
export function draftOf(form: {
  title: string;
  draftJson: unknown;
}): FormSchema {
  const parsed = parseFormSchema(form.draftJson);
  return parsed.success ? parsed.data : emptyFormSchema(form.title);
}

export type SaveResult =
  | { ok: true; updatedAt: string }
  | {
      ok: false;
      reason: "conflict" | "invalid" | "not_found";
      message: string;
    };

/**
 * Autosave. Optimistic concurrency: the save only applies if the form hasn't
 * changed since the editor loaded `baseUpdatedAt`, so two tabs can't silently
 * overwrite each other.
 */
export async function saveDraft(
  user: SessionUser,
  formId: string,
  draft: unknown,
  baseUpdatedAt: string,
): Promise<SaveResult> {
  const parsed = parseFormSchema(draft);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message ?? "The form has a problem",
    };
  }
  const form = await getFormForUser(user, formId);
  if (!form)
    return { ok: false, reason: "not_found", message: "Form not found" };
  // Postgres keeps microseconds, JavaScript dates only milliseconds, so match
  // the millisecond the editor saw rather than exact equality.
  const base = new Date(baseUpdatedAt);
  if (Number.isNaN(base.getTime())) {
    return { ok: false, reason: "invalid", message: "Reload the editor" };
  }
  const updated = await db.form.updateMany({
    where: {
      id: formId,
      updatedAt: { gte: base, lt: new Date(base.getTime() + 1) },
    },
    data: {
      draftJson: parsed.data as unknown as Prisma.InputJsonValue,
      title: parsed.data.title,
    },
  });
  if (updated.count === 0) {
    return {
      ok: false,
      reason: "conflict",
      message:
        "This form was changed in another tab. Reload to see the latest version.",
    };
  }
  const fresh = await db.form.findUniqueOrThrow({
    where: { id: formId },
    select: { updatedAt: true },
  });
  return { ok: true, updatedAt: fresh.updatedAt.toISOString() };
}

export type PublishResult =
  | { ok: true; slug: string; versionId: string }
  | { ok: false; message: string };

/** Snapshot the draft into an immutable version and make it live. */
export async function publishForm(
  user: SessionUser,
  formId: string,
): Promise<PublishResult> {
  const form = await getFormForUser(user, formId);
  if (!form) return { ok: false, message: "Form not found" };
  const parsed = parseFormSchema(form.draftJson);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Fix the form before publishing",
    };
  }
  if (!parsed.data.blocks.some((b) => b.type !== "statement")) {
    return {
      ok: false,
      message: "Add at least one question before publishing",
    };
  }
  if (parsed.data.blocks.some((b) => b.type === "payment")) {
    const account = await db.paymentAccount.findFirst({
      where: {
        workspaceId: form.workspaceId,
        provider: "razorpay",
        status: "active",
      },
      select: { id: true },
    });
    if (!account) {
      return {
        ok: false,
        message:
          "Connect your Razorpay account in Settings before publishing a form with a payment.",
      };
    }
  }
  const version = await db.$transaction(async (tx) => {
    const v = await tx.formVersion.create({
      data: {
        formId,
        schemaJson: parsed.data as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    await tx.form.update({
      where: { id: formId },
      data: {
        currentVersionId: v.id,
        status: "published",
        publishedAt: new Date(),
        title: parsed.data.title,
      },
    });
    await audit(tx, form.workspaceId, user.id, "form.published", {
      formId,
      versionId: v.id,
    });
    return v;
  });
  return { ok: true, slug: form.slug, versionId: version.id };
}

const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "login",
  "signup",
  "dashboard",
  "forms",
  "settings",
  "new",
  "edit",
  "auth",
  "f",
]);

export function slugProblem(slug: string): string | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(slug)) {
    return "Use 3 to 50 lowercase letters, numbers or hyphens, starting and ending with a letter or number.";
  }
  if (slug.includes("--")) return "Avoid double hyphens.";
  if (RESERVED_SLUGS.has(slug)) return "That link is reserved. Try another.";
  return null;
}

export async function updateSlug(
  user: SessionUser,
  formId: string,
  slug: string,
): Promise<{ ok: true; slug: string } | { ok: false; message: string }> {
  const clean = slug.trim().toLowerCase();
  const problem = slugProblem(clean);
  if (problem) return { ok: false, message: problem };
  const form = await getFormForUser(user, formId);
  if (!form) return { ok: false, message: "Form not found" };
  if (form.slug === clean) return { ok: true, slug: clean };
  try {
    await db.$transaction(async (tx) => {
      await tx.form.update({ where: { id: formId }, data: { slug: clean } });
      await audit(tx, form.workspaceId, user.id, "form.slug_changed", {
        formId,
        from: form.slug,
        to: clean,
      });
    });
    return { ok: true, slug: clean };
  } catch (error) {
    if (isUniqueViolation(error))
      return { ok: false, message: "That link is taken. Try another." };
    throw error;
  }
}

export async function setFormStatus(
  user: SessionUser,
  formId: string,
  status: "archived" | "draft",
) {
  const form = await getFormForUser(user, formId);
  if (!form) return false;
  await db.$transaction(async (tx) => {
    await tx.form.update({ where: { id: formId }, data: { status } });
    await audit(
      tx,
      form.workspaceId,
      user.id,
      `form.${status === "archived" ? "archived" : "unpublished"}`,
      { formId },
    );
  });
  return true;
}

export async function duplicateForm(user: SessionUser, formId: string) {
  const form = await getFormForUser(user, formId);
  if (!form) return null;
  const draft = draftOf(form);
  const workspace = { id: form.workspaceId };
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const copy = await tx.form.create({
          data: {
            workspaceId: workspace.id,
            slug: randomSlug(),
            title: `${draft.title} (copy)`.slice(0, 150),
            draftJson: {
              ...draft,
              title: `${draft.title} (copy)`.slice(0, 150),
            } as unknown as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        await audit(tx, workspace.id, user.id, "form.duplicated", {
          from: formId,
          formId: copy.id,
        });
        return copy;
      });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= 2) throw error;
    }
  }
}

/**
 * Delete a form. Refused once anyone has paid through it: payment records must
 * be kept for the owner's accounts. Archive those instead.
 */
export async function deleteForm(
  user: SessionUser,
  formId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const form = await getFormForUser(user, formId);
  if (!form) return { ok: false, message: "Form not found" };
  const payments = await db.payment.count({
    where: { submission: { formId } },
  });
  if (payments > 0) {
    return {
      ok: false,
      message:
        "This form has payments, so it can't be deleted. Archive it instead.",
    };
  }
  await db.$transaction(async (tx) => {
    // Versions are referenced by submissions with NO ACTION; remove those first.
    await tx.submission.deleteMany({ where: { formId } });
    await tx.form.update({
      where: { id: formId },
      data: { currentVersionId: null },
    });
    await tx.formVersion.deleteMany({ where: { formId } });
    await tx.form.delete({ where: { id: formId } });
    await audit(tx, form.workspaceId, user.id, "form.deleted", {
      formId,
      title: form.title,
    });
  });
  return { ok: true };
}

/** The live version of a published form, for the public renderer. */
export async function getPublishedForm(slug: string) {
  const form = await db.form.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      status: true,
      workspaceId: true,
      currentVersion: { select: { id: true, schemaJson: true } },
      workspace: { select: { plan: true } },
    },
  });
  if (!form || form.status !== "published" || !form.currentVersion) return null;
  const parsed = parseFormSchema(form.currentVersion.schemaJson);
  if (!parsed.success) return null;
  return {
    id: form.id,
    slug: form.slug,
    workspaceId: form.workspaceId,
    plan: form.workspace.plan,
    versionId: form.currentVersion.id,
    schema: parsed.data,
  };
}
