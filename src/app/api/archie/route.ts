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

RULES:
- Use emoji sparingly
- Max 3-4 sentences unless detailed explanation requested
- Never make up prices or predictions
- Always mention verify with DLD/RERA when quoting figures
- If unsure say so`;

// ── Tool schema ───────────────────────────────────────────────
// Six map-control tools. Names are snake_case (OpenAI convention),
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

  let body: { history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-30) : [];
  if (history.length === 0) {
    return NextResponse.json({ error: "empty_history" }, { status: 400 });
  }

  // Build the message array OpenAI expects. System prompt is fixed
  // server-side so the client can't override the persona.
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
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
