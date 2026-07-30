# lp-render (lesson-plan code renderer)

Standalone module that renders lesson-plan JSON to an A4 PDF buffer via HTML/CSS + SVG + Playwright.

See **[lp-render/README.md](lp-render/README.md)** and the design spec at
**[docs/superpowers/specs/2026-07-25-lp-render-module-design.md](docs/superpowers/specs/2026-07-25-lp-render-module-design.md)**.

Image sourcing/generation is governed by
**[docs/image-sourcing-guidelines.md](docs/image-sourcing-guidelines.md)** (v1). The module
enforces the relevance/no-decoration rules today; the real-photo sourcing layer is spec'd
there but not yet built (see its status table).
