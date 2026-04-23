// Community-name canonicaliser for the Land Monitor matcher.
//
// Brokers use abbreviations, misspellings, and nicknames. Match rows to a
// canonical label so "JVC", "Jumeirah Village Circle", "jumeirah-village"
// all collapse onto the same node.
//
// Source list: the 50 most-advertised Dubai communities from brokers'
// common parlance, cross-referenced with DDA district names. Expand in the
// admin panel (Spec 03) once that ships.

type Canonical = string;

const ALIAS_TO_CANONICAL: Array<[RegExp, Canonical]> = [
  // Downtown / DIFC / Business Bay core
  [/\bdowntown(\s+dubai)?\b/i, "Downtown Dubai"],
  [/\bdt\s+dubai\b|\bdtd\b/i, "Downtown Dubai"],
  [/\bdifc\b/i, "DIFC"],
  [/\bbusiness\s+bay\b|\bbb\b/i, "Business Bay"],
  // Marina / JBR
  [/\bdubai\s+marina\b|\bmarina\b/i, "Dubai Marina"],
  [/\bjbr\b|\bjumeirah\s+beach\s+residence\b/i, "JBR"],
  // Palm / Emirates Hills / Meadows / Springs / Arabian Ranches
  [/\bpalm\s+jumeirah\b|\bthe\s+palm\b/i, "Palm Jumeirah"],
  [/\bemirates\s+hills\b/i, "Emirates Hills"],
  [/\bmeadows\b/i, "The Meadows"],
  [/\bsprings\b/i, "The Springs"],
  [/\barabian\s+ranches\b/i, "Arabian Ranches"],
  // JVC / JVT / Al Barsha / Al Furjan / Al Jaddaf
  [/\bjvc\b|\bjumeirah\s+village\s+circle\b/i, "Jumeirah Village Circle"],
  [/\bjvt\b|\bjumeirah\s+village\s+triangle\b/i, "Jumeirah Village Triangle"],
  [/\bal\s+barsha\b|\bbarsha\b/i, "Al Barsha"],
  [/\bal\s+furjan\b|\bfurjan\b/i, "Al Furjan"],
  [/\bal\s+jaddaf\b|\bjaddaf\b/i, "Al Jaddaf"],
  // Meydan / MBR / Dubai South / Dubai Hills / DAMAC Hills
  [/\bmeydan\b/i, "Meydan"],
  [/\bmbr\s+city\b|\bmohammed\s+bin\s+rashid\s+city\b/i, "MBR City"],
  [/\bdubai\s+south\b|\bdwc\b/i, "Dubai South"],
  [/\bdubai\s+hills(\s+estate)?\b/i, "Dubai Hills Estate"],
  [/\bdamac\s+hills(\s*2)?\b|\bakoya\b/i, "DAMAC Hills"],
  // Dubai Creek Harbour / Dubai Islands / Dubai Silicon Oasis / Discovery Gardens
  [/\bdubai\s+creek\s+harbou?r\b|\bdch\b/i, "Dubai Creek Harbour"],
  [/\bdubai\s+islands\b/i, "Dubai Islands"],
  [/\bdso\b|\bdubai\s+silicon\s+oasis\b/i, "Dubai Silicon Oasis"],
  [/\bdiscovery\s+gardens\b/i, "Discovery Gardens"],
  // Tecom / Internet City / Media City / Knowledge Village / Production City / Sports City
  [/\btecom\b/i, "TECOM"],
  [/\binternet\s+city\b/i, "Internet City"],
  [/\bmedia\s+city\b/i, "Media City"],
  [/\bknowledge\s+village\b/i, "Knowledge Village"],
  [/\bimpz\b|\bproduction\s+city\b/i, "Production City"],
  [/\bdsc\b|\bsports\s+city\b/i, "Sports City"],
  // Motor City / Studio City / Jebel Ali / Palm Jebel Ali
  [/\bmotor\s+city\b/i, "Motor City"],
  [/\bstudio\s+city\b/i, "Studio City"],
  [/\bjebel\s+ali\b/i, "Jebel Ali"],
  [/\bpalm\s+jebel\s+ali\b/i, "Palm Jebel Ali"],
  // Deira / Bur Dubai / Satwa / Jumeirah
  [/\bdeira\b/i, "Deira"],
  [/\bbur\s+dubai\b/i, "Bur Dubai"],
  [/\bsatwa\b/i, "Al Satwa"],
  [/\bjumeirah\b/i, "Jumeirah"],
  // Al Quoz / Al Qusais / Al Nahda / Al Warsan / Al Warqa
  [/\bal\s+quoz\b/i, "Al Quoz"],
  [/\bal\s+qusais\b/i, "Al Qusais"],
  [/\bal\s+nahda\b/i, "Al Nahda"],
  [/\bal\s+warsan\b/i, "Al Warsan"],
  [/\bal\s+warqa\b/i, "Al Warqa"],
  // Mirdif / Muhaisnah / Al Khawaneej / Al Aweer / Al Awir
  [/\bmirdif\b/i, "Mirdif"],
  [/\bmuhaisnah\b/i, "Muhaisnah"],
  [/\bal\s+khawaneej\b/i, "Al Khawaneej"],
  [/\bal\s+aweer\b|\bal\s+awir\b/i, "Al Aweer"],
  // Hessyan / Saih Shuaib / Hatta — peripheral land blocks, still advertised
  [/\bhessyan\b/i, "Hessyan"],
  [/\bsaih\s+shuaib\b/i, "Saih Shuaib"],
  [/\bhatta\b/i, "Hatta"],
];

/**
 * Normalises a free-text community reference ("DT", "jvc", "palm jumeirah")
 * into a canonical label ("Downtown Dubai", "Jumeirah Village Circle").
 * Returns null if no alias matches.
 */
export function canonicaliseCommunity(input: string | null | undefined): string | null {
  if (!input) return null;
  for (const [pattern, canon] of ALIAS_TO_CANONICAL) {
    if (pattern.test(input)) return canon;
  }
  return null;
}

/**
 * Returns the full list of canonical community labels — used by the matcher
 * to fuzzy-match against DDA property records' AREA_EN column.
 */
export function allCanonicalCommunities(): string[] {
  return Array.from(new Set(ALIAS_TO_CANONICAL.map(([, c]) => c)));
}
