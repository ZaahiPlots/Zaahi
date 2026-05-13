# Private Plot Vault — TL;DR

**Status:** spec draft 2026-05-13. Not yet approved. No code changes proposed.

## In one paragraph

Brokers and developers in Dubai keep their daily plot pipeline in WhatsApp threads and Excel. ZAAHI today only offers one mode for plot data — Public Listings, verified, visible to everyone. That's good for sellers ready to transact, but it's wrong for the daily reality of an active broker: they're tracking 50–500 plots in various stages, most of which they don't want public. Private Plot Vault adds a second mode at upload time: keep the plot to yourself, with the same map / feasibility / docs tooling, plus optional point-to-point sharing with named users. The goal is to turn ZAAHI into the broker's daily tool — the one they open every morning instead of WhatsApp + Excel.

## Three docs in this folder

| File | Purpose | Audience |
|---|---|---|
| **`README.md`** | This file. TL;DR + decisions tee-up. | 2-minute scan |
| **`spec.md`** | Full design — concept assessment, data model, permissions, API surface, UX flow, map rendering, phasing, risks. | 20-30 minutes deep read |
| **`decisions.md`** | The 5 decisions only founder can make, framed with trade-offs. | 10 minutes |

## My honest assessment of the concept

**Solid. Recommend proceeding with MVP.** The pain (WhatsApp + Excel) is real, the moat opportunity (no competitor offers this in the Dubai market) is real, and the existing ZAAHI architecture absorbs Vault cleanly without disturbing the Public Listings flow. One framing nuance flagged in spec.md §1 — "Vault" externally for the trust signal, but internally model it as a **pipeline** (Lead → Negotiation → Signed → Listed) because that's what brokers actually live in. Dual-framing buys the marketing trust word AND the operational reality.

One real concern: **Vault could cannibalize Public Listings** if brokers default to private. Mitigated by (a) the platform fee (0.25%) applying equally on Vault→Deal conversions, (b) friction-free Promote-to-Public, and (c) pricing tilted to make Vault more expensive at scale than the free Public Listings flow. See spec.md §10.

## Master Tree placement (frozen — addition not modification)

The 12 blocks A-L stay frozen. Private Plot Vault is a **new module under Block A (Assets)** — call it **A.10 Private Asset Vault** — with explicit interlocks into B (broker workflows), C (deal engine for promote-to-deal), G (PDPL for selective sharing), and J (broker onboarding hook for Phase 2). The module is internally **pipeline-stage-aware** which is what makes it CRM-shaped without needing a separate "CRM" block.

## Top decisions for founder (full version in `decisions.md`)

1. **Identity / uniqueness model.** Today `@@unique([emirate, district, plotNumber])` on `Parcel` blocks two users from holding the same plot number. Vault breaks this — three brokers may all be working the same 7-digit DDA plot privately. Two clean options: (A) keep the constraint, model Vault as a **separate `VaultEntry`** table that references the public Parcel by plot number; (B) drop the constraint and add `@@unique([ownerId, emirate, district, plotNumber])` so each user gets their own row. **I recommend A.** Reason: keeps Public Listings table clean, allows multiple users to track the same plot without write conflicts, makes "Promote to Public" an explicit operation. See spec.md §3.
2. **Visibility model:** binary (private / public) or three-tier (private / shared / public)? I recommend **three-tier**, with "shared" as a join state (the entry is private, but shared with N named users). See spec.md §4.
3. **Sharing — account-required or link-based?** Account-required is simpler + safer + cohort-aligned. Link-based is more viral. I recommend **account-required for MVP, link-based as Phase 2.3 polish.**
4. **Pricing model.** Four options laid out in spec.md §9 and decisions.md. My recommendation: **freemium with AI features as paid** — Vault itself is free up to N plots, AI/CRM features (smart categorization, prospect scoring, market alerts) are paid. Aligns with Aigerim/Highgrove's "CRM with AI" ask, monetizes the moat, keeps onboarding friction near zero.
5. **MVP scope.** Spec.md §11 proposes a 2-3-week MVP (upload to vault, see on map, basic list view, simple share with view-only permission). Phase 2.2 adds pipeline stages. Phase 2.3 adds AI. Founder should confirm what counts as MVP.

## Estimated complexity

- **MVP (Phase 2.1):** ~10–14 working days. New table, visibility field on Parcel (or separate model per Decision 1), 5–7 new API routes, vault map layer, vault list page, upload mode toggle in AddPlotModal, basic share modal + revoke. No AI, no pipeline stages.
- **Phase 2.2 (pipeline stages, notifications, permissions):** ~7–10 days.
- **Phase 2.3 (AI features, team accounts):** ~3–4 weeks. The AI piece is the longest tail and the most uncertain — depends on which AI provider, whether features are inline LLM calls or batch enrichment.
- **Phase 2.4 (mobile pipeline app):** out of scope for this spec, separate planning.

Total to ship the full vision: ~6–8 weeks of focused work, MVP usable in week 2.

## What this spec does NOT decide

- Exact UI wireframes — covered conceptually in spec.md §6, but pixel-level designs are post-decision.
- AI provider / model choice — depends on Decision 4 + budget; addressed at high level in spec.md §11.
- Whether Vault should support non-DDA / non-Dubai plots in MVP — spec.md §7 covers the constraints, founder picks the scope.
- Concrete migration timeline — bound to MVP date.

## Next step

Founder reads spec.md + decisions.md, picks A/B on each of the 5 decisions, then I can write the implementation spec (`docs/specs/phase-2/private-plot-vault/implementation-plan.md`) with concrete schema diff, migration SQL, route signatures, and component-level tasks. That's a separate ~2-hour writing job, gated on these decisions.
