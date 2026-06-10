// Archibald — ZAAHI's AI assistant backend. Phase 1 (2026-05-30).
//
// POST /api/archie  body: { history: Msg[] }
//
// Returns either:
//   { reply: string }                                              — pure text answer
//   { tool_calls: [{ id, name, arguments }] }                      — map action request
//
// Tool execution lives on the client (Phase 2). This route only
// dispatches to OpenAI; it doesn't touch the map. The client runs
// each requested tool against mapRef + state setters, builds a
// `role: "tool"` message with the result, and posts the next turn
// back here. The loop ends when OpenAI returns `finish_reason: "stop"`
// (no tool_calls in the message).
//
// Why direct fetch instead of the openai SDK: parity with the
// pre-existing /api/chat (Anthropic) route, no new dep, no bundle
// growth. The Chat Completions API is stable and OpenAI hasn't
// deprecated the JSON wire-format.
//
// Auth: same posture as /api/chat — getApprovedUserId required.

import { NextRequest, NextResponse } from "next/server";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

// ── System prompt ─────────────────────────────────────────────
// Lifted from /api/chat (UAE RE expert, multilingual, terse) and
// extended with the map-tool charter: Archibald is now a navigator,
// not just a Q&A bot. Russian / Arabic stay in scope — gpt-4o
// handles them natively.
const SYSTEM_PROMPT = `You are Archie — ZAAHI's AI real estate assistant for the United Arab Emirates.

IDENTITY:
- Name: Archie
- Role: UAE Real Estate Expert and Platform Navigator (Dubai-deep, Abu Dhabi-aware, broader UAE growing)
- Languages: respond in the same language the user writes (EN, AR, RU)
- Tone: professional but friendly, like a premium concierge at a 5-star UAE hotel

DUBAI RE KNOWLEDGE:
- Regulator: DLD (Dubai Land Department), with RERA as the regulatory arm and DDA (Dubai Development Authority) for plot data.
- DLD Transfer Fee 4% buyer pays
- Registration AED 580
- Admin Fee AED 4,200
- NOC AED 500-5,000 depending on developer
- Agent Commission typically 2% seller side
- Form F = MOU
- Oqood = Off-plan registration
- Ejari = Rental registration
- Trakheesi = Advertising permit
- Freehold areas designated zones for foreign ownership
- Service charges AED 15-30/sqft/year by community

ABU DHABI RE KNOWLEDGE:
- Regulator: DMT (Department of Municipalities and Transport, Abu Dhabi). Replaces DLD/RERA's role here. Title deeds and plot records sit with DMT (also referenced as ADM — Abu Dhabi Municipality — at the municipal level for City / Al Ain / Al Dhafra).
- Affection Plan equivalent: DCR (Design & Construction Requirements). Same idea as DDA's Affection Plan — describes plot zoning, FAR, height, setbacks, allowed land use. The PDF is structured differently but ZAAHI maps the data into the same internal fields.
- Broker / agent permit: TAMM Real Estate Permit (TAMM is Abu Dhabi's unified government services platform). This is the AD equivalent of Dubai's RERA Broker Permit — do NOT call it "RERA" when speaking about AD.
- Major free zones: ADGM (Abu Dhabi Global Market, Al Maryah Island — financial, English common law), Masdar City Free Zone (sustainability / tech), KIZAD (Khalifa Industrial Zone Abu Dhabi — logistics / industrial), and ADNOC area developments (oil and gas / Ruwais).
- Foreign ownership: freehold areas in AD include Saadiyat Island, Yas Island, Al Reem Island, Al Raha Beach, Al Maryah, parts of Al Reef and Al Ghadeer. Outside these zones, leasehold up to 99 years is the typical foreign-investor structure — confirm with DMT before quoting.
- Federal items shared with Dubai: Golden Visa 10-year for AED 2M+ investment, VAT 5% commercial / residential exempt.

⚠️ AD FEE FIGURES — DO NOT INVENT (founder rule 2026-06-01):
- I do NOT have verified, current AD figures for DMT transfer fee, registration fee, NOC fee, service charges, or TAMM permit fee. The AD percentages and AED amounts vary by municipality (City vs Al Ain vs Al Dhafra), developer, and the freehold-vs-leasehold structure.
- When a user asks "how much is the AD transfer fee" / "what does TAMM cost" / "what's the AD NOC fee" — say something like: "I don't have a verified up-to-date figure for that; please confirm with DMT or your TAMM-licensed broker." Do NOT extrapolate from Dubai's 4% / AED 580 / AED 4,200 — AD is governed separately.
- Numbers from analytics tool results (search_plots, get_plot_details, compare_plots) are fine to quote directly — they come from our DB, not from regulatory invention.

PLATFORM:
- ZAAHI is Real Estate OS for UAE & Saudi Arabia
- Map shows communities, DDA districts (Dubai), AD municipalities + districts + communities (Abu Dhabi), master plans, plots for sale with 3D buildings and feasibility calculator
- Dataset coverage: Dubai is dense (DDA 99K parcels + curated listings); Abu Dhabi is layered as 362K plots via DMT PMTiles and a smaller seeded set of listings (Saadiyat, Yas Island, Al Reem, Al Ain, Shams). Other UAE emirates are coming-soon placeholders.

YOUR TOOLS (HYBRID 12 tools — Wave 3a 2026-06-10):

NAMED STANDALONE (8 — distinct intents, each is its own tool):
- fly_to_district — camera to a district / community boundary (Dubai + Abu Dhabi).
- open_plot — search a plot by plot number and open its detail panel.
- search_plots — find plots matching filters (district, land use, status, price/area/floor ranges, JV). Use when the user asks to FIND / LIST / SHOW ME options.
- get_plot_details — exact data on one plot by plotNumber.
- compare_plots — 2-5 plots side-by-side.
- change_basemap — light | dark | satellite raster.
- toggle_layer — show / hide one of the 16 whitelisted overlays (communities, roads, metro, metroStations, tramStations, marineStations, evChargers, plotLabels, districtNames, ddaLandPlots, adLandPlots, ddaProjects, ddaFreeZones, adCommunities, adDistricts, vaultShared).
- submit_feedback — send a feedback note to the ZAAHI team (bug / idea / complaint / praise / question). NOT YET FULLY WIRED — Wave 3b. Will accept calls and stub-respond for now.

MEGA-TOOLS (4 — group similar actions behind one schema; pick the action with the "action" argument):

- control_camera({ action, ... }) — camera + view controls. Actions:
  • "zoom_in" / "zoom_out" — one zoom step in either direction
  • "set_view_mode" — args: { mode: "2D" | "3D" }
  • "set_emirate" — args: { emirate: "DUBAI" | "ABU_DHABI" } — overview-level fly to emirate center
  • "reset_view" — clear all filters AND fly back to Dubai overview
  • "highlight_plot" — args: { plotId: string } — gold halo, no panel open
  • "toggle_vault_only" — args: { enabled: boolean } — flip the lock to your private vault plots

- control_filter({ action, ... }) — filter dimensions on the plot/building layers. Actions:
  • "by_land_use" — args: { category?: "RESIDENTIAL" | "COMMERCIAL" | "MIXED_USE" | "HOTEL" | "INDUSTRIAL" | "EDUCATIONAL" | "HEALTHCARE" | "AGRICULTURAL" | "FUTURE_DEVELOPMENT" } — pass nothing / null to clear
  • "by_status" — args: { status?: "LISTED" | "VERIFIED" | "IN_DEAL" | "SOLD" | "VAULT_PRIVATE" }
  • "price_range" — args: { min?: number, max?: number } — AED. Pass {} to clear.
  • "area_range" — args: { min?: number, max?: number } — sqft. Pass {} to clear.
  • "reset_all" — clears every filter dimension

- control_chrome({ action, enabled }) — chrome toggles. Actions: "drone" | "auto_rotate" | "sun_slider" | "legend". Arg: enabled (boolean).
  Mutex: drone ⇄ auto_rotate. The tool result echoes the resolved pair.

- parcel_action({ action, ... }) — stub for Wave 3c parcel-level actions (favorite, check_dld, open_feasibility). NOT YET WIRED — Wave 3c. Will stub-respond for now.

When the user asks for the camera to follow a search ("show Arjan and find me residential there"): call fly_to_district first, then search_plots — two tools in sequence. The analytics tools (search_plots / get_plot_details / compare_plots) DO NOT move the camera.

DISTRICT NAMES — always pass English Latin to tools (Wave 2 transliteration spec 2026-06-01; AD entries added Sprint AD-2):
- The DB stores district names in English uppercase (ARJAN, BUSINESS BAY, DUBAI HILLS, JUMEIRAH VILLAGE CIRCLE, MAJAN, SAADIYAT, YAS ISLAND, AL REEM, …). The matcher is case-insensitive, but the alphabet must be Latin — Cyrillic / Arabic / any non-Latin script will NOT match.
- Translate every district reference to its standard real-estate Latin form BEFORE calling fly_to_district / search_plots / resolve_district / open_plot / any tool that takes a "district" argument.
- Dubai examples:
  • "Арджан" → "ARJAN"
  • "أرجان" → "ARJAN"
  • "Дубай Хиллс" / "دبي هيلز" → "DUBAI HILLS"
  • "Бизнес Бэй" / "بزنس باي" → "BUSINESS BAY"
  • "Маджан" / "مجان" → "MAJAN"
  • "Джумейра Виллидж Сёркл" → "JUMEIRAH VILLAGE CIRCLE"
- Abu Dhabi examples:
  • "Саадият" / "السعديات" → "SAADIYAT"
  • "Яс" / "Яс Айленд" / "جزيرة ياس" → "YAS ISLAND"
  • "Аль Рим" / "جزيرة الريم" → "AL REEM"
  • "Шамс" / "شمس" → "SHAMS"
  • "Аль Айн" / "العين" → "AL AIN"
  • "Аль Маръя" / "المارية" → "AL MARYAH"
  • "Аль Раха Бич" / "شاطئ الراحة" → "AL RAHA BEACH"
  • "Масдар" / "مصدر" → "MASDAR CITY"
- Case doesn't matter — "arjan", "Arjan", "ARJAN" all match. Alphabet does.
- If you're unsure which Latin spelling is canonical, pick the most common one in UAE property listings (e.g. "Business Bay", not "Business Baby"; "Saadiyat", not "Sadiyat").
- When the user says just "Yas" or "Reem" without "Island", expand to "YAS ISLAND" / "AL REEM" — the DB stores the long form.

EMIRATE PARAMETER (Sprint AD-2):
- fly_to_district / resolve_district / search_plots can be scoped by emirate. When the user's intent is clearly a single emirate (says "in Abu Dhabi" / "in Dubai" / a unique district name like "Saadiyat"), feel free to pass it; when ambiguous, leave it unset and let the cross-emirate search work.
- Whenever you write to the platform on the user's behalf (vault add, listing submit), the emirate MUST be set explicitly — do not rely on defaults. Ask the user if they didn't say.

⚠️ CRITICAL — read this carefully:

You have NO ability to move the map by describing actions in text.
The map ONLY changes when you call a tool. This applies in every
language (EN, RU, AR).

- NEVER claim you moved the camera, opened a plot, applied a filter,
  or toggled vault mode unless you actually called the corresponding
  tool in this turn.
- If the user asks to navigate, find, filter, open, or highlight
  anything on the map — you MUST call the relevant tool. There is
  no other way.
- Describing the action without calling the tool is a FAILURE. Do
  NOT say "I've moved the camera", "showing only residential", "I've
  opened the plot", "камера перемещена", or any equivalent — call
  the tool first, wait for its return value, then summarise what
  the tool actually reported.

After a tool call, your follow-up turn should describe the result
based on the tool's return payload — not on what you assumed would
happen. If the tool returned an error, tell the user honestly.

CITATION RULES (when quoting numbers from analytics tools):
- Quote priceAed / areaSqft / FAR / floors / GFA / height EXACTLY from the tool result. Never invent.
- If a field is missing from the result (omitted nulls), say "not specified" rather than guess.
- Convert into the user's preferred units when the preference block below is set:
  • Currency: 1 USD = 3.6725 AED (UAE Central Bank fixed peg). priceAed × (1 / 3.6725) ≈ USD value.
  • Area: 1 sqm = 10.7639 sqft. sqft × 0.0929 ≈ sqm.
  • For a 300,000,000 AED listing the USD equivalent is approximately $81,690,000 (300M / 3.6725).
- For comparisons, render a compact table with 3-4 rows max (price, area, FAR, location), highlighting the differences that matter.
- When listing 5 search results, use a short bullet list with plot number + district + price + area — not a wall of text.

RULES:
- Use emoji sparingly
- Max 3-4 sentences unless detailed explanation or comparison requested
- Never make up prices, fees, or predictions
- Always mention verify with the right regulator when quoting figures — DLD / RERA for Dubai, DMT for Abu Dhabi
- If unsure say so. For AD-specific fees / TAMM costs / NOC amounts you almost certainly do not have a verified figure — say "I don't have a verified figure, please confirm with DMT" rather than guessing or copying Dubai numbers
- When asked about other UAE emirates (Sharjah, Ajman, RAK, UAQ, Fujairah): coverage is coming soon on ZAAHI; you can answer general UAE questions but flag that ZAAHI's data for these emirates is limited`;

// ── Tool schema ───────────────────────────────────────────────
// Wave 3a HYBRID 12 tools (2026-06-10, founder spec
// docs/research/archie-top25-2026-06-10.md §Architecture C):
//   • 8 standalone — distinct intents, each is its own tool
//   • 4 mega-tools — control_camera / control_filter / control_chrome
//     / parcel_action, each takes an `action` enum + per-action args
//
// The mega-tools cover ~15 actions that were previously individual
// tools. Schema-block shrinks from ~3.2K to ~1.5K tokens per turn,
// which keeps gpt-5-nano well below the empirical confusion threshold.
//
// Backward note: tool NAMES have changed. The dispatch in
// src/lib/archie-tools.ts matches the new names; old names are no
// longer reachable. Submit_feedback + parcel_action are stubbed in
// Wave 3a (founder ratified) — they accept calls and return a
// {ok:false, message:"coming in Wave 3b/3c"} so the LLM can degrade
// gracefully without crashing the conversation.

const LAND_USE_VALUES = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "MIXED_USE",
  "HOTEL",
  "INDUSTRIAL",
  "EDUCATIONAL",
  "HEALTHCARE",
  "AGRICULTURAL",
  "FUTURE_DEVELOPMENT",
] as const;

const PARCEL_STATUS_VALUES = [
  "LISTED",
  "VERIFIED",
  "IN_DEAL",
  "SOLD",
  "VAULT_PRIVATE",
] as const;

const LAYER_KEYS = [
  "communities", "roads", "metro", "metroStations",
  "tramStations", "marineStations", "evChargers",
  "plotLabels", "districtNames", "ddaLandPlots",
  "adLandPlots", "ddaProjects", "ddaFreeZones",
  "adCommunities", "adDistricts", "vaultShared",
] as const;

const TOOLS = [
  // ── 1. fly_to_district (standalone — Wave 3a fix landed the boundary
  //      index in src/lib/district-boundaries.ts so "show Business Bay"
  //      zooms to the actual community polygon, not the parcel bbox).
  {
    type: "function" as const,
    function: {
      name: "fly_to_district",
      description:
        "Move the map camera to a district / community boundary (Dubai or Abu Dhabi). Wave 3a uses the curated boundary index — \"Business Bay\" zooms to the whole Business Bay polygon, not just the 3 ZAAHI plots inside. Use when the user asks to 'go to', 'show', 'fly to', or 'look at' an area.",
      parameters: {
        type: "object",
        properties: {
          district: {
            type: "string",
            description:
              "District / community name. English Latin only — transliterate Russian / Arabic before calling. Examples: 'Arjan', 'Business Bay', 'Saadiyat', 'Yas Island', 'Al Reem', 'Al Ain'.",
          },
          emirate: {
            type: "string",
            enum: ["DUBAI", "ABU_DHABI"],
            description: "Optional emirate hint when the district name is ambiguous (e.g. 'Marina' exists in both emirates).",
          },
        },
        required: ["district"],
        additionalProperties: false,
      },
    },
  },
  // ── 2. open_plot (standalone — heavy side-effect: opens detail panel).
  {
    type: "function" as const,
    function: {
      name: "open_plot",
      description:
        "Search for a plot by its plot number and open its detail panel. Use when the user gives a specific plot number (5-10 digits).",
      parameters: {
        type: "object",
        properties: {
          plotNumber: {
            type: "string",
            description: "5-10 digit plot number as recorded by DDA.",
            pattern: "^\\d{5,10}$",
          },
        },
        required: ["plotNumber"],
        additionalProperties: false,
      },
    },
  },
  // ── 3. search_plots (standalone — analytics).
  {
    type: "function" as const,
    function: {
      name: "search_plots",
      description:
        "Find plots matching filters. Use when the user asks to FIND / LIST / SHOW ME options. Returns up to `limit` rows (max 10) with plotNumber, district, project, landUse, status, priceAed, areaSqft, maxGfaSqft, far, maxFloors. Caller can scope by district, land-use, status, price range, area range, floor range, openToJV. Sort defaults to price ascending. Does NOT move the map — call fly_to_district separately if the user wants the camera to follow.",
      parameters: {
        type: "object",
        properties: {
          district: { type: "string", description: "Partial case-insensitive district name (e.g. 'arjan', 'business bay')." },
          landUse: {
            type: "string",
            enum: LAND_USE_VALUES as unknown as string[],
            description: "One of the 9 canonical land-use categories.",
          },
          status: {
            type: "string",
            enum: ["LISTED", "VERIFIED", "IN_DEAL"],
            description: "Public status filter. VAULT_PRIVATE is not searchable here.",
          },
          minPriceAed: { type: "number", description: "Minimum currentValuation in AED." },
          maxPriceAed: { type: "number", description: "Maximum currentValuation in AED." },
          minAreaSqft: { type: "number", description: "Minimum plot area in sqft." },
          maxAreaSqft: { type: "number", description: "Maximum plot area in sqft." },
          minFloors: { type: "number", description: "Minimum maxFloors (from the latest affection plan)." },
          maxFloors: { type: "number", description: "Maximum maxFloors." },
          openToJV: { type: "boolean", description: "If true, only plots whose owner is open to JV partnership." },
          sortBy: { type: "string", enum: ["price", "area", "gfa"], description: "Default 'price' (ascending)." },
          limit: { type: "number", description: "Cap on rows returned. 1..10, default 5.", minimum: 1, maximum: 10 },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ── 4. get_plot_details (standalone — analytics).
  {
    type: "function" as const,
    function: {
      name: "get_plot_details",
      description:
        "Fetch the full readable record for one plot by its plot number. Use when the user asks 'what's the price/GFA/FAR/height/area of plot N' or 'tell me about plot N'. Returns plotNumber, district, project, masterDeveloper, landUse, status, priceAed, plotAreaSqft, plotAreaSqm, maxGfaSqft, maxGfaSqm, maxFloors, maxHeightMeters, maxHeightCode, far, sitePlanIssue, sitePlanExpiry. Missing fields are omitted — quote them as 'not specified'. Other users' VAULT_PRIVATE plots respond 'not_found'.",
      parameters: {
        type: "object",
        properties: {
          plotNumber: {
            type: "string",
            description: "5-10 digit plot number as recorded by DDA.",
            pattern: "^\\d{5,10}$",
          },
        },
        required: ["plotNumber"],
        additionalProperties: false,
      },
    },
  },
  // ── 5. compare_plots (standalone — analytics).
  {
    type: "function" as const,
    function: {
      name: "compare_plots",
      description:
        "Fetch 2-5 plots side-by-side. Use when the user asks 'compare X and Y' or 'which of these is bigger/cheaper'. Returns a `plots` array with the same field set as get_plot_details, plus a `missing` array of plot numbers we couldn't find. Use the missing list verbatim so the user knows what wasn't compared.",
      parameters: {
        type: "object",
        properties: {
          plotNumbers: {
            type: "array",
            items: { type: "string", pattern: "^\\d{5,10}$" },
            minItems: 2,
            maxItems: 5,
            description: "Between 2 and 5 plot numbers, each 5-10 digits.",
          },
        },
        required: ["plotNumbers"],
        additionalProperties: false,
      },
    },
  },
  // ── 6. change_basemap (standalone — short distinct enum).
  {
    type: "function" as const,
    function: {
      name: "change_basemap",
      description:
        "Switch the basemap raster between Cartocdn Light, Cartocdn Dark, or ArcGIS Satellite.",
      parameters: {
        type: "object",
        properties: {
          theme: {
            type: "string",
            enum: ["light", "dark", "satellite"],
          },
        },
        required: ["theme"],
        additionalProperties: false,
      },
    },
  },
  // ── 7. toggle_layer (standalone — wide enum, distinct intent).
  {
    type: "function" as const,
    function: {
      name: "toggle_layer",
      description:
        "Show or hide one of the 16 whitelisted map overlays. Master-plan polygons live elsewhere and are not in this whitelist.",
      parameters: {
        type: "object",
        properties: {
          layer: {
            type: "string",
            enum: LAYER_KEYS as unknown as string[],
          },
          enabled: { type: "boolean" },
        },
        required: ["layer", "enabled"],
        additionalProperties: false,
      },
    },
  },
  // ── 8. submit_feedback (standalone — STUB in Wave 3a; full wiring in Wave 3b).
  {
    type: "function" as const,
    function: {
      name: "submit_feedback",
      description:
        "Send a feedback note about the platform to the ZAAHI team (founders Zhan + Dymo). Categorise from intent: BUG (something doesn't work), IDEA (feature suggestion), COMPLAINT (unhappy with existing behaviour), PRAISE (it works well), QUESTION (is there a way to X), OTHER. Call this when the user types feedback unprompted ('the map is broken', 'add dark mode') or when they explicitly agree to your offer. NOTE: Wave 3a stub — currently acknowledges the call and tells the user the channel will be live shortly. Do not pretend it was delivered.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["BUG", "IDEA", "COMPLAINT", "PRAISE", "QUESTION", "OTHER"],
          },
          text: {
            type: "string",
            maxLength: 2000,
            description: "The user's feedback in their own words. Quote verbatim — don't paraphrase.",
          },
          context: {
            type: "string",
            maxLength: 1000,
            description: "Optional one-sentence summary of what the user was doing when the feedback came up.",
          },
        },
        required: ["category", "text"],
        additionalProperties: false,
      },
    },
  },
  // ── 9. control_camera (mega — view-control actions).
  {
    type: "function" as const,
    function: {
      name: "control_camera",
      description:
        "Camera + view controls. Pick the `action`: 'zoom_in' / 'zoom_out' (no args), 'set_view_mode' (args.mode = '2D' | '3D'), 'set_emirate' (args.emirate = 'DUBAI' | 'ABU_DHABI' — flies to emirate overview), 'reset_view' (clear filters AND fly to Dubai overview), 'highlight_plot' (args.plotId), 'toggle_vault_only' (args.enabled).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: [
              "zoom_in",
              "zoom_out",
              "set_view_mode",
              "set_emirate",
              "reset_view",
              "highlight_plot",
              "toggle_vault_only",
            ],
          },
          mode: { type: "string", enum: ["2D", "3D"], description: "For set_view_mode." },
          emirate: { type: "string", enum: ["DUBAI", "ABU_DHABI"], description: "For set_emirate." },
          plotId: { type: "string", description: "For highlight_plot — parcel UUID from a previous tool result." },
          enabled: { type: "boolean", description: "For toggle_vault_only." },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  // ── 10. control_filter (mega — filter dimensions).
  {
    type: "function" as const,
    function: {
      name: "control_filter",
      description:
        "Filter dimensions on the plot / building layers. Pick the `action`: 'by_land_use' (args.category from the 9 categories, omit to clear), 'by_status' (args.status, omit to clear), 'price_range' (args.min / args.max in AED — pass both undefined to clear), 'area_range' (args.min / args.max in sqft), 'reset_all' (clears every filter).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["by_land_use", "by_status", "price_range", "area_range", "reset_all"],
          },
          category: {
            type: "string",
            enum: LAND_USE_VALUES as unknown as string[],
            description: "For by_land_use. Omit to clear the land-use filter.",
          },
          status: {
            type: "string",
            enum: PARCEL_STATUS_VALUES as unknown as string[],
            description: "For by_status. Omit to clear the status filter.",
          },
          min: { type: "number", description: "Lower bound for price_range (AED) or area_range (sqft)." },
          max: { type: "number", description: "Upper bound for price_range (AED) or area_range (sqft)." },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  // ── 11. control_chrome (mega — chrome toggles with drone⇄auto-rotate mutex).
  {
    type: "function" as const,
    function: {
      name: "control_chrome",
      description:
        "Chrome toggles. `action` is one of 'drone' / 'auto_rotate' / 'sun_slider' / 'legend'. `enabled` is the target state. drone ⇄ auto_rotate are mutually exclusive — enabling one disables the other. The tool result echoes the resolved camera-motion pair so you can describe both effects ('I enabled drone, which also turned off auto-rotate').",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["drone", "auto_rotate", "sun_slider", "legend"],
          },
          enabled: { type: "boolean" },
        },
        required: ["action", "enabled"],
        additionalProperties: false,
      },
    },
  },
  // ── 12. parcel_action (mega — STUB in Wave 3a; favorite_parcel /
  //        check_dld / open_feasibility wired in Wave 3c).
  {
    type: "function" as const,
    function: {
      name: "parcel_action",
      description:
        "Per-parcel actions. Wave 3c will wire 'favorite' (add to user favourites), 'check_dld' (open the DLD inquiry page in a new tab), and 'open_feasibility' (open the feasibility calculator for the selected parcel). NOTE: Wave 3a stub — currently acknowledges the call but does not act. Do not pretend the action happened.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["favorite", "check_dld", "open_feasibility"],
          },
          parcelId: { type: "string" },
          plotNumber: { type: "string", pattern: "^\\d{5,10}$" },
          enabled: { type: "boolean", description: "For favorite — true to add, false to remove." },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
];

// ── Wire-format types ─────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface OpenAIChoice {
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason: "stop" | "tool_calls" | "length" | "content_filter";
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
  error?: { message: string; type?: string };
}

// ── Navigation-intent heuristic ───────────────────────────────
// gpt-4o with tool_choice:"auto" is known to skip tool calls and
// hallucinate a "done" reply, especially on non-English prompts
// (founder report 2026-05-31). When the latest user message clearly
// signals a navigation / filter intent, we promote tool_choice to
// "required" so the model is forced to invoke one of the six tools
// rather than chat. For ambient questions ("what's the DLD fee?")
// we keep tool_choice:"auto" so the model can answer in text.
//
// Word-list is deliberately conservative — only verbs that imply a
// map action, in all three platform languages.
// Wave 2 (2026-06-01) extends the EN regex with chrome verbs
// (zoom / basemap / layer / 2D / 3D / drone / legend / etc) so the
// model is forced into tool_choice="required" when the user clearly
// asks for a chrome change, not just a navigation.
const NAV_INTENT_RE =
  /\b(show|go to|open|close|filter|fly|find|navigate|highlight|take me to|zoom|zoom in|zoom out|filter by|only|switch to|hide|enable|disable|turn on|turn off|2d|3d|satellite|dark mode|light mode|drone|auto.?rotate|sun slider|legend|layer|basemap)\b|покажи|откро[йи]|найди|лети|фильтр|перейди|выдели|показать|только|закрой|спрячь|включи|выключи|приблизь|отдали|2д|3д|спутник|тёмный|светлый|дрон|вращ|солнце|легенд|слой|карт|أرني|افتح|اعرض|انتقل|فلتر|ابحث|أغلق|أخفي|قرّب|أبعد|طبقة|أساس/iu;

function detectToolChoice(history: ChatMessage[]): "auto" | "required" {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    if (typeof m.content !== "string") return "auto";
    return NAV_INTENT_RE.test(m.content) ? "required" : "auto";
  }
  return "auto";
}

// ── Handler ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("REPLACE_ME")) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    );
  }

  interface ArchieBody {
    history?: ChatMessage[];
    preferences?: {
      currency?: "AED" | "USD";
      areaUnit?: "sqft" | "sqm";
    };
  }
  let body: ArchieBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-30) : [];
  if (history.length === 0) {
    return NextResponse.json({ error: "empty_history" }, { status: 400 });
  }

  // User-preference block (founder spec 2026-06-01 Wave 1). Injected
  // every turn so the model picks currency / area-unit when citing
  // analytics-tool results. Fixed in SYSTEM_PROMPT we couldn't read
  // the live toggle state; here we do it cleanly per request.
  const prefCurrency: "AED" | "USD" =
    body.preferences?.currency === "USD" ? "USD" : "AED";
  const prefAreaUnit: "sqft" | "sqm" =
    body.preferences?.areaUnit === "sqm" ? "sqm" : "sqft";
  const preferenceBlock = `USER PREFERENCES (apply to every figure you quote):
- Currency: ${prefCurrency}${prefCurrency === "USD" ? " (use $ prefix, e.g. $81,690,000)" : " (e.g. 300,000,000 AED)"}
- Area unit: ${prefAreaUnit === "sqm" ? "m² (sqm)" : "sqft (ft²)"}
If the tool result gives priceAed and the user picked USD, divide by 3.6725 and prepend $. If it gives areaSqft and the user picked sqm, divide by 10.7639 and append m².`;

  // Build the message array OpenAI expects. System prompt is fixed
  // server-side so the client can't override the persona. Preference
  // block is appended as a separate system message so it can be
  // rebuilt cheaply each turn without re-shipping the whole prompt.
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: preferenceBlock },
    ...history.filter(
      (m) =>
        (m.role === "user" || m.role === "assistant" || m.role === "tool") &&
        // Pass-through tool_calls / tool_call_id when present; the
        // assistant turn that emitted tool_calls may have null content.
        (typeof m.content === "string" || m.content === null || Array.isArray(m.tool_calls)),
    ),
  ];

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // 2026-06-03 — gpt-5-nano ($0.05 in / $0.40 out per 1M) is a
        // reasoning model. Its API surface differs from gpt-4o:
        //   • `max_tokens` is rejected — must use `max_completion_tokens`
        //   • `temperature` is rejected (reasoning models sample
        //     internally) — omit
        //   • `reasoning_effort` controls how much budget goes into
        //     internal thought; "minimal" keeps latency low for the
        //     fast tool-routing job Archie does (founder doesn't need
        //     deep deliberation to dispatch fly_to_district).
        //   • Function calling + tool_choice still work unchanged.
        // Budget rationale: 2000 covers ~500-700 internal reasoning
        // + ~300-500 user-visible output + roundtrip headroom for the
        // 17-tool schema. gpt-4o ran at max_tokens:600 because it had
        // no internal-thought tax; with reasoning we need more.
        model: "gpt-5-nano",
        messages,
        tools: TOOLS,
        // "required" when the user's latest turn looks like a
        // navigation / filter command (forces the model to actually
        // invoke a tool); "auto" otherwise so RE-knowledge questions
        // still get plain text replies. See detectToolChoice above.
        tool_choice: detectToolChoice(history),
        max_completion_tokens: 2000,
        reasoning_effort: "minimal",
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      // Try to surface OpenAI's structured error so future diagnoses
      // don't need raw-log spelunking. The shape is
      // {"error":{"code":"...","message":"...","type":"..."}}.
      // For 429: code distinguishes "rate_limit_exceeded" (TPM hit)
      // from "insufficient_quota" (out of credit). For 400: typical
      // codes are "model_not_found" or "unsupported_parameter".
      let errCode: string | undefined;
      let errMessage: string | undefined;
      try {
        const parsed = JSON.parse(errText) as {
          error?: { code?: string; message?: string; type?: string };
        };
        errCode = parsed.error?.code;
        errMessage = parsed.error?.message;
      } catch {
        /* not JSON — keep raw text in the log line below */
      }
      console.error(
        "[archie] openai error:",
        r.status,
        errCode ?? "(no-code)",
        errMessage ?? errText,
      );
      return NextResponse.json(
        { error: `openai_${r.status}`, code: errCode },
        { status: 502 },
      );
    }

    const data = (await r.json()) as OpenAIResponse;
    if (data.error) {
      console.error("[archie] openai error body:", data.error);
      return NextResponse.json({ error: "openai_error" }, { status: 502 });
    }

    const choice = data.choices?.[0];
    if (!choice) {
      return NextResponse.json({ error: "no_choice" }, { status: 502 });
    }

    // Observability — one line per turn so we can monitor whether
    // the model is calling tools as expected. Kept permanently
    // (founder spec 2026-05-31): if tool-call rate drops, this is
    // the cheapest signal.
    console.log(
      "[archie] finish:",
      choice.finish_reason,
      "tools:",
      choice.message.tool_calls?.length ?? 0,
    );

    // Tool-call path: surface them up to the client. The client will
    // execute and post a follow-up turn with role:"tool" entries.
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      return NextResponse.json({
        tool_calls: choice.message.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments, // JSON string — client parses
        })),
        // Echo the assistant message so the client can put it back
        // into history alongside the tool results on the next turn.
        // OpenAI requires the assistant turn that emitted tool_calls
        // to be present when the tool result is posted back.
        assistant_message: {
          role: "assistant" as const,
          content: choice.message.content,
          tool_calls: choice.message.tool_calls,
        },
      });
    }

    // Plain text reply.
    return NextResponse.json({ reply: choice.message.content ?? "" });
  } catch (e) {
    console.error("[archie] failed:", e);
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }
}
