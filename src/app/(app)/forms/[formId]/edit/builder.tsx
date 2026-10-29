"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { FormRenderer } from "@/components/form/form-renderer";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { createBlock } from "@/lib/forms/blocks";
import {
  type Block,
  type FieldType,
  type FormSchema,
  formSchemaSchema,
  newId,
} from "@/lib/forms/schema";
import { themeStyle } from "@/lib/color";
import { saveDraftAction } from "../../actions";
import { BlockEditor } from "./block-editor";
import { type CouponRow } from "./payment-editor";
import { PublishDialog } from "./publish-dialog";
import { SettingsDialog } from "./settings-dialog";
import { AddFieldGrid, SlashInput } from "./slash-menu";

type SaveState =
  "saved" | "saving" | "dirty" | "invalid" | "error" | "conflict";

type Props = {
  formId: string;
  initialDraft: FormSchema;
  initialUpdatedAt: string;
  initialSlug: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  siteUrl: string;
  paymentsConnected: boolean;
  coupons: CouponRow[];
};

const AUTOSAVE_MS = 1200;

export function Builder(props: Props) {
  const { formId } = props;
  const [draft, setDraft] = useState(props.initialDraft);
  const [selected, setSelected] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [dialog, setDialog] = useState<"publish" | "settings" | null>(null);
  const [slug, setSlug] = useState(props.initialSlug);
  const [status, setStatus] = useState(props.status);
  const [lastPublished, setLastPublished] = useState(props.publishedAt);
  const [lastSaved, setLastSaved] = useState(props.initialUpdatedAt);

  const updatedAt = useRef(props.initialUpdatedAt);
  const saving = useRef(false);
  const queued = useRef<FormSchema | null>(null);
  // Bumped by every edit; the autosave effect keys off it, not the first render.
  const [revision, setRevision] = useState(0);

  const validation = useMemo(() => formSchemaSchema.safeParse(draft), [draft]);
  const blockErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "blocks" && typeof issue.path[1] === "number") {
          const id = draft.blocks[issue.path[1]]?.id;
          if (id && !errors[id]) errors[id] = issue.message;
        }
      }
    }
    return errors;
  }, [validation, draft.blocks]);

  async function save(value: FormSchema): Promise<void> {
    if (saving.current) {
      queued.current = value;
      return;
    }
    saving.current = true;
    setSaveState("saving");
    try {
      const result = await saveDraftAction(formId, value, updatedAt.current);
      if (result.ok) {
        updatedAt.current = result.updatedAt;
        setLastSaved(result.updatedAt);
        setSaveState("saved");
        setSaveMessage(null);
      } else {
        setSaveState(result.reason === "conflict" ? "conflict" : "error");
        setSaveMessage(result.message);
        queued.current = null;
      }
    } catch {
      setSaveState("error");
      setSaveMessage(
        "Couldn't save. Check your connection; we'll retry on your next change.",
      );
    } finally {
      saving.current = false;
      const next = queued.current;
      queued.current = null;
      if (next) void save(next);
    }
  }

  // Effect-only callback: always sees the latest save and draft.
  const autosave = useEffectEvent(() => {
    if (validation.success) void save(validation.data);
  });

  // Autosave a moment after the last edit. Invalid drafts wait until fixed.
  useEffect(() => {
    if (revision === 0) return;
    const timer = setTimeout(autosave, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [revision]);

  // What the indicator shows: an invalid draft overrides the save status.
  const shownState: SaveState =
    saveState === "conflict"
      ? "conflict"
      : !validation.success
        ? "invalid"
        : saveState;
  const shownMessage =
    shownState === "invalid" && !validation.success
      ? (validation.error.issues[0]?.message ?? null)
      : saveMessage;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const unsaved =
      shownState === "dirty" ||
      shownState === "saving" ||
      shownState === "invalid";
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [shownState]);

  const update = (fn: (d: FormSchema) => FormSchema) => {
    if (saveState === "conflict") return; // don't pile edits onto a stale copy
    setDraft((d) => fn(d));
    setSaveState("dirty");
    setRevision((r) => r + 1);
  };
  const setBlocks = (fn: (blocks: Block[]) => Block[]) =>
    update((d) => ({ ...d, blocks: fn(d.blocks) }));

  function insert(type: FieldType, at?: number) {
    const block = createBlock(type);
    setBlocks((blocks) => {
      const next = [...blocks];
      next.splice(at ?? next.length, 0, block);
      return next;
    });
    setSelected(block.id);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((blocks) =>
      arrayMove(
        blocks,
        blocks.findIndex((b) => b.id === active.id),
        blocks.findIndex((b) => b.id === over.id),
      ),
    );
  }

  const hasPayment = draft.blocks.some((b) => b.type === "payment");
  const disabledTypes: FieldType[] = hasPayment ? ["payment"] : [];
  const unpublishedChanges =
    status === "published" &&
    lastPublished !== null &&
    new Date(lastSaved) > new Date(lastPublished);
  const previewSchema = validation.success ? validation.data : draft;

  return (
    <div className="-mx-4 -my-8 flex flex-1 flex-col sm:-mx-6 sm:-my-12">
      {/* Top bar */}
      <div className="sticky top-[61px] z-30 border-b border-line bg-canvas">
        <div className="mx-auto flex w-full max-w-app flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-surface-hover hover:text-fg"
              aria-label="Back to forms"
            >
              ←
            </Link>
            <SaveIndicator state={shownState} message={shownMessage} />
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex rounded-pill border border-line p-0.5 lg:hidden"
              role="group"
              aria-label="View"
            >
              {(["edit", "preview"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cx(
                    "min-h-10 rounded-pill px-4 text-sm capitalize",
                    view === v ? "bg-surface-hover text-fg" : "text-fg-muted",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="min-h-10"
              onClick={() => setDialog("settings")}
            >
              Design & settings
            </Button>
            <Button
              size="sm"
              className="min-h-10"
              onClick={() => setDialog("publish")}
            >
              {status === "published"
                ? unpublishedChanges
                  ? "Publish changes"
                  : "Share"
                : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-app flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Document canvas */}
        <section
          aria-label="Form editor"
          className={cx(
            "flex min-w-0 flex-col gap-2",
            view === "preview" && "hidden lg:flex",
          )}
        >
          <label htmlFor="form-title" className="sr-only">
            Form title
          </label>
          <input
            id="form-title"
            value={draft.title}
            onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
            placeholder="Form title"
            className="w-full bg-transparent px-3 text-3xl font-normal tracking-tight placeholder:text-fg-subtle focus-visible:outline-none sm:px-4 sm:text-[40px]"
          />
          <label htmlFor="form-description" className="sr-only">
            Description
          </label>
          <textarea
            id="form-description"
            rows={2}
            value={draft.description}
            onChange={(e) =>
              update((d) => ({ ...d, description: e.target.value }))
            }
            placeholder="Add a short description (optional)"
            className="w-full resize-none bg-transparent px-3 text-lg text-fg-muted placeholder:text-fg-subtle focus-visible:outline-none sm:px-4"
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={draft.blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="mt-4 flex flex-col gap-1">
                {draft.blocks.map((block, index) => (
                  <li key={block.id}>
                    <BlockEditor
                      block={block}
                      index={index}
                      count={draft.blocks.length}
                      earlier={draft.blocks.slice(0, index)}
                      selected={selected === block.id}
                      error={blockErrors[block.id]}
                      formId={formId}
                      coupons={props.coupons}
                      onSelect={() => setSelected(block.id)}
                      onChange={(next) =>
                        setBlocks((blocks) =>
                          blocks.map((b) => (b.id === block.id ? next : b)),
                        )
                      }
                      onMove={(delta) =>
                        setBlocks((blocks) =>
                          arrayMove(
                            blocks,
                            index,
                            Math.max(
                              0,
                              Math.min(blocks.length - 1, index + delta),
                            ),
                          ),
                        )
                      }
                      onDuplicate={() => {
                        const copy = {
                          ...structuredClone(block),
                          id: newId(),
                        } as Block;
                        if ("options" in copy)
                          copy.options = copy.options.map((o) => ({
                            ...o,
                            id: newId(),
                          }));
                        setBlocks((blocks) => [
                          ...blocks.slice(0, index + 1),
                          copy,
                          ...blocks.slice(index + 1),
                        ]);
                        setSelected(copy.id);
                      }}
                      onDelete={() => {
                        setBlocks((blocks) =>
                          blocks
                            .filter((b) => b.id !== block.id)
                            // Conditions pointing at the deleted block go too.
                            .map((b) =>
                              b.visibility?.fieldId === block.id
                                ? ({ ...b, visibility: null } as Block)
                                : b,
                            ),
                        );
                        setSelected(null);
                      }}
                    />
                  </li>
                ))}
              </ol>
            </SortableContext>
          </DndContext>

          <div className="mt-2 flex flex-col gap-4 px-3 sm:px-4">
            <SlashInput
              onInsert={(t) => insert(t)}
              disabledTypes={disabledTypes}
              autoFocus={draft.blocks.length === 0}
            />
            {draft.blocks.length === 0 ? (
              <AddFieldGrid
                onInsert={(t) => insert(t)}
                disabledTypes={disabledTypes}
              />
            ) : (
              <details className="text-sm text-fg-muted">
                <summary className="min-h-11 cursor-pointer content-center">
                  Or pick a field
                </summary>
                <div className="mt-2">
                  <AddFieldGrid
                    onInsert={(t) => insert(t)}
                    disabledTypes={disabledTypes}
                  />
                </div>
              </details>
            )}
            {hasPayment && !props.paymentsConnected && (
              <p className="rounded-input border-l-4 border-accent bg-surface px-4 py-3 text-sm">
                This form takes payments.{" "}
                <Link href="/settings" className="text-accent underline">
                  Connect Razorpay
                </Link>{" "}
                before publishing.
              </p>
            )}
          </div>
        </section>

        {/* Live preview */}
        <aside
          aria-label="Live preview"
          className={cx(
            "lg:sticky lg:top-[130px] lg:self-start",
            view === "edit" && "hidden lg:block",
          )}
        >
          <p className="mb-3 text-eyebrow font-medium text-fg-muted">
            Live preview
          </p>
          <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[36px] border border-line bg-surface p-2">
            <div
              data-theme={previewSchema.settings.theme.preset}
              style={themeStyle(
                previewSchema.settings.theme.preset,
                previewSchema.settings.theme.accent,
              )}
              className="max-h-[70vh] min-h-[480px] overflow-y-auto rounded-[28px] bg-canvas px-5 py-8 text-fg lg:max-h-[calc(100vh-220px)]"
            >
              <FormRenderer
                key={JSON.stringify(previewSchema.blocks.map((b) => b.id))}
                schema={previewSchema}
                preview
              />
            </div>
          </div>
        </aside>
      </div>

      <PublishDialog
        open={dialog === "publish"}
        onClose={() => setDialog(null)}
        formId={formId}
        slug={slug}
        siteUrl={props.siteUrl}
        status={status}
        canPublish={validation.success && shownState === "saved"}
        unpublishedChanges={unpublishedChanges}
        onPublished={(at) => {
          setStatus("published");
          // Publishing snapshots the saved draft, so it covers the last save
          // even if this browser clock runs behind the server.
          setLastPublished(
            new Date(
              Math.max(Date.parse(at), Date.parse(lastSaved)),
            ).toISOString(),
          );
        }}
        onSlug={setSlug}
        flushSave={async () => {
          if (saveState !== "saved" && validation.success)
            await save(validation.data);
        }}
      />
      <SettingsDialog
        open={dialog === "settings"}
        onClose={() => setDialog(null)}
        settings={draft.settings}
        onChange={(settings) => update((d) => ({ ...d, settings }))}
      />
    </div>
  );
}

function SaveIndicator({
  state,
  message,
}: {
  state: SaveState;
  message: string | null;
}) {
  const text = {
    saved: "All changes saved",
    saving: "Saving…",
    dirty: "Editing…",
    invalid: message ?? "Fix the highlighted field to save",
    error: message ?? "Couldn't save",
    conflict: message ?? "Changed elsewhere. Reload.",
  }[state];
  const dot = {
    saved: "bg-success",
    saving: "bg-warning",
    dirty: "bg-fg-muted",
    invalid: "bg-danger",
    error: "bg-danger",
    conflict: "bg-danger",
  }[state];
  return (
    <p
      role="status"
      className="flex min-w-0 items-center gap-2 text-sm text-fg-muted"
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${dot}`}
      />
      <span className="truncate">{text}</span>
      {state === "conflict" && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 text-accent underline"
        >
          Reload
        </button>
      )}
    </p>
  );
}
