# DESIGN.md: UPI Forms

Design system for the UPI Forms builder, dashboard and public form pages. Claude reads this together with `CLAUDE.md`. Every value below is tagged with where it came from, so nothing is invented from memory.

## 0. Sources, rules and gaps

**Researched sources**
- **Typeform:** third-party style extraction of typeform.com (Refero Styles: exact hex, fonts, radii, spacing), plus Typeform's own brand page and design tips.
- **Jotform:** official brand kit (jotform.com/resources) for colors, plus its help center on the Form Designer, fonts and Brand Kit.
- **Paperform:** official press kit (fonts), plus its help center on the Theme & Appearance editor, one-at-a-time mode and price-on-button.

**Rules**
1. Take patterns, not assets. Never use their logos, mascots, copy, illustrations or screenshots.
2. Their brand fonts are commercial or proprietary: Typeform uses Tobias and TWK Lausanne, Paperform uses BR Sonoma. Do not use or imitate them. Use the open fonts in section 3.
3. Do not ship any competitor's exact brand color combination as our identity. Researched values below are references, and tokens marked **[placeholder]** must be replaced when our brand is chosen.
4. Anything tagged **[ours]** is a decision made for this product, not copied from a competitor.

**Known gaps (verify by using the live products before the beta)**
- Jotform's website typeface was not found in research.
- Paperform's brand hex colors were not published in what I found (only "black, white, or Paperform gold").
- Typeform values come from its marketing site, not its in-product form UI.

## 1. What we borrow

| From | Pattern | Where we use it |
|---|---|---|
| Typeform | Warm near-black ink on cream canvas, no pure black or white page. Quiet near-black buttons. Elevation through surface contrast, not shadows. Large type does the work. | Colors, buttons, cards, public form default theme |
| Typeform | One question at a time as a layout option. Default theme is a blank canvas ("Paper" and "Ink") that owners recolor. | Public form layouts, theme presets |
| Typeform | Design tips: one concept per form, levels of information via size, shape, color and type, same base theme with small tweaks. | Theme editor guidance |
| Jotform | One bright color for calls to action and interface elements, a deep navy for text and navigation. | Accent role, Bright preset |
| Jotform | Form Designer with Styles tab, label styles, built-in font selector. Brand Kit holding logos, colors and media. | Theme editor, P1 brand kit |
| Paperform | Document-style editor with a live preview next to a settings panel. Theme & Appearance editor with a custom palette and per-element text styles. | Builder layout, theme editor |
| Paperform | Optional progress bar and "questions to go" on the submit button. **Total price shown on the next/pay button.** | Payment step |
| Paperform | Work Sans for long copy. | Form body font |

## 2. Color tokens

Neutrals and surfaces are from the Typeform extraction. Action colors reference Jotform's official kit.

```css
:root {
  /* Surfaces (Typeform extraction) */
  --canvas: #faf9fb;          /* page background */
  --surface-alt: #f5f3f6;     /* alternating sections, subtle panels */
  --surface: #ffffff;         /* cards, inputs */
  --ink: #2a222b;             /* primary text, primary button fill */
  --ink-elevated: #3e3040;    /* dark surface level 2 */

  /* Text and borders (Typeform extraction) */
  --text-secondary: #655d67;
  --text-placeholder: #837a85;
  --border: #d4d1d5;
  --border-dark: #564b58;

  /* Eyebrow accent (Typeform): labels only, never buttons or links */
  --eyebrow: #9454ab;
  --eyebrow-tint: #ddb7f0;

  /* Action accent [placeholder]: single bright color for links, focus, selected
     states. Value is Jotform's official sky blue; replace with our own brand color. */
  --accent: #0099ff;
  --accent-ink: #0a1551;      /* Jotform midnight blue, used for Bright preset text */

  /* Semantic [ours]: standard Tailwind success, warning, danger values */
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
}
```

**Theme presets for the public form** (ship 3, add more after beta; owners can also set a custom hex like in all three references):
- **Paper:** canvas `--canvas`, text `--ink`, buttons `--ink`. Default.
- **Midnight:** background `--ink`, elevated `--ink-elevated`, text `--canvas`.
- **Bright:** background `--surface`, text `--accent-ink`, buttons and focus `--accent`, secondary `#ff6100` (Jotform orange) used sparingly.

Dark mode for the dashboard: use the Midnight surfaces. Respect `prefers-color-scheme`.

## 3. Typography

| Role | Font | Why |
|---|---|---|
| UI and dashboard | **Inter** | Open substitute named in the Typeform extraction for TWK Lausanne |
| Form body copy (default) | **Work Sans** | Paperform uses it for long copy; it is an open font |
| Marketing display headlines only | **Playfair Display**, weight 400 | Open substitute named in the extraction for Tobias |
| Hindi and regional text | **Noto Sans Devanagari** (plus other Noto scripts later) | **[ours]**: India-first requirement |

Owners can pick a font in the theme editor from a curated Google Fonts list (Typeform offers curated fonts, Jotform a font selector).

**Marketing scale (Typeform extraction):** caption 14/1.2, body 16/1.49, body-lg 20/1.4, heading-sm 48/1.1, heading 64/1.1 with -1.98px tracking, display 80/1.0 with -0.96px tracking. Display serif at weight 400, never bold. Eyebrow labels: 14px, uppercase, wide tracking, `--eyebrow` color.

**App scale [ours]:** 12, 14, 16, 20, 24, 32. Body 16 on public forms (mobile readability), 14 in dense dashboard tables.

## 4. Spacing, shape, elevation

- Base unit **8px** (Typeform). Scale: 8, 16, 24, 32, 40, 48, 64.
- Radius (Typeform): buttons **12px**, cards **24px**, images **8px**, pills **80px**. No fully round or sharp buttons.
- Max page width 1536px on marketing, 720px for the public form column **[ours]**.
- **No box shadows.** Lift elements with surface contrast: white card on cream canvas, `--ink-elevated` on `--ink`.

## 5. Components

- **Primary button:** `--ink` fill, `--canvas` text, 12px radius, padding 8px 24px, 16px Inter. On dark surfaces: same, with a 1px `--canvas` border. (Typeform)
- **Secondary button:** transparent, `--ink` text, 1px `--border`.
- **Payment button:** primary style, label shows the amount, for example "Pay ₹499". (Paperform's price-on-button pattern.)
- **Inputs [ours]:** white fill, 1px `--border`, 12px radius, 48px height for touch, label above, focus ring in `--accent`.
- **Card:** 24px radius, white on canvas, no shadow, 24px padding.
- **Eyebrow label:** see typography. Only place the purple appears.
- **Progress:** thin bar at the top of the form; optional "N questions to go" text near the submit button (Paperform).
- **Toasts and empty states:** plain text on `--surface-alt`, one action each.

## 6. Key screens

**Builder (Paperform-style)**
Left: document canvas where you type and press `/` for fields. Right: live phone-width preview. Top bar: form name, Theme, Publish. Theme panel opens like Paperform's and Jotform's design panels: colors, fonts, layout, with changes visible immediately. Autosave.

**Public form**
Single centered column, `--canvas` background. Two layouts: **Page** (default, all questions scroll) and **One-at-a-time** (Typeform-style, large type, keyboard and swipe navigation, P2). Small footer badge on the free plan.

**Payment step**
Order summary card (items, quantity, discount, total) on white with 24px radius, then one primary Pay button showing the total. Razorpay Checkout draws the UPI app options, so we do not restyle them. Failure state: plain message plus "Try again". Success: receipt number and a short thank-you, no confetti.

**Dashboard**
Left nav on `--surface-alt`, content on `--canvas`. Responses table with a status pill (paid in `--success`, pending in `--warning`, failed in `--danger`). Empty state: "Create your first form" with the template gallery (Jotform-style use-case templates).

**Marketing site**
Alternate dark (`--ink`) and light (`--canvas`, `--surface-alt`) sections, never two of the same tone in a row (Typeform pattern). Each section: eyebrow, serif heading, 16px body, one CTA, one product visual in a 24px-radius container.

## 7. Motion and accessibility

- Motion is calm and supports a human feel: 150-250ms ease for transitions, no bouncing. Respect `prefers-reduced-motion`.
- WCAG AA contrast minimum. Do not rely on color alone for payment status; always include text.
- Every interactive element is keyboard operable with a visible focus ring. Touch targets at least 44px.
- Mobile first: design the public form and payment step at 360px width before desktop.

## 8. Do and don't

**Do**
- Use `--ink` instead of pure black for text and dark surfaces.
- Keep CTAs near-black; let one accent handle links and focus.
- Express depth with surface contrast.
- Keep the first form creatable in under 3 minutes.

**Don't**
- Don't copy any competitor's logo, mascot, wording or imagery.
- Don't use proprietary fonts (Tobias, TWK Lausanne, BR Sonoma).
- Don't use the purple eyebrow color on buttons or links.
- Don't add shadows, pill buttons or heavy-weight headlines.
- Don't stack bright colors; one accent at a time.

## 9. Open decisions

1. Our own brand accent color to replace the `--accent` placeholder.
2. Product name and logo.
3. Remaining 3 theme presets after beta feedback.
4. Final check of each competitor's live UI to fill the gaps in section 0.
