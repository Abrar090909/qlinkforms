import type { ComponentProps } from "react";
import { cx } from "./cx";

/** White tile with a hairline, 12px radius, no shadow (DESIGN.md section 5). */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("tile rounded-card p-6 text-fg", className)}
      {...props}
    />
  );
}
