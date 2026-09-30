# ICT (NIETE) fixtures

Real ICT lesson-plan inputs. Every file is copied unchanged; re-copy rather than edit.

| File | What it is | Source |
|---|---|---|
| `niete_v9_gate_base.lp.json` | A complete schema-3.0 lp_doc from ICT's grades 6–12 pipeline: G9 Mathematics, "Multiplying two 2×2 matrices" (pp. 24–25). It is the base document NIETE-Rumi's own v9 gate tests are built on. | [Orenda-Project/NIETE-Rumi](https://github.com/Orenda-Project/NIETE-Rumi) `tests/lp612/__fixtures__/v9_gate_base.lp.json` @ `29877ac2e5851c8d4be92b8b3cc2e9e33395e964` |
| `niete_prod_2026-09-06_halicin_molecule.json` | Not an lp_doc. It holds two molecule diagram specs recorded on ICT **production** on 2026-09-06, plus the exact SVG bytes ICT's diagram engine produced for them. Used to prove our vendored engine draws identically. | same repo, `tests/lp612/__fixtures__/prod_2026-09-06_halicin_molecule.json` @ the same commit |
| `g7_science_photosynthesis.lp.json`, `g9_urdu_smoke.lp.json` | ICT's two sample lessons (schema 2.0), from the curriculum-baked-lesson-plans skill. | agent-skills-taleemabad `skills/curriculum-baked-lesson-plans/scripts/lp_html/samples/` @ `813bea9` |

NIETE-Rumi is public and Apache-2.0 licensed.
