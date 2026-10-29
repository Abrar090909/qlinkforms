import type { ComponentProps } from "react";
import { cx } from "./cx";

/** White card on canvas, 24px radius, no shadow (DESIGN.md section 5). */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-card bg-surface p-6 text-fg", className)}
      {...props}
    />
  );
}
