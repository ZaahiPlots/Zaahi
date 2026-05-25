# The Opus Dubai — research notes

**Architect:** Zaha Hadid Architects (finished posthumously under Christos Passas after Hadid's death in 2016).
**Developer:** Omniyat.
**Completion:** 2019.
**Location:** Burj Khalifa district, Business Bay, on Dubai Water Canal. Approx 25.187°N, 55.276°E.
**Use:** Mixed — ME by Melia hotel + serviced apartments + offices + restaurants.

## Shape (the key distinctive feature)

- **20-storey cube** that "appears to hover above the ground" — *Wikipedia, Zaha Hadid stub*
- **Two structures forming a single cube, eroded by a fluid void** — *Wikipedia*
- **"Two 20-story towers connected by a bridge, with the inner facades forming a seamless fluid glass surface, resembling melted ice"** — *Koltay Facades (the facade specialist)*
- **"Glowing cube that floats above the ground"** — *WFM Media*
- **"Free-form void that sweeps through the heart of the building"** — *BSBG (lead consultant)*
- Floor area: 84,345 m² — *ArchDaily*

## Facade

- Inner faces of the void: free-form curved fluid glass, "melted ice" look.
- Outer cube: standard high-performance glazing.
- Facade engineering: Whitby Bird + Agnes Koltay Facades.

## v3 modelling approach (parametric, no booleans)

- Two parallel vertical slabs (the "two towers") sharing the outer cube boundary.
- The slabs are separated by a vertical gap (the void) running roughly along one axis.
- Bridge / closing structure at the top connecting them.
- Slight curve to the inner faces (approximated with 4 inset polygonal segments).
- Material: silver-white reflective glass for outer faces, lighter neutral for the bridge.

Real Opus has a CURVED void sweeping diagonally through the cube; our
parametric approximation uses a straight rectangular slot. Faithful
similarity ceiling for parametric model: ~55–65 %. True 80 % needs a
hand-modelled CURVED void in Blender GUI.

## Source URLs

- https://www.zaha-hadid.com/architecture/opus/ (officially Hadid; 403 to scrape)
- https://www.archdaily.com/922310/opus-hotel-zaha-hadid-architects
- https://bsbgroup.com/portfolio/opus
- https://koltayfacades.com/projects/opus (403 to scrape)
- https://opus.omniyat.com (developer)
