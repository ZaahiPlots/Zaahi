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
const SYSTEM_PROMPT = `You are Archie — ZAAHI's AI real estate assistant for Dubai, UAE.

IDENTITY:
- Name: Archie
- Role: UAE Real Estate Expert and Platform Navigator
- Languages: respond in the same language the user writes (EN, AR, RU)
- Tone: professional but friendly, like a premium concierge at a 5-star Dubai hotel

DUBAI RE KNOWLEDGE:
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
- Golden Visa 10-year for AED 2M+ investment
- VAT 5% commercial, residential exempt
- Service charges AED 15-30/sqft/year by community

PLATFORM:
- ZAAHI is Real Estate OS for UAE & Saudi Arabia
- Map shows communities, DDA districts, master plans, plots for sale with 3D buildings and feasibility calculator

MAP CONTROL — you have SIX tools that drive the map directly:
- fly_to_district  — camera to a Dubai district / community (Arjan, Dubai Hills, Business Bay, …)
- open_plot        — search a plot by its plot number and open its detail panel
- highlight_plot   — pulse the gold halo around a plot without opening the panel
- filter_by_land_use — show only buildings of one category (RESIDENTIAL, COMMERCIAL, MIXED_USE, HOTEL, INDUSTRIAL, EDUCATIONAL, HEALTHCARE, AGRICULTURAL, FUTURE_DEVELOPMENT)
- filter_by_status — show only parcels of a given status (LISTED, VERIFIED, IN_DEAL, SOLD, VAULT_PRIVATE)
- toggle_vault_only — flip the lock that scopes the map to the caller's private vault plots

ANALYTICS — you have THREE more tools that READ data (no side effects on the map):
- search_plots      — find plots matching filters (district, land use, status, price range, area range, floor range, openToJV, sort). Use when the user asks to FIND / LIST / SHOW ME options.
- get_plot_details  — exact data on one plot by plotNumber (price, plot area, max GFA, FAR, floors, height, plan dates, land use). Use when the user asks "what's the price/GFA/FAR/height of plot N" or "tell me about N".
- compare_plots     — fetch 2-5 plots side-by-side. Use when the user asks "compare X and Y" or "which is bigger/cheaper".

Analytics tools DO NOT move the camera. If the user wants the camera to follow ("show me Arjan and find me residential there"), call fly_to_district first, then search_plots — two tools in sequence.

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
- Never make up prices or predictions
- Always mention verify with DLD/RERA when quoting figures
- If unsure say so`;

// ── Tool schema ───────────────────────────────────────────────
// Nine tools — 6 map-control + 3 analytics (Wave 1 2026-06-01).
// Names are snake_case (OpenAI convention),
// arguments are typed JSON Schema. The client maps each name to a
// concrete handler that touches mapRef / React state setters.
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "fly_to_district",
      description:
        "Move the map camera to a Dubai district or community by name. Use when the user asks to 'go to', 'show', 'fly to', or 'look at' an area.",
      parameters: {
        type: "object",
        properties: {
          district: {
            type: "string",
            description:
              "District / community name, e.g. 'Arjan', 'Dubai Hills', 'Business Bay', 'Jumeirah Village Circle'.",
          },
          zoom: {
            type: "number",
            description: "Optional camera zoom level. Defaults to 14 (district scale).",
            minimum: 10,
            maximum: 18,
          },
        },
        required: ["district"],
        additionalProperties: false,
      },
    },
  },
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
  {
    type: "function" as const,
    function: {
      name: "highlight_plot",
      description:
        "Apply the gold halo to a plot by its internal id without opening the side panel. Useful when the user is comparing plots and you want to draw attention without committing.",
      parameters: {
        type: "object",
        properties: {
          plotId: {
            type: "string",
            description: "Parcel UUID returned by a previous tool call.",
          },
        },
        required: ["plotId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "filter_by_land_use",
      description:
        "Hide every 3D building except the ones with the chosen land use category. Use when the user asks to 'show only residential', 'filter to commercial', etc.",
      parameters: {
        type: "object",
        properties: {
          landUse: {
            type: "string",
            description: "One of the 9 canonical land-use categories.",
            enum: [
              "RESIDENTIAL",
              "COMMERCIAL",
              "MIXED_USE",
              "HOTEL",
              "INDUSTRIAL",
              "EDUCATIONAL",
              "HEALTHCARE",
              "AGRICULTURAL",
              "FUTURE_DEVELOPMENT",
            ],
          },
        },
        required: ["landUse"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "filter_by_status",
      description:
        "Hide every parcel except the ones in the chosen status. Use when the user asks for 'verified plots', 'in deal', 'sold', or private vault scope.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Parcel status enum value.",
            enum: ["LISTED", "VERIFIED", "IN_DEAL", "SOLD", "VAULT_PRIVATE"],
          },
        },
        required: ["status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "toggle_vault_only",
      description:
        "Flip the lock that scopes the map to the caller's private vault plots. Pass true to enter vault-only mode, false to return to the public listing view.",
      parameters: {
        type: "object",
        properties: {
          enabled: {
            type: "boolean",
            description: "true → enter vault-only mode, false → exit.",
          },
        },
        required: ["enabled"],
        additionalProperties: false,
      },
    },
  },
  // ── Analytics tools (Wave 1, founder spec 2026-06-01) ─────────
  // Read-only — these never touch the camera or filters. Their job
  // is to feed the LLM data so it can answer "find me X", "what's
  // the price of N", "compare X and Y".
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
            enum: [
              "RESIDENTIAL",
              "COMMERCIAL",
              "MIXED_USE",
              "HOTEL",
              "INDUSTRIAL",
              "EDUCATIONAL",
              "HEALTHCARE",
              "AGRICULTURAL",
              "FUTURE_DEVELOPMENT",
            ],
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
            items: {
              type: "string",
              pattern: "^\\d{5,10}$",
            },
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
const NAV_INTENT_RE =
  /\b(show|go to|open|filter|fly|find|navigate|highlight|take me to|zoom to|filter by|only)\b|покажи|откро[йи]|найди|лети|фильтр|перейди|выдели|показать|только|أرني|افتح|اعرض|انتقل|فلتر|ابحث/iu;

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
        model: "gpt-4o",
        messages,
        tools: TOOLS,
        // "required" when the user's latest turn looks like a
        // navigation / filter command (forces the model to actually
        // invoke a tool); "auto" otherwise so RE-knowledge questions
        // still get plain text replies. See detectToolChoice above.
        tool_choice: detectToolChoice(history),
        max_tokens: 600,
        // Slight non-determinism so repeated identical queries don't
        // bore returning users. Same posture as gpt-4o defaults.
        temperature: 0.7,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("[archie] openai error:", r.status, errText);
      return NextResponse.json(
        { error: `openai_${r.status}` },
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
