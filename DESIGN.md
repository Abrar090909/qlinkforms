# DESIGN.md: UPI Forms (v3, "Ledger")

Design system for the marketing site, dashboard, builder and public forms. Claude reads this together with `CLAUDE.md`. Tokens live in `src/styles/tokens.css`; this file explains them.

## 0. Sources and why v3

v2 ("Midnight": dark glass, glows, grain, copper, weight-300 display, scroll reveals) read as generic AI output, and the owner rejected it on 2026-10-29. v3 follows patterns shared by well-regarded product design systems, studied through community DESIGN.md libraries the owner pointed to (getdesign.md, designmd.me, styles.refero.design, Kage, 21st.dev). The closest references were the Ramp-inspired and Brex-inspired files on shadcn.io/design.

**Rules**
1. Take patterns, never a brand's palette, copy, logo or proprietary font.
2. Every text and control colour pair meets WCAG AA. Ratios are listed next to each token. If you add a colour, add its ratio.
3. If something isn't covered here, ask before inventing it.

## 1. Principles (what makes it not look generated)

- **One canvas, white tiles, hairlines.** Depth comes from a 1px `--line` border on a white tile over warm paper. Use a shadow only for things that float (menus, dialogs, the hero mock).
- **One action colour: ink.** Primary buttons are near-black with white text.
- **Green means money.** `--brand` appears only for paid states, success, the focus ring and small labels. Never use it for decoration.
- **Hierarchy from size, not weight.** Use weight 500 for headings and 400 for body. Never 300, never bold display text.
- **Show the product.** Marketing visuals are real UI built in markup (forms, tables, receipts). Never use blobs, glows, grain, sparkles or stock illustrations.
- **Numbers are mono.** Amounts, receipt numbers and counts use Geist Mono.
- **Calm.** No scroll-triggered animations, marquees or parallax. Transitions run 150ms on hover and focus only.

## 2. Colour

| Token | Value | Use | Contrast |
|---|---|---|---|
| `canvas` | `#f6f5f1` | page background | |
| `surface` | `#ffffff` | tiles, inputs | |
| `surface-hover` | `#efeee9` | hover, selected rows | |
| `fg` | `#18181b` | text, primary button fill | 16.2:1 on canvas |
| `fg-muted` | `#5c5b57` | secondary text | 6.2:1 |
| `fg-subtle` | `#6b6964` | captions, placeholders | 5.0:1 |
| `line` | `#e4e2dc` | hairlines | decorative |
| `line-strong` | `#8f8d86` | input outlines | 3.0:1 |
| `brand` | `#0b6b46` | money, success, focus | 6.0:1 |
| `brand-tint` | `#e5f0ea` | paid badges, selection | brand on tint 5.6:1 |
| `warning` | `#a15c07` | pending | 4.8:1 |
| `danger` | `#b42318` | errors, failed | 6.0:1 |

**Public form presets:** *Paper* (default, the palette above) and *Midnight* (dark: canvas `#161616`, surface `#1f1f1f`, fg `#f5f5f4` at 16.6:1, muted `#a8a6a1` at 6.8:1, line-strong `#6f6e6a` at 3.2:1, brand `#4ade80`). Owners can set an accent for the Pay button. Its text colour is computed to whichever of black or white reads better, and the focus ring falls back to the text colour when the accent is under 3:1.

## 3. Type

- **Geist** for everything; **Geist Mono** for amounts, receipts and step numbers.
- **Scale:** 12, 14, 16, 18, 20, 24, 32. Headings `clamp(32px, 4vw, 44px)` at line height 1.08 and tracking −0.025em. Display `clamp(40px, 6vw, 64px)` at line height 1.02 and tracking −0.035em.
- **Section labels:** 13px, weight 500, `brand` colour, sentence case. Never uppercase with wide tracking.

## 4. Shape and space

- 8px grid (Tailwind even steps). Sections get 80px of vertical padding, separated by a hairline.
- **Radius:** inputs and buttons 10px, tiles 12px, large panels 16px, pills only for status badges.
- **Shadow:** `shadow-float` for floating elements only.
- **Widths:** marketing 1200px, app 1120px, public form 640px.

## 5. Components

- **Primary button:** ink fill, white text, 10px radius, 44px tall (36px `sm` in dense toolbars), hover at 85% opacity.
- **Secondary button:** white tile with a hairline, ink text.
- **Ghost button:** text only.
- **Payment button:** primary, showing the amount ("Pay ₹499").
- **Input:** white, 1px `line-strong`, 10px radius, 48px tall, label above, green focus ring.
- **Tile (`.tile`):** white with a 1px `line` border. Cards are tiles with 24px padding.
- **Status pill:** a dot plus text, so colour never carries meaning alone.
- **Toasts, dialogs, empty states:** tiles. Each has one action.

## 6. Key screens

- **Marketing:** a hero of headline, one line of copy and two buttons beside a product composite (builder, phone, receipt). Then how it works, a 2×2 product mosaic, money flow, templates, pricing, FAQ, and a single dark ink band for the final CTA.
- **Dashboard:** totals as tiles, then form cards with status, responses and revenue.
- **Builder:** a document canvas with a live phone preview (Paperform pattern).
- **Public form:** a single column, the order summary in a tile, one Pay button and a receipt page.

## 7. Accessibility and performance

WCAG AA, visible focus rings, touch targets of at least 44px, keyboard operable throughout, and `prefers-reduced-motion` respected. The public form ships no animation library or zod. Measured on 2026-10-29: 145 KB gzipped, about 135 KB of which is the Next.js and React runtime.
