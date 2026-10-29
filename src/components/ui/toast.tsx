"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "./button";

type ToastAction = { label: string; onClick: () => void };
type ToastInput = { message: string; action?: ToastAction };
type Toast = ToastInput & { id: number };

type ToastApi = { show: (toast: ToastInput | string) => void };

const ToastContext = createContext<ToastApi | null>(null);

const DISMISS_AFTER_MS = 6000;

/**
 * Toasts: plain text on surface-alt with at most one action (DESIGN.md
 * section 5). Announced through a polite live region that is always in the
 * DOM, so screen readers pick up each new message.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((input: ToastInput | string) => {
    const toast = typeof input === "string" ? { message: input } : input;
    const id = nextId.current++;
    // Keep at most three on screen.
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [paused, toast.id, onDismiss]);

  return (
    <div
      // Hovering or focusing a toast keeps it open (WCAG 2.2.1 timing).
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="tile pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-card bg-surface-solid py-2 pr-2 pl-4 text-sm text-fg"
    >
      <p className="flex-1">{toast.message}</p>
      {toast.action && (
        <Button
          variant="secondary"
          className="px-4"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </Button>
      )}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="inline-flex size-11 items-center justify-center rounded-button text-fg-muted hover:text-fg"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>.");
  return api;
}
