# DESIGN.md: UPI Forms (v2, "Midnight")

Design system for the marketing site, dashboard, builder and public form pages. Claude reads this together with `CLAUDE.md`. Values are tagged with where they came from.

## 0. Sources and rules

**Direction (decided 2026-10-29):** a dark, cinematic product across every surface, inspired by the free landing-page prompts on lafys.com ("Geptral", "CryptoWave", "AI Landing Page"). Earlier patterns from Typeform, Jotform and Paperform still guide the builder and form behaviour (section 6).

**Rules**
1. Take the style, not the work. The lafys prompts are rebuild scripts for other people's sites. Never copy their code verbatim, their copy, or their images, and never hot-link their asset hosts (qclay.design).
2. Open fonts only (Google Fonts via `next/font`).
3. Every text and control colour pair must meet WCAG AA. Ratios are listed next to each token. If you add a colour, add its ratio.
4. **[lafys]** means the value appears in the lafys prompts. **[ours]** means a decision for this product.

## 1. What we borrow from lafys

| Pattern | Where we use it |
|---|---|
| Near-black canvas `#1b1b1b` with white type, no pure black | Everything |
| One sans for everything, Inter Tight, big and tight display type (weights 200 to 600) | Headings, UI, forms |
| Headlines that reveal line by line on scroll (masked lines sliding up, 0.8s, ease `[0.22, 1, 0.36, 1]`) | Marketing site only |
| Frosted glass panels: white at 2 to 6% opacity, 1px white border at 10%, backdrop blur | Cards, nav, dialogs, payment summary |
| Warm copper accent `#de7d4d` used sparingly | Primary buttons, links, focus, selected states |
| Grain and soft radial glows behind hero content | Marketing hero, empty states |

## 2. Color tokens

```css
--canvas: #1b1b1b;          /* [lafys] page background */
--surface: rgb(255 255 255 / 0.04);  /* [lafys] glass panel */
--surface-solid: #262626;   /* [ours] solid fallback, inputs */
--surface-hover: rgb(255 255 255 / 0.07);
--fg: #ffffff;              /* [lafys] 17.2:1 on canvas */
--fg-muted: #a2a2a2;        /* [lafys] 6.8:1 canvas, 5.9:1 solid */
--fg-subtle: #888888;       /* [lafys] 4.9:1 canvas. Placeholders, captions. Not on solid surfaces. */
--line: rgb(255 255 255 / 0.10);     /* [lafys] decorative borders */
--line-strong: #747578;     /* [lafys] 3.7:1 canvas, 3.3:1 solid. Input outlines. */
--accent: #de7d4d;          /* [lafys] copper. 5.9:1 on canvas, so text, links and focus are fine */
--accent-fg: #1b1b1b;       /* text on copper buttons, 5.9:1 (white on copper is only 2.9:1) */
--success: #4ade80;         /* [ours] 9.9:1 */
--warning: #fbbd58;         /* [lafys] 10.3:1 */
--danger: #f87171;          /* [ours] 6.2:1 */
```

The app is dark only. Public forms are themeable (section 6).

**Public form presets [ours]:**
- **Midnight** (default): the tokens above.
- **Paper**: canvas `#faf9fb`, surface `#ffffff`, fg `#2a222b`, muted `#655d67` (6.0:1), line-strong `#837a85` (3.9:1), accent `#2a222b` with fg `#faf9fb`. This keeps a light option for respondents.
- Owners can set a custom accent hex. The app computes the button text colour (black or white, whichever contrasts more). If the accent is under 3:1 against the canvas, focus rings fall back to `fg`.

## 3. Typography

| Role | Font |
|---|---|
| Everything | **Inter Tight** [lafys], weights 300 to 600 |
| Hindi and regional text | Noto Sans Devanagari (when Hindi UI ships) |

**Scale [ours, from lafys proportions]:** 12, 14, 16, 18, 22, 28, 36. Marketing: display `clamp(48px, 9vw, 120px)` / 0.95, weight 300, tracking -0.04em. Heading `clamp(36px, 5vw, 64px)` / 1.05, weight 400, tracking -0.03em. Eyebrow: 12px uppercase, tracking 0.2em, `--fg-muted`.

## 4. Spacing, shape, elevation

- 8px grid (Tailwind even steps).
- Radius: inputs and small buttons 12px, cards 20px, large panels 28px, pills 999px. Primary CTAs on marketing are pills.
- **Elevation is glass, not shadow.** A panel is `--surface`, a 1px `--line` border and `backdrop-blur(16px)`. The one exception is a soft copper glow (radial gradient, 20% opacity) behind hero art.
- Max widths: marketing 1280px, app content 1120px, public form column 680px.

## 5. Components

- **Primary button:** copper fill, `--accent-fg` text, 12px radius (pill on marketing), min height 44px, weight 500. Hover lifts brightness by 8%.
- **Secondary button:** glass (`--surface`), `--line` border, white text.
- **Ghost button:** text only, underline on hover.
- **Payment button:** primary style showing the amount, for example "Pay ₹499".
- **Input:** `--surface-solid` fill, 1px `--line-strong`, 12px radius, 48px tall, label above, copper focus ring.
- **Card:** glass panel, 20px radius, 24px padding.
- **Status pill:** dot plus text, so colour is never the only signal. Paid = success, pending = warning, failed = danger, free = muted.
- **Toast:** glass panel, bottom centre on mobile and bottom right on desktop, one action.
- **Empty state:** glass panel with a soft copper glow, a title, one line of text and one action.

## 6. Key screens

- **Marketing:** a hero with a huge line-revealed headline and grain plus glow, a product mock in a glass frame, sections for how it works, features, use cases and the money flow, then pricing and a CTA. Every section has an eyebrow, a heading and at most one CTA.
- **Dashboard:** a glass top bar, then form cards with response count, revenue and a status pill. Empty state: "Create your first form" with a template gallery.
- **Builder (Paperform pattern):** a document canvas on the left (type, then `/` to insert fields), a live phone-width preview on the right, and a top bar with the title, Theme, Preview and Publish. Autosave.
- **Public form:** a single centred column, Page layout, an order summary card on glass, one Pay button and a receipt screen with a receipt number. No confetti.

## 7. Motion and accessibility

- Marketing reveals: 0.6 to 0.8s, ease `[0.22, 1, 0.36, 1]` [lafys], triggered once when the element scrolls into view. App UI transitions: 150 to 200ms.
- `prefers-reduced-motion`: no reveals or parallax; content appears instantly.
- WCAG AA, visible focus rings (2px copper), touch targets of at least 44px, keyboard operable throughout.
- Mobile first: design the public form at 360px width.

## 8. Do and don't

- Do keep one accent on screen at a time and let type and space do the work.
- Don't use pure black (`#000`) or pure white page backgrounds in the app.
- Don't put white text on copper (2.9:1).
- Don't use framer-motion or heavy JavaScript on the public form page. Its budget is under 100 KB of JS.

## 9. Open decisions

1. Product name and logo.
2. More public form presets after beta feedback.
