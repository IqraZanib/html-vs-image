# Region design packs

One folder per region whose partner has an **approved design set** — the look and
structure their teachers already know. A pack owns everything region-specific:

```
regions/<region>/
  theme.js     CSS overrides, applied AFTER the default theme (pure cascade —
               it can re-skin AND re-structure the anatomy: bands, tabs, strips)
  DESIGN.md    the design set itself: reference artifacts, section anatomy,
               palette, typography, template rules, review principles
  goldens/     (optional) visual-regression targets for this region
```

Selected by the content's `meta.region`. **No pack → the locked default theme
(RULES R26), unchanged.** Packs are independent by construction: nothing in one
region's folder can affect another region's render — the only shared code is the
generic renderer, which packs must not modify.

Structure that CSS cannot express (a fundamentally different DOM) is the ONE
extension point to negotiate in RULES.md before building — so far every approved
design (Yemen's guide anatomy included) has been reachable with template order +
cascade alone.
