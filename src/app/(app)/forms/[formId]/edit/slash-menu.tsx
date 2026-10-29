"use client";

import { type KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { BLOCK_CATALOGUE } from "@/lib/forms/blocks";
import type { FieldType } from "@/lib/forms/schema";
import { BlockIcon } from "./block-icon";

/**
 * "Type / to add a field" (Paperform pattern). A combobox: typing filters the
 * catalogue, arrows move, Enter inserts, Escape clears.
 */
export function SlashInput({
  onInsert,
  disabledTypes,
  autoFocus,
}: {
  onInsert: (type: FieldType) => void;
  disabledTypes: FieldType[];
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const open = text.startsWith("/");
  const query = text.slice(1).trim().toLowerCase();

  const results = useMemo(
    () =>
      BLOCK_CATALOGUE.filter((m) => !disabledTypes.includes(m.type)).filter(
        (m) =>
          !query ||
          `${m.name} ${m.keywords} ${m.hint}`.toLowerCase().includes(query),
      ),
    [query, disabledTypes],
  );

  function insert(type: FieldType) {
    onInsert(type);
    setText("");
    setActive(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = results[active];
      if (pick) insert(pick.type);
    } else if (event.key === "Escape") {
      setText("");
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[active]
            ? `${listId}-${results[active].type}`
            : undefined
        }
        aria-label="Add a field: type / to choose a field type"
        placeholder="Type / to add a field"
        className="min-h-12 w-full rounded-input border border-dashed border-line-strong bg-transparent px-4 text-base placeholder:text-fg-subtle focus-visible:border-accent"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-30 mt-2 max-h-80 overflow-auto rounded-card border border-line bg-surface-solid p-1.5"
        >
          {results.length === 0 && (
            <li className="px-3 py-3 text-sm text-fg-muted">
              No field matches “{query}”
            </li>
          )}
          {results.map((m, i) => (
            <li
              key={m.type}
              id={`${listId}-${m.type}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                insert(m.type);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-input px-3 py-2 ${i === active ? "bg-surface-hover" : ""}`}
            >
              <BlockIcon type={m.type} />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{m.name}</span>
                <span className="text-xs text-fg-muted">{m.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Button grid version of the same menu, for touch users and the empty canvas. */
export function AddFieldGrid({
  onInsert,
  disabledTypes,
}: {
  onInsert: (type: FieldType) => void;
  disabledTypes: FieldType[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {BLOCK_CATALOGUE.filter((m) => !disabledTypes.includes(m.type)).map(
        (m) => (
          <button
            key={m.type}
            type="button"
            onClick={() => onInsert(m.type)}
            className="flex min-h-12 items-center gap-2 rounded-input border border-line bg-surface px-3 text-left text-sm hover:border-line-strong hover:bg-surface-hover"
          >
            <BlockIcon type={m.type} />
            {m.name}
          </button>
        ),
      )}
    </div>
  );
}
