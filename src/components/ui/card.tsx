import type { ComponentProps } from "react";
import { cx } from "./cx";

/** Glass panel, 20px radius, no shadow (DESIGN.md section 5). */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("glass rounded-card p-6 text-fg", className)}
      {...props}
    />
  );
}
