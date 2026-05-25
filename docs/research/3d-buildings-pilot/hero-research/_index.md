# Hero research index — Business Bay overnight v3

Sites attempted and outcome (founder's suggested research list):

| Site | Outcome |
|---|---|
| Wikipedia (en) | ✅ direct fetch via WebFetch — Vision Tower, Opera Grand, Executive Towers, Ubora Towers, Churchill Residence all returned good data |
| Wikipedia (commons) | ✅ for Millennium Tower silhouette + photo (already used in earlier session) |
| DuckDuckGo HTML search | ✅ works via `https://html.duckduckgo.com/html/?q=...` — used as Google replacement for finding architecture-domain URLs |
| ArchDaily | ⚠ pages exist but extract weakly — text summary doesn't include exact heights / shape descriptions; mostly photos which I cannot use without Read tool downloading |
| Koltay Facades | ❌ 403 |
| Zaha Hadid Architects (zaha-hadid.com) | ❌ 403 |
| Dewan Architects | partial — found via DDG search results |
| Skyscraper.media, Architizer | partial — found via DDG, useful snippets |
| skyscrapercenter.com / ctbuh.org | ❌ URLs require building IDs we don't have; no general search endpoint |
| emporis.com | ❌ defunct since 2023 |
| propsearch.ae, bayut, propertyfinder, dubizzle | ❌ JS-rendered, captcha — WebFetch cannot reach |
| omniyat.com (Opus developer) | partial — DDG result shows project page exists |
| damacproperties / emaar / meraas project pages | not attempted in this run (would need targeted URLs per project) |

Per-hero research notes (where deeper detail was found):

- [the-opus.md](the-opus.md) — Zaha Hadid 2019, two towers + curved void + fluid glass "melted ice"
- [vision-tower.md](vision-tower.md) — tvsdesign 2011, **bent / double-tilted glass façade** (NOT a flat slab)
- [churchill-tower.md](churchill-tower.md) — DAR 2010, Art Deco Chrysler-inspired stepped crown + "sailboat" silhouette
- [ubora-towers.md](ubora-towers.md) — Aedas / Bromberg 2010-11, exact coords from Wikipedia infobox

## Honest tooling gap that blocks 80 %

`WebFetch` returns text summaries from architecture pages but cannot:
1. Actually read facade photos (would need to download images first, then Read them image-by-image)
2. Crawl property-listing sites (JS-rendered)
3. Access skyscrapercenter / CTBUH without slug IDs
4. Do Google Image search (no API)

Even with deep research per building, the modelling step requires
hand-art to actually replicate per-building facades. Parametric ceiling
with research overrides remains ~60–65 %.
