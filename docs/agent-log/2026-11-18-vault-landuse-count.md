# 2026-11-18 — polluted land-use count (read-only, production)

Run by founder instruction, via existing `DATABASE_URL` (Supabase pooler). Every statement ran inside `BEGIN READ ONLY … ROLLBACK`; SELECT only. Table/column names checked against `prisma/schema.prisma` (no `@@map`: `"VaultEntry"."landUse"`, `"AffectionPlan"."landUseMix"`). Pattern: `~* '\s+Setbacks\s+Side\s+Building'`.

| Check | Result |
|---|---|
| VaultEntry rows matching (of 372) | **0** (also 0 for the looser `~* 'setback'`) |
| AffectionPlan rows matching (of 469) | **3** |

Polluted AffectionPlan rows (all `category` of the first landUseMix item):

| id | plotNumber | fetchedAt | starts with |
|---|---|---|---|
| cmvr3edit000104i4jlnqd3yl | 6740197 | 2026-10-27 | COMMERCIAL : OFFICES, SHOPPING CENTER Setbacks … |
| cmw1wgrxg000104js84hr3yfi | 6488667 | 2026-11-04 | RESIDENTIAL : APARTMENT Setbacks … |
| cmwmfvoiw000108l86orrbkph | 3720253 | 2026-11-18 | COMMERCIAL : OFFICES, RETAIL HOSPITALITY : HOTEL, … Setbacks … |

Consequences
- No VaultEntry cleanup needed; the earlier stored-lookup trim kept entry `landUse` clean. The cleanup scope shrinks to 3 AffectionPlan rows (the vault-entry UPDATE in the previous report is unnecessary).
- Finding: the stored 3720253 string has **no `/` separators** between groups. The first version of the fix (split on `/` and ` - `) returned COMMERCIAL for it. Fixed in `deriveLandUse` (category header = last word before each `:`), with a test using that exact stored form.
- Proposed cleanup (NOT run): for those 3 ids, `UPDATE "AffectionPlan" SET "landUseMix" = <jsonb with category cut at "Setbacks Side Building">` via a script using `stripSetbackTail`; setbacks are stored in their own column. Needs founder go-ahead.
