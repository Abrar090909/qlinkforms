"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cx } from "@/components/ui/cx";
import { controlClasses } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { contrastRatio, PRESET_CANVAS } from "@/lib/color";
import type { FormSettings } from "@/lib/forms/schema";

const ACCENTS = [
  "#de7d4d",
  "#fbbd58",
  "#4ade80",
  "#8b89f0",
  "#f87171",
  "#38bdf8",
];

/** Theme (DESIGN.md section 2 presets) and form-level settings. */
export function SettingsDialog({
  open,
  onClose,
  settings,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  settings: FormSettings;
  onChange: (s: FormSettings) => void;
}) {
  const ids = {
    submit: useId(),
    title: useId(),
    message: useId(),
    closed: useId(),
    accent: useId(),
  };
  const theme = settings.theme;
  const accent = theme.accent;
  const lowContrast = accent
    ? contrastRatio(accent, PRESET_CANVAS[theme.preset]) < 3
    : false;
  const field = cx(controlClasses, "min-h-11");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Design & settings"
      size="lg"
      actions={<Button onClick={onClose}>Done</Button>}
    >
      <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto pr-1">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">Theme</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["midnight", "paper"] as const).map((preset) => (
              <label
                key={preset}
                className={cx(
                  "flex cursor-pointer flex-col gap-2 rounded-card border p-3 has-focus-visible:outline-2 has-focus-visible:outline-focus",
                  theme.preset === preset
                    ? "border-accent"
                    : "border-line hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="preset"
                  className="sr-only"
                  checked={theme.preset === preset}
                  onChange={() =>
                    onChange({ ...settings, theme: { ...theme, preset } })
                  }
                />
                <span
                  data-theme={preset}
                  className="flex h-16 items-end rounded-input border border-line bg-canvas p-2"
                >
                  <span className="h-3 w-12 rounded-pill bg-accent" />
                </span>
                <span className="text-sm font-medium capitalize">{preset}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span id={ids.accent} className="text-sm font-medium">
              Accent colour
            </span>
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-labelledby={ids.accent}
            >
              <button
                type="button"
                aria-pressed={accent === null}
                onClick={() =>
                  onChange({ ...settings, theme: { ...theme, accent: null } })
                }
                className={cx(
                  "min-h-11 rounded-pill border px-3 text-sm",
                  accent === null ? "border-accent" : "border-line",
                )}
              >
                Default
              </button>
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Accent ${c}`}
                  aria-pressed={accent === c}
                  onClick={() =>
                    onChange({ ...settings, theme: { ...theme, accent: c } })
                  }
                  className={cx(
                    "size-11 rounded-full border-2",
                    accent === c ? "border-fg" : "border-transparent",
                  )}
                  style={{ background: c }}
                />
              ))}
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="color"
                  value={accent ?? "#de7d4d"}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      theme: { ...theme, accent: e.target.value },
                    })
                  }
                  className="size-11 cursor-pointer rounded-full border border-line bg-transparent"
                />
                Custom
              </label>
            </div>
            {lowContrast && (
              <p className="text-sm text-fg-muted">
                This colour is faint on this background, so focus outlines will
                use the text colour instead.
              </p>
            )}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.submit} className="text-sm font-medium">
            Button text (optional)
          </label>
          <input
            id={ids.submit}
            value={settings.submitLabel}
            maxLength={40}
            placeholder="Submit, or “Pay ₹…” for payments"
            onChange={(e) =>
              onChange({ ...settings, submitLabel: e.target.value })
            }
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.title} className="text-sm font-medium">
            Thank-you heading
          </label>
          <input
            id={ids.title}
            value={settings.thankYouTitle}
            maxLength={120}
            onChange={(e) =>
              onChange({ ...settings, thankYouTitle: e.target.value })
            }
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.message} className="text-sm font-medium">
            Thank-you message
          </label>
          <textarea
            id={ids.message}
            rows={3}
            value={settings.thankYouMessage}
            maxLength={1000}
            onChange={(e) =>
              onChange({ ...settings, thankYouMessage: e.target.value })
            }
            className={cx(controlClasses, "py-2")}
          />
        </div>
        <Switch
          checked={settings.closed}
          onChange={(closed) => onChange({ ...settings, closed })}
          label="Close the form"
          hint="Stop accepting responses (publish to apply)"
        />
        {settings.closed && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.closed} className="text-sm font-medium">
              Message when closed
            </label>
            <input
              id={ids.closed}
              value={settings.closedMessage}
              maxLength={500}
              onChange={(e) =>
                onChange({ ...settings, closedMessage: e.target.value })
              }
              className={field}
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
