# PBR material cheat-sheet — Dubai architectural palette

Companion to `docs/art/ARTIST_PLAYBOOK.md` §3.2. Drop-in factor values for the 20 materials ZAAHI building deliveries use most.

All values are for glTF 2.0 metallic-roughness PBR. baseColorFactor is linear RGB in [0,1]. Hex colour is the sRGB equivalent, for reference in the authoring tool.

Sources: physicallybased.info (retrieved 2026-04-24) where the database has entries; otherwise community-consensus approximations. Values are starting points — tune per project.

---

## Glass family

| ID | baseColor | sRGB hex | metallic | roughness | alphaMode | Extensions | Notes |
|---|---|---|---|---|---|---|---|
| GLASS_CLEAR | 0.95, 0.95, 0.98 | #F1F1F5 | 0.0 | 0.05 | OPAQUE | — | Default curtain wall. Cheap, reads well. |
| GLASS_TINTED_GREEN | 0.76, 0.88, 0.82 | #C3E0D1 | 0.0 | 0.07 | OPAQUE | — | Classic Dubai office tower tint. |
| GLASS_TINTED_BLUE | 0.72, 0.82, 0.92 | #B7D1EB | 0.0 | 0.07 | OPAQUE | — | |
| GLASS_BRONZE | 0.80, 0.70, 0.55 | #CCB28C | 0.0 | 0.08 | OPAQUE | — | Reflective bronze — many older Dubai towers. |
| GLASS_REFLECTIVE | 0.85, 0.85, 0.88 | #D8D8DF | 0.0 | 0.10 | OPAQUE | — | One-way mirrored finish. |
| GLASS_TRANSMISSION_CLEAR | 1.00, 1.00, 1.00 | #FFFFFF | 0.0 | 0.03 | OPAQUE | KHR_materials_transmission(0.9) + KHR_materials_ior(1.5) | Use only for featured landmarks — physical transmission is expensive. |

## Metals

| ID | baseColor | sRGB hex | metallic | roughness | Notes |
|---|---|---|---|---|---|
| ALUM_POLISHED | 0.916, 0.923, 0.924 | #E9EBEB | 1.0 | 0.15 | physicallybased.info canonical. |
| ALUM_BRUSHED | 0.913, 0.921, 0.925 | #E8EBEC | 1.0 | 0.55 | Same base, higher roughness. |
| ALUM_ANODISED_BLACK | 0.05, 0.05, 0.05 | #0D0D0D | 1.0 | 0.35 | Modern dark accent. |
| ALUM_ANODISED_BRONZE | 0.40, 0.28, 0.18 | #66472E | 1.0 | 0.40 | |
| STEEL_STAINLESS | 0.669, 0.639, 0.598 | #AAA398 | 1.0 | 0.20 | physicallybased.info canonical. |
| STEEL_PAINTED_WHITE | 0.88, 0.88, 0.86 | #E0E0DC | 0.0 | 0.50 | **metallic=0** — the paint is the visible surface. |
| COPPER | 0.932, 0.623, 0.522 | #EE9F85 | 1.0 | 0.25 | Sparingly — accents, railings, rooftop vents. |
| GOLD_TRIM | 1.00, 0.78, 0.34 | #FFC757 | 1.0 | 0.25 | Burj Al Arab / Address Residences territory. |
| ZINC_ROOF | 0.70, 0.70, 0.68 | #B3B3AE | 1.0 | 0.45 | Common architectural zinc finish. |

## Stone / masonry

| ID | baseColor | sRGB hex | metallic | roughness | Notes |
|---|---|---|---|---|---|
| CONCRETE_POLISHED | 0.51, 0.51, 0.51 | #828282 | 0.0 | 0.55 | physicallybased.info canonical. |
| CONCRETE_RAW | 0.45, 0.43, 0.40 | #736E66 | 0.0 | 0.85 | Brutalist / structural visible. |
| MARBLE_POLISHED | 0.830, 0.791, 0.753 | #D4CAC0 | 0.0 | 0.25 | physicallybased.info canonical. |
| LIMESTONE | 0.72, 0.68, 0.59 | #B7AD97 | 0.0 | 0.75 | Dubai vernacular / heritage. |
| GRANITE_BLACK | 0.10, 0.09, 0.09 | #181616 | 0.0 | 0.30 | Polished, deep. |
| GRANITE_GREY | 0.35, 0.33, 0.32 | #5A5452 | 0.0 | 0.30 | |
| BRICK_RED | 0.262, 0.095, 0.061 | #431810 | 0.0 | 0.85 | physicallybased.info canonical. |
| TERRACOTTA | 0.555, 0.212, 0.110 | #8E361C | 0.0 | 0.65 | physicallybased.info canonical. |

## Wood

| ID | baseColor | sRGB hex | metallic | roughness | Notes |
|---|---|---|---|---|---|
| WOOD_OAK_RAW | 0.34, 0.22, 0.13 | #573821 | 0.0 | 0.80 | |
| WOOD_OAK_LACQUERED | 0.34, 0.22, 0.13 | #573821 | 0.0 | 0.30 | Same base, glossier. |
| WOOD_WALNUT | 0.20, 0.12, 0.06 | #331E0F | 0.0 | 0.65 | Dark. |
| WOOD_PINE | 0.70, 0.50, 0.30 | #B3804C | 0.0 | 0.70 | Light / pale. |
| WOOD_TEAK | 0.45, 0.30, 0.15 | #734C26 | 0.0 | 0.55 | |

## Paint / plaster

| ID | baseColor | sRGB hex | metallic | roughness | Notes |
|---|---|---|---|---|---|
| PAINT_WHITE_MATTE | 0.88, 0.88, 0.86 | #E0E0DC | 0.0 | 0.85 | Don't use pure 1.0 white. |
| PAINT_WHITE_SATIN | 0.88, 0.88, 0.86 | #E0E0DC | 0.0 | 0.50 | |
| PAINT_WHITE_GLOSS | 0.88, 0.88, 0.86 | #E0E0DC | 0.0 | 0.20 | |
| PAINT_SAND_WARM | 0.82, 0.72, 0.55 | #D0B78C | 0.0 | 0.70 | Desert-tone façade — common on mid-range Dubai builds. |
| DRYWALL_GYPSUM | 0.80, 0.80, 0.78 | #CCCCC6 | 0.0 | 0.90 | Interior walls if ever exposed. |

## Tile / ceramic

| ID | baseColor | sRGB hex | metallic | roughness | Notes |
|---|---|---|---|---|---|
| TILE_CERAMIC_WHITE_GLOSS | 0.95, 0.95, 0.95 | #F2F2F2 | 0.0 | 0.10 | |
| TILE_CERAMIC_MATTE | 0.80, 0.78, 0.75 | #CCC7BF | 0.0 | 0.65 | |
| TILE_PORCELAIN_BLACK | 0.06, 0.06, 0.06 | #0F0F0F | 0.0 | 0.15 | Modern minimalist. |

## Ground / site

| ID | baseColor | sRGB hex | metallic | roughness | Notes |
|---|---|---|---|---|---|
| ASPHALT | 0.06, 0.06, 0.06 | #0F0F0F | 0.0 | 0.95 | Near-black. |
| CONCRETE_SIDEWALK | 0.55, 0.55, 0.53 | #8C8C87 | 0.0 | 0.80 | |
| SAND | 0.82, 0.72, 0.55 | #D0B78C | 0.0 | 0.85 | For site context. |
| GRASS | 0.30, 0.50, 0.20 | #4C8033 | 0.0 | 0.65 | Manicured — not for wild desert. |

## Emissive surfaces (night views + signage)

| ID | baseColor | emissive | emissiveFactor | Notes |
|---|---|---|---|---|
| SIGN_LED_WHITE | 0.95, 0.95, 0.98 | same colour map | 0.7, 0.7, 0.9 | Cool-white LED signage. |
| SIGN_LED_BRANDED | brand hue | brand hue | 1.0, 1.0, 1.0 | Combined with `emissiveStrength` extension if dimming needed. |
| WINDOW_INTERIOR_GLOW | 0.95, 0.85, 0.70 | 0.40, 0.35, 0.25 | — | Subtle warm amber for aggregate interior-lighting read. |
| STREETLIGHT | 0.95, 0.90, 0.80 | 0.95, 0.90, 0.80 | 1.0, 1.0, 1.0 | Sodium-lamp feel; keep away from blue-white LED. |

---

## How to use

1. In Blender: select the Principled BSDF, paste the baseColor values into the Base Color field (convert 0-1 floats to 0-255 or use sRGB hex), set Metallic and Roughness sliders.
2. In 3ds Max + Babylon exporter: Physical Material node, same fields.
3. If you're authoring with textures, the texture's *colour* multiplies these factors — keep the factor at neutral (1,1,1) and let the texture carry the information, OR tint with the factor for subtle variation.

## Sanity-check rule

- **Metallic stays 0 or 1.** Almost never in-between, except at bilinear-interpolated map-edge pixels.
- **Roughness rarely below 0.05 or above 0.95.** Below 0.05 = flawless mirror; above 0.95 = chalk. Both rare on real architecture.
- **baseColor rarely below 0.04 or above 0.95.** Below 0.04 absorbs too much light (blacker than real tar); above 0.95 is whiter than real white paint.
