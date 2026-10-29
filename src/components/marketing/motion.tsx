"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { type ReactNode, useRef } from "react";

// Marketing-only motion (DESIGN.md section 7): masked line reveals and soft
// fades at the lafys easing, once per element. Never imported by app or form
// pages, so they don't ship this library.

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Each line slides up from behind a mask, staggered. */
export function RevealLines({
  lines,
  as: Tag = "h2",
  className,
  delay = 0,
}: {
  lines: string[];
  as?: "h1" | "h2" | "p";
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[Tag];
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.4 }}
      aria-label={lines.join(" ")}
    >
      {lines.map((line, i) => (
        // Padding plus negative margin keeps ascenders and descenders inside the mask.
        <span
          key={i}
          aria-hidden="true"
          className="-my-[0.12em] block overflow-hidden py-[0.12em]"
        >
          <motion.span
            className="block"
            variants={{
              hidden: reduce ? { y: 0 } : { y: "110%" },
              shown: {
                y: 0,
                transition: {
                  duration: 0.8,
                  ease: EASE,
                  delay: delay + i * 0.08,
                },
              },
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      // Reduced motion: appear instantly when reached, no movement.
      transition={
        reduce ? { duration: 0 } : { duration: 0.7, ease: EASE, delay }
      }
    >
      {children}
    </motion.div>
  );
}

/** Gentle parallax float for the hero product mock. */
export function Parallax({
  children,
  className,
  distance = 60,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [distance, -distance],
  );
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
