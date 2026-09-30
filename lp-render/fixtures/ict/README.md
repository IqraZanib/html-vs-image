# ICT (NIETE) fixtures

Real ICT lesson-plan inputs. Every file is copied unchanged; re-copy rather than edit.

| File | What it is | Source |
|---|---|---|
| `niete_v9_gate_base.lp.json` | A complete schema-3.0 lp_doc from ICT's grades 6–12 pipeline: G9 Mathematics, "Multiplying two 2×2 matrices" (pp. 24–25). It is the base document NIETE-Rumi's own v9 gate tests are built on. | [Orenda-Project/NIETE-Rumi](https://github.com/Orenda-Project/NIETE-Rumi) `tests/lp612/__fixtures__/v9_gate_base.lp.json` @ `29877ac2e5851c8d4be92b8b3cc2e9e33395e964` |
| `niete_prod_2026-09-06_halicin_molecule.json` | Not an lp_doc. It holds two molecule diagram specs recorded on ICT **production** on 2026-09-06, plus the exact SVG bytes ICT's diagram engine produced for them. Used to prove our vendored engine draws identically. | same repo, `tests/lp612/__fixtures__/prod_2026-09-06_halicin_molecule.json` @ the same commit |
| `authored_PK_G7_GSCI_CH1_PHOTOSYNTHESIS.lp.json` | A lesson written by ICT's lesson author from the real NBF textbook pages: G7 General Science, "Photosynthesis — how a leaf makes food" (pp. 11–12), English, schema 2.0. ICT's reviewer scored it 93 (pass), and it passes ICT's lint. | agent-skills-taleemabad `skills/curriculum-baked-lesson-plans/scripts/lp_author/samples/PK_G7_GSCI_CH1_PHOTOSYNTHESIS.json` @ `813bea9` |
| `authored_PK_G8_ENG_CH6_THE_BELLS_CLOSE_READING.lp.json` | A lesson written by ICT's lesson author: G8 English, "Close reading 'The Bells' — how sound words build terror" (pp. 127–129), English, schema 2.0. ICT's reviewer scored it 97 (pass); ICT's own lint still flags it (the sample's report says `lint_js_ok: false`), so it is a real authored lesson, not a polished one. | agent-skills-taleemabad `skills/curriculum-baked-lesson-plans/scripts/lp_author/samples/PK_G8_ENG_CH6_THE_BELLS_CLOSE_READING.json` @ `813bea9` |
| `authored_PK_G10_URDU_CH1_AKHLAQ_E_NABVI_BULAND_KHWANI.lp.json` | A lesson written by ICT's lesson author: G10 Urdu, «سبق ۱ — بلند خوانی، روانی اور لہجہ» (pp. 7–9), Urdu, schema 2.0, with an FBISE board weight. ICT's reviewer scored it 100 (pass) after a re-judge; ICT's own note calls the score high-variance and the prose thin, and marks it for human review. | same folder, `PK_G10_URDU_CH1_AKHLAQ_E_NABVI_BULAND_KHWANI.json` @ `813bea9` |
| `g7_science_photosynthesis.lp.json`, `g9_urdu_smoke.lp.json` | ICT's two sample lessons (schema 2.0), from the curriculum-baked-lesson-plans skill. | agent-skills-taleemabad `skills/curriculum-baked-lesson-plans/scripts/lp_html/samples/` @ `813bea9` |

NIETE-Rumi is public and Apache-2.0 licensed.
