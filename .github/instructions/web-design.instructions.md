---
applyTo: 'apps/web/**'
---

# Angalia — web design instructions

Binding rules for anything built under `apps/web`. Written because the default output of
an AI coding assistant is a gradient hero, three rounded cards, a green/amber/red badge and
an emoji, and this product has a specific reason not to look like that.

## What the product is

**Angalia** — Swahili for _look_ / _check_ / _watch out_. It reads a cosmetic ingredient
label and tells someone what the EU regulation says about it, for their skin.

Its distinguishing property is that **it refuses to give a confident all-clear.** The median
real label carries ten ingredients the corpus cannot identify. Any design that hides that
figure is working against the engineering underneath it.

## The core tension, and how it resolves

The visual references are marketing layouts — full-bleed bands, large hero type, imagery as
structure, scroll rhythm. The working screen is a tool used by someone standing in a shop
holding a bottle. Those are not the same job.

**Resolve it by surface, not by compromise:**

| Surface             | Language                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| Landing / method    | Full-bleed bands, large type, real imagery, scroll rhythm, stat counters |
| The tool (the flow) | Calm, dense, clinical. No decoration. Content is the interface.          |

The landing page argues the rigour. The tool delivers it. Never let the tool's screens
inherit marketing furniture, and never let the landing page be a bare form.

## Tone of voice — clinical and regulatory

The engine already writes in this register. Match it; do not soften it.

> Linalool is a declarable fragrance allergen, and you reported sensitive skin.
> Tagetes Minuta Flower Extract was not recognised, so it could not be checked.

- Name the instrument. `Annex III entry 84` belongs on screen, not hidden behind a tooltip.
- No exclamation marks. No "Oops". No "Great news!". No reassurance the data cannot support.
- Say _could not be checked_, never _probably fine_.
- Numbers are stated, not rounded away: "12 of 38 ingredients identified".

## Rules the results screen must obey

1. **Lead with the annotated ingredient list.** The user pasted a list; give it back to
   them marked up in place — flagged, on record, clean, or unrecognised — in the order
   printed. The tier word is a consequence shown alongside, not a badge that replaces the
   detail.
2. **Coverage gets equal billing with the verdict.** Identified-vs-total sits at the same
   visual weight as the tier, always on screen, never behind a disclosure.
3. **Every flag shows its citation.** The regulation reference is part of the claim.
4. **What is on record is not the same as what applies to this person.** An ingredient can
   carry a tag and trigger no rule. Show the tag, and say plainly that nothing fired.
5. **Unrecognised names are a distinct state**, visually separate from flagged, on-record
   and clean. They are not a warning and not an absence.
6. **Never a bare green tick.** `Safe` means "nothing we identified triggered a rule", and
   the screen must still say how much was identified.

## Visual character — soft, cosmetic-adjacent, not clinical-looking

The _tone_ is clinical; the _surface_ is not. Muted, warm, low-saturation. It should feel
closer to a skincare brand than to a hospital system, while never sounding like one.

- **Colour**: a restrained warm neutral base. Tier colours are the only saturated elements
  and must be muted, not traffic-light. Unrecognised uses a neutral, never yellow — but a
  neutral bright enough to read as a state rather than as a missing one.
- **Type**: one serif for headings and long-form, one grotesque for UI and data. INCI names
  and regulation references set in the UI face, never the serif. Fonts are **self-hosted**;
  `next/font/google` fetches at build time and has already broken the build once.
- **Shape**: generous spacing, restrained radii, hairline rules rather than heavy borders.

## Motion

Scroll reveals are permitted on the **landing page only**. The tool's screens get motion
only to show a state change. Anything that moves must meet all of these:

- **Compositor-only properties.** `opacity` and `translate`, nothing else. Note that
  Tailwind v4 emits the independent `translate` property, so a transition list naming
  `transform` will leave the movement snapping while only the fade animates.
- **Big enough to beat the scroll.** A reveal competes with the gesture that triggered it:
  at an ordinary rate the page travels several hundred pixels while the reveal runs, so a
  short drift is read as part of the scroll and not seen at all. 40 px over 620 ms
  registers; 20 px over 380 ms was invisible to the naked eye and shipped that way once.
- **Revealed where the eye is, reset only once gone.** Firing at the viewport edge puts
  the movement in peripheral vision. Enter on a line inset a fifth at each end; leave the
  reset on the full viewport, so nothing ever fades out while part of it is still on
  screen. That takes two observers — both still shared across every block, still never a
  scroll listener, and never one observer per element.
- **Content is never hidden without JavaScript.** Render visible, let the observer hide;
  the first observation snaps rather than transitions.
- **Bidirectional and direction-aware.** Re-read the origin on the way in — direction
  recorded on the way out goes stale whenever the page moves without crossing the element.
- **`prefers-reduced-motion: reduce` disables it entirely**, leaving everything visible.
- **Stagger capped near 150 ms**, and never animate what is already on screen at load.
- Measure before calling it done: zero long tasks and zero layout shift under a hard
  scroll, and trace where on screen the fade actually starts, passes half, and finishes.

## Both mobile and desktop, camera on both

All four moments of use are in scope — shop aisle, at home, after a reaction, routine
research. Consequences:

- Mobile is the shop-aisle case and must support **camera capture for OCR**; desktop must
  support it too where a webcam exists. Paste and manual entry are always available.
- Never gate the tool behind sign-in. The skin profile lives in local state first.
- Check long INCI names at 390 px. They wrap, and a highlight sliced across the break reads
  as a rendering fault.

## Photography

Permitted in the opening and closing bands only, never beside a figure or a verdict. A
product shot next to a coverage number is selling; the middle of the page argues in type.

- **Toned into the palette, per frame.** Nothing arrives untreated, and `saturate` is set
  per image rather than shared: measured across the frame, the shore photograph still
  leaves 10% of its pixels cooler than neutral at 0.55 and none at all at 0.3, while the
  marble one is warm to begin with and only drains if pulled that far. Treated, both sit
  at a chroma of 7–12, between `shell` at 8 and `line` at 20. Nothing may read cooler than
  neutral — the only cool hue in this system is `safe` green, and it carries a meaning.
- **Type keeps the contrast it has elsewhere.** Measure the fifth-percentile luminance
  under every glyph rectangle, not the block box: a full-width `<p>` reports the
  background beside its text and will tell you the hero fails when it does not. The bar is
  the ratio that text already has on plain surface. A photograph may cost a fraction of a
  point, not a grade.
- **The scrim is a legibility device, not decoration.** Side-weighted where the type
  occupies one side, flat where it spans the frame. This is not a gradient background,
  which stays banned.
- **Source at 2400 px or wider.** A full-bleed band spans about 2880 device pixels on an
  ordinary laptop. Nothing sharpens detail that was never captured.
- **Licensed, and recorded as licensed.** This work gets submitted.

## Banned by default

Gradient hero backgrounds, which a scrim over a photograph is not · three-up feature card grids · emoji in product copy ·
green tick / red cross iconography · generic stock photography of women applying cream ·
"AI-powered" anywhere · chat interfaces · skeleton shimmer as decoration ·
counters that animate themselves into view · parallax ·
tooltips carrying information the user needs to make the decision.

## Accessibility

WCAG conformance is not a formal target for this project. Keep text legible and tap targets
real anyway — Phase 7 is a usability cycle and this is where it would otherwise surface.
Never encode a tier in colour alone; the word is always present.
