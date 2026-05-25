# Vision Tower Dubai — research notes

**Architect:** tvsdesign + Dewan Architects (engineers).
**Developer:** Dubai Properties.
**Completion:** January 2011.
**Height:** **260 m** (OSM tagged 92 m — bug, patched via override).
**Floors:** 60 (Wikipedia says both 51 and 60; treat as 60).
**Use:** Commercial offices, 650,000 sq. ft. lettable.
**Location:** ~25.18821°N, 55.26388°E.

## Shape (key distinctive feature)

- **Bent glass façade** / **double tilted glass façade** — *Dewan, Architizer, Skyscraper.media*
- **"Holds a mirror to Dubai reflecting its elegance"** — *Dewan*
- Two tilted glass surfaces meeting in a curve (rather than a single flat slab).
- "Graceful glass forms" with internal LED illumination.

## v3 modelling approach

- Two parallelepipeds slightly tilted toward each other, sharing a meeting edge.
- Effective footprint ~50 × 35 m, height 260 m.
- Front (bent) face uses lighter / brighter glass.
- Rear face is conventional flat glazing.

Currently treated as straight slab (~50 % similarity). Adding the tilt
brings it up but the curved meeting edge needs ≥ 6 segments to look
right — adds geometry but stays well under triangle budget.

## Source URLs

- Skyscraper.media (lookup via DDG)
- ArchDaily (lookup via DDG)
- Dewan Architects portfolio (lookup via DDG)
