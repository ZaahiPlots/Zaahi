"use client";
/**
 * Archibald — ZAAHI's AI assistant chat widget.
 *
 * Phase 2 (2026-05-30): switched from /api/chat (Anthropic) to
 * /api/archie (OpenAI gpt-4o with map-control tools). Drives a
 * client-side tool dispatch loop — each turn may resolve to a text
 * reply OR a sequence of tool calls. Tools execute sequentially via
 * the MapControls bridge passed in from the parent map page.
 *
 * Inline SVG mascot with CSS-driven idle / hover / open / thinking states.
 *
 * UX (2026-05-31): unified glassmorphism tokens to match SidePanel /
 * Layers (rgba(0,0,0,0.3) + blur(16) + rgba(255,255,255,0.15) border,
 * gold as accent only). Mobile bottom-sheet ≤640px (full-width,
 * 90vh, top-rounded, drag handle, safe-area + iOS anti-zoom 16px
 * input). Desktop launcher is draggable with localStorage persistence
 * (zaahi-archie-launcher-pos); chat window anchors to the launcher's
 * quadrant. Mobile launcher stays pinned to bottom-right safe-area
 * (tap-only — drag disabled there).
 */
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { useAreaUnit } from "@/lib/area-unit";
import { useCurrency } from "@/lib/currency";
import {
  type MapControls,
  type ArchieReply,
  type AssistantWithTools,
  toolHumanLabel,
  executeArchieTool,
} from "@/lib/archie-tools";
import {
  type ProactiveNudge,
  type AcceptAction,
  nudgeAcceptLabel,
  nudgeDismissLabel,
} from "@/lib/use-proactive-archie";

const GOLD = "#C8A96E";
const TXT = "#FFFFFF";

// Drag / persistence. Mirrors the other map-page localStorage keys
// (zaahi-vault-only-mode, zaahi-autorotate, etc.).
const LAUNCHER_POS_KEY = "zaahi-archie-launcher-pos";
const DRAG_THRESHOLD_PX = 8;
const LAUNCHER_SIZE = 52; // desktop. Mobile sized via CSS, drag disabled.
const VIEWPORT_MARGIN = 12;
const WINDOW_GAP = 8; // between launcher and chat window when anchored

// Server wire-format message. role:"tool" entries hold the JSON result
// of a previous tool_call and carry tool_call_id so OpenAI can pair
// them. The model spec also allows assistant turns with null content +
// tool_calls (echoed back from /api/archie) — we pass them through
// untouched.
interface ServerMsg {
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: AssistantWithTools["tool_calls"];
  tool_call_id?: string;
}

// UI bubble — only user and assistant text show in the scroll. Tool
// turns are wire-only.
interface UiMsg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: UiMsg = {
  role: "assistant",
  content:
    "Hi! I'm Archie — your Dubai real estate expert. Ask me anything about properties, fees, procedures, or tell me where to fly the map.",
};

// Safety cap for the dispatch loop. Eight turns covers any sensible
// multi-tool chain (e.g. resolve-district → fitBounds → highlight →
// open) without letting a runaway prompt burn tokens forever.
const MAX_TOOL_TURNS = 8;

// Wave 3c — turn the engine's AcceptAction into a programmatic user
// message. The LLM dispatch loop already knows how to handle natural
// language ("Show me listings in Business Bay" → fly_to_district +
// search_plots), so we keep the accept handler thin and locale-aware.
function composeAcceptMessage(action: AcceptAction): string {
  const tag =
    typeof navigator !== "undefined"
      ? (navigator.language || "en").toLowerCase()
      : "en";
  const loc: "en" | "ru" | "ar" = tag.startsWith("ru")
    ? "ru"
    : tag.startsWith("ar")
      ? "ar"
      : "en";
  switch (action.kind) {
    case "open_district":
      return loc === "ru"
        ? `Покажи листинги в ${action.district}`
        : loc === "ar"
          ? `أعرض لي القوائم في ${action.district}`
          : `Show me listings in ${action.district}`;
    case "compare_parcels":
      return loc === "ru"
        ? "Сравни участки, которые я только что открыл"
        : loc === "ar"
          ? "قارن القطع التي فتحتها للتو"
          : "Compare the plots I just opened";
    case "ask_relax_filters":
      return loc === "ru"
        ? "Помоги ослабить фильтры — сейчас пусто"
        : loc === "ar"
          ? "ساعدني في تخفيف الفلاتر — لا توجد نتائج"
          : "Help me relax my filters — nothing matches";
  }
}

/**
 * Bottom edge of the map's header bar.
 *
 * Measured rather than hard-coded so the clamp follows the header if its
 * height changes; the constant is only a fallback for SSR and for the frame
 * before the header mounts.
 */
const HEADER_HEIGHT_FALLBACK = 44;
function headerBottom(): number {
  if (typeof document === "undefined") return HEADER_HEIGHT_FALLBACK;
  const rect = document.querySelector("header")?.getBoundingClientRect();
  return rect && rect.height > 0 ? rect.bottom : HEADER_HEIGHT_FALLBACK;
}

/**
 * Keep the launcher inside the viewport AND out of the header bar.
 *
 * Founder backlog PART 4, item 2: "The Archie orb overlaps the 'REAL ESTATE
 * OS' wordmark." It could, and nothing stopped it — the orb is draggable, its
 * position persists in localStorage, and the only constraint was the viewport
 * edge.
 *
 * The exclusion is the WHOLE header, not just the wordmark. The bar is
 * full-width and also carries the search inputs and the right-hand controls,
 * so an orb parked anywhere along it covers something. One rule, no special
 * cases.
 *
 * This is the single choke point for launcher positioning — drag, window
 * resize, and the read of the persisted value all route through it. That
 * matters: a position saved BEFORE this clamp existed is migrated the next
 * time the map loads, without a storage version or a one-off migration step.
 */
function clampPos(x: number, y: number): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const maxY = h - LAUNCHER_SIZE - VIEWPORT_MARGIN;
  const minY = headerBottom() + VIEWPORT_MARGIN;
  return {
    x: Math.max(VIEWPORT_MARGIN, Math.min(w - LAUNCHER_SIZE - VIEWPORT_MARGIN, x)),
    // On a viewport too short to hold both the header and the launcher, the
    // bottom edge wins — an orb hidden under the fold is unreachable, whereas
    // one overlapping the header is merely untidy.
    y: maxY <= minY
      ? Math.max(VIEWPORT_MARGIN, maxY)
      : Math.max(minY, Math.min(maxY, y)),
  };
}

export default function ArchibaldChat({
  hidden = false,
  mapControls,
  nudge = null,
  onAcceptNudge,
  onDismissNudge,
}: {
  hidden?: boolean;
  mapControls: MapControls;
  /** Active proactive nudge surfaced by useProactiveArchie. Null when
   *  no nudge is queued. Owned by the engine — ArchibaldChat only
   *  renders the badge + nudge bubble UI and reports user choice. */
  nudge?: ProactiveNudge | null;
  /** User clicked [Yes, show me]. Engine clears nudge + returns the
   *  AcceptAction so we can compose the right LLM follow-up. */
  onAcceptNudge?: () => AcceptAction | null;
  /** User clicked [Not now] or 8s auto-dismiss timer fired. Engine
   *  clears the nudge and records a 24h per-type dismiss memory. */
  onDismissNudge?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMsg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Wave 1 preferences (founder spec 2026-06-01): the dashboard
  // Settings → Currency + Area Unit toggles get threaded into the
  // /api/archie body so the system prompt's "USER PREFERENCES"
  // block carries the live choice every turn. The hooks subscribe
  // to the CustomEvent broadcast, so toggling mid-chat updates
  // the next request without a remount.
  const areaUnit = useAreaUnit();
  const currency = useCurrency();

  // Wave 3b session-state (founder spec 2026-06-10). Counts executed
  // tool calls so the server-side SYSTEM_PROMPT can decide whether to
  // proactively offer feedback at a natural pause. feedbackOffered
  // latches true the first time submit_feedback fires (or as soon as
  // we detect an offer-prompt in an assistant turn — done via the
  // tool name match below). Refs (not state) so updates inside the
  // dispatch loop don't trigger re-renders of the bubble list.
  const toolCallsInSessionRef = useRef(0);
  const feedbackOfferedRef = useRef(false);

  // Draggable launcher. null = use CSS defaults (bottom-right with
  // safe-area). Set from localStorage on mount and updated on drag.
  const [launcherPos, setLauncherPos] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    didDrag: boolean;
    pointerId: number;
  } | null>(null);
  // Set true on pointerup-after-drag so the synthesized click that
  // follows pointerup doesn't toggle the chat open/closed.
  const justDraggedRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, pendingTool, open]);

  // Mobile breakpoint — matches SidePanel's sm: (640px).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Load persisted launcher position on mount. Clamp into the current
  // viewport in case the window shrank since last session.
  useEffect(() => {
    if (isMobile) {
      // Mobile pins to bottom-right safe-area via CSS — drop any
      // desktop drag state so the launcher reflows cleanly.
      setLauncherPos(null);
      return;
    }
    try {
      const raw = localStorage.getItem(LAUNCHER_POS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
      if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return;
      if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return;
      setLauncherPos(clampPos(parsed.x, parsed.y));
    } catch {
      // Bad JSON or storage blocked — silently fall back to default.
    }
  }, [isMobile]);

  // Re-clamp on resize / orientation so the launcher never goes
  // off-screen if the user rotates the device or resizes the window.
  useEffect(() => {
    if (isMobile) return;
    const onResize = () => {
      setLauncherPos((p) => (p ? clampPos(p.x, p.y) : null));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [isMobile]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || thinking) return;
    // Only clear the input when the user typed; programmatic sends
    // (e.g. accept-nudge follow-up) leave any half-typed text alone.
    if (overrideText == null) setInput("");

    // Build the wire-format history (last 30 turns of useful state,
    // not counting the static greeting bubble). The new user turn
    // goes at the tail.
    const uiNext: UiMsg[] = [...messages, { role: "user", content: text }];
    setMessages(uiNext);
    setThinking(true);

    // ── PART 24: one user message, one feedback submission ───────────────
    //
    // Reported 2026-08-27: "A single message from me, sent once with no retry
    // and no rate-limit error, produced TWO separate POST calls to
    // /api/archie/feedback, both returning 200, from one conversational turn.
    // The chat rendered one user bubble and one assistant turn, so nothing in
    // the UI indicated that the report had been filed twice."
    //
    // The loop below re-queries /api/archie after each tool batch, so the
    // model can emit submit_feedback again on a later iteration of the SAME
    // turn. Two independent guards, because either alone is leaky:
    //
    //   • this local latch stops the second call being made at all, which is
    //     the only way the founders' Telegram stays clean when the network
    //     round-trip would otherwise already be in flight;
    //   • submissionId lets the server collapse anything that still arrives —
    //     a retry, a double-mounted client, a future caller that forgets.
    //
    // The id is per USER MESSAGE, not per tool call: two calls in one turn are
    // the duplicate we are removing, so they must share a key.
    const submissionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let feedbackSentThisTurn = false;
    setPendingTool(null);

    // wireHistory accumulates server-shape turns across the dispatch
    // loop. Starts from current UI messages (user + assistant text
    // bubbles), tool_calls + tool results layer on top.
    const wireHistory: ServerMsg[] = uiNext
      .filter((m) => m !== GREETING)
      .map<ServerMsg>((m) => ({ role: m.role, content: m.content }));

    try {
      let safety = 0;
      while (safety++ < MAX_TOOL_TURNS) {
        const r = await apiFetch("/api/archie", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            history: wireHistory.slice(-30),
            preferences: { currency, areaUnit },
            sessionState: {
              toolCallsInSession: toolCallsInSessionRef.current,
              feedbackOfferedThisSession: feedbackOfferedRef.current,
            },
          }),
        });
        const data = (await r.json()) as ArchieReply;

        if (!r.ok || data.error) {
          const errText = data.error ?? "Archie is sleeping";
          setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${errText}` }]);
          break;
        }

        // Pure text reply → end loop, surface bubble.
        if ("reply" in data && typeof data.reply === "string") {
          // Defence in depth. The server no longer returns an empty reply
          // (see /api/archie route.ts — PART 5), but this used to render a
          // bare "…" for one, which is indistinguishable from a message that
          // never arrived. If an empty string ever reaches here again, say
          // something rather than nothing.
          const reply =
            data.reply && data.reply.trim().length > 0
              ? data.reply
              : "I didn't get an answer back for that one — try sending it again.";
          setMessages((m) => [...m, { role: "assistant", content: reply }]);
          wireHistory.push({ role: "assistant", content: reply });
          break;
        }

        // Tool call branch — push the assistant message that emitted
        // tool_calls, execute each call sequentially, append the tool
        // results, then loop back for the model's follow-up reply.
        if ("tool_calls" in data && data.tool_calls?.length) {
          wireHistory.push({
            role: "assistant",
            content: data.assistant_message.content,
            tool_calls: data.assistant_message.tool_calls,
          });
          for (const tc of data.tool_calls) {
            setPendingTool(`Archie is ${toolHumanLabel(tc.name, tc.arguments)}`);
            let result: unknown;
            try {
              if (tc.name === "submit_feedback" && feedbackSentThisTurn) {
                // Answer the model honestly rather than silently dropping the
                // call: it needs to know the note is already filed, otherwise
                // its follow-up text may promise a second send that never
                // happened. Same shape the server returns for a collapse.
                result = {
                  ok: true,
                  deduped: true,
                  collapsedBy: "client-turn-cap",
                  message: "Already sent that one in this turn — the team has it.",
                };
              } else {
                result = await executeArchieTool(tc, mapControls, submissionId);
                if (tc.name === "submit_feedback") feedbackSentThisTurn = true;
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : "unknown";
              result = { error: "execution_failed", message: msg };
              setMessages((m) => [
                ...m,
                {
                  role: "assistant",
                  content: `⚠️ Tool \`${tc.name}\` failed: ${msg}`,
                },
              ]);
            }
            // Wave 3b — count tool calls + latch the feedback-offered
            // flag once submit_feedback fires. The proactive-offer
            // prompt in SYSTEM_PROMPT reads these via sessionState.
            toolCallsInSessionRef.current += 1;
            if (tc.name === "submit_feedback") {
              feedbackOfferedRef.current = true;
            }
            wireHistory.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
          setPendingTool(null);
          continue;
        }

        // Defensive — neither path matched.
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "⚠️ Empty response from Archie" },
        ]);
        break;
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Network error." }]);
    } finally {
      setThinking(false);
      setPendingTool(null);
    }
  }

  // Close chat when SidePanel opens (cat would overlap content)
  useEffect(() => {
    if (hidden && open) setOpen(false);
  }, [hidden, open]);

  // ── Drag handlers (desktop only) ─────────────────────
  function onLauncherPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (isMobile) return;
    // Only left button / primary pointer initiates drag.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = launcherRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: rect.left,
      posY: rect.top,
      didDrag: false,
      pointerId: e.pointerId,
    };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Safari rare failure — drag continues via pointermove on element.
    }
  }

  function onLauncherPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragStateRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.didDrag && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    d.didDrag = true;
    setLauncherPos(clampPos(d.posX + dx, d.posY + dy));
    if (open) setOpen(false);
  }

  function onLauncherPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragStateRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const wasDrag = d.didDrag;
    dragStateRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore — capture may already be released
    }
    if (wasDrag) {
      justDraggedRef.current = true;
      // Persist final position (read state via element rect — setLauncherPos
      // may not have flushed yet when this fires).
      const rect = e.currentTarget.getBoundingClientRect();
      try {
        localStorage.setItem(
          LAUNCHER_POS_KEY,
          JSON.stringify({ x: rect.left, y: rect.top }),
        );
      } catch {
        // storage blocked — session-only is acceptable
      }
    }
  }

  function onLauncherPointerCancel() {
    dragStateRef.current = null;
  }

  function onLauncherClick() {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    // Wave 3c: if a nudge is queued and we're opening the chat, the
    // nudge bubble auto-renders below the message scroll (driven by
    // the `nudge` prop). No extra logic needed here — just toggle.
    setOpen((v) => !v);
  }

  // Wave 3c accept-action dispatcher. Takes the AcceptAction the
  // engine returned and turns it into a programmatic user message so
  // the existing LLM dispatch loop drives the actual tool calls
  // (fly_to_district + search_plots, etc.). Localised against the
  // browser locale via the same helpers the nudge text uses.
  async function handleNudgeAccept() {
    if (!onAcceptNudge) return;
    const action = onAcceptNudge();
    if (!action) return;
    // Make sure chat is open so the user sees the follow-up reply.
    setOpen(true);
    const text = composeAcceptMessage(action);
    void send(text);
  }

  function handleNudgeDismiss() {
    if (onDismissNudge) onDismissNudge();
  }

  const launcherMode: AvatarMode = thinking ? "thinking" : open ? "open" : "idle";

  if (hidden) return null;

  // Resolve launcher + window inline positioning. CSS handles defaults
  // (bottom-right with safe-area). Inline styles take over when the
  // user has dragged the launcher to a custom spot.
  const useCustomPos = !isMobile && launcherPos != null;
  const launcherStyle: React.CSSProperties | undefined = useCustomPos
    ? {
        left: launcherPos!.x,
        top: launcherPos!.y,
        right: "auto",
        bottom: "auto",
      }
    : undefined;

  // 4-quadrant anchor for the chat window. Reads window dims at render
  // time — resize useEffect triggers re-render via setLauncherPos.
  let windowStyle: React.CSSProperties | undefined;
  if (useCustomPos && typeof window !== "undefined") {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = launcherPos!.x + LAUNCHER_SIZE / 2;
    const cy = launcherPos!.y + LAUNCHER_SIZE / 2;
    const anchorLeft = cx < w / 2;
    const anchorTop = cy < h / 2;
    const top = launcherPos!.y + LAUNCHER_SIZE + WINDOW_GAP;
    const bottom = h - launcherPos!.y + WINDOW_GAP;
    windowStyle = {
      left: anchorLeft ? launcherPos!.x : "auto",
      right: anchorLeft ? "auto" : w - launcherPos!.x - LAUNCHER_SIZE,
      top: anchorTop ? top : "auto",
      bottom: anchorTop ? "auto" : bottom,
      // The stylesheet's max-height cannot account for a top offset chosen at
      // runtime, so clamp against the space actually left below the anchor.
      // 16px keeps it off the viewport edge.
      maxHeight: anchorTop ? Math.max(220, h - top - 16) : Math.max(220, h - bottom - 16),
    };
  }

  return (
    <>
      {/* Caption pill (Wave 3c) — only when chat is closed and a nudge
          is queued. Sits to the LEFT of the launcher (desktop) and is
          hidden on mobile to avoid covering the map. */}
      {!open && nudge && !isMobile && (
        <div
          className="archibald-nudge-caption"
          role="status"
          style={
            useCustomPos && launcherPos
              ? {
                  // Pin to the launcher position the user dragged to.
                  top: launcherPos.y + 6,
                  right: "auto",
                  left: launcherPos.x - 200,
                }
              : undefined
          }
        >
          {nudge.caption}
        </div>
      )}

      {/* Launcher button */}
      <button
        ref={launcherRef}
        onClick={onLauncherClick}
        onPointerDown={onLauncherPointerDown}
        onPointerMove={onLauncherPointerMove}
        onPointerUp={onLauncherPointerUp}
        onPointerCancel={onLauncherPointerCancel}
        title={nudge ? nudge.caption : "Archie — AI assistant"}
        aria-label={nudge ? nudge.caption : "Open Archie assistant"}
        className="archibald-launcher"
        style={launcherStyle}
      >
        {!open && !nudge && <span className="archibald-pulse" aria-hidden />}
        {!open && nudge && (
          <span className="archibald-nudge-badge" aria-hidden>
            1
          </span>
        )}
        <CatAvatar mode={launcherMode} size={32} />
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="archibald-window"
          style={windowStyle}
          data-archie-chat-open="true"
        >
          {/* Mobile drag handle — hidden on desktop */}
          <div className="archibald-mobile-handle" aria-hidden>
            <div />
          </div>
          {/* Header */}
          <div className="archibald-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(200, 169, 110, 0.25)",
                  border: `1px solid ${GOLD}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CatAvatar mode="open" size={18} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span className="archibald-header-title">Archie</span>
                <span className="archibald-header-status">
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#22C55E",
                      display: "inline-block",
                      boxShadow: "0 0 4px #22C55E",
                    }}
                  />
                  Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="archibald-close"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="archibald-scroll">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}
            {thinking && (
              <div
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "rgba(255, 255, 255, 0.6)",
                  fontStyle: "italic",
                  paddingLeft: 32,
                }}
              >
                {pendingTool ?? "Archie is thinking"}
                <span className="archibald-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
            {/* Wave 3c — proactive nudge bubble. Lives below the scroll
                feed but inside the chat window. Not pushed into the
                wire history; LLM never sees this template. */}
            {nudge && (
              <div className="archibald-nudge-bubble" role="dialog" aria-label="Archie suggestion">
                <div className="archibald-nudge-text">{nudge.text}</div>
                <div className="archibald-nudge-actions">
                  <button
                    type="button"
                    className="archibald-nudge-accept"
                    onClick={() => void handleNudgeAccept()}
                    disabled={thinking}
                  >
                    {nudgeAcceptLabel()}
                  </button>
                  <button
                    type="button"
                    className="archibald-nudge-dismiss"
                    onClick={handleNudgeDismiss}
                  >
                    {nudgeDismissLabel()}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="archibald-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask Archie..."
              disabled={thinking}
              className="archibald-input"
            />
            <button
              onClick={() => void send()}
              disabled={thinking || !input.trim()}
              className="archibald-send"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .archibald-launcher {
          position: absolute;
          right: 16px;
          bottom: 16px;
          width: ${LAUNCHER_SIZE}px;
          height: ${LAUNCHER_SIZE}px;
          border-radius: 50%;
          background: ${GOLD};
          color: white;
          border: 1px solid rgba(200, 169, 110, 0.6);
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(200, 169, 110, 0.45),
            0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 27;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          touch-action: none;
          transition: transform 150ms ease, box-shadow 150ms ease;
        }
        .archibald-launcher:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(200, 169, 110, 0.6),
            0 4px 14px rgba(0, 0, 0, 0.35);
        }
        .archibald-launcher:hover .archi-ear-l {
          transform: rotate(-5deg);
        }
        .archibald-launcher:hover .archi-ear-r {
          transform: rotate(5deg);
        }
        .archi-ear-l,
        .archi-ear-r {
          transform-origin: center bottom;
          transition: transform 300ms ease;
        }
        .archi-eyes {
          transition: transform 250ms ease;
          transform-origin: center;
        }
        .archi-eyes.mode-open {
          transform: scale(1.1);
        }
        .archi-eyes.mode-thinking {
          animation: archiEyeDart 600ms ease-in-out infinite;
        }
        .archi-eye {
          animation: archiBlink 3.5s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes archiBlink {
          0%, 92%, 100% { opacity: 1; transform: scaleY(1); }
          94%, 96% { opacity: 0.2; transform: scaleY(0.1); }
        }
        @keyframes archiEyeDart {
          0%, 100% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
        }
        .archibald-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid ${GOLD};
          animation: archiPulse 3s ease-out infinite;
          pointer-events: none;
        }
        @keyframes archiPulse {
          0% { transform: scale(0.95); opacity: 0.85; }
          80% { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }

        /* ── Wave 3c — proactive nudge badge + caption + bubble ── */
        .archibald-nudge-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${GOLD};
          color: rgba(0, 0, 0, 0.85);
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35), 0 0 0 2px rgba(0, 0, 0, 0.4);
          animation: archiBadgePop 320ms cubic-bezier(0.34, 1.4, 0.64, 1);
          pointer-events: none;
          z-index: 1;
        }
        @keyframes archiBadgePop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .archibald-nudge-caption {
          position: absolute;
          bottom: ${16 + LAUNCHER_SIZE - 36}px;
          right: ${16 + LAUNCHER_SIZE + 12}px;
          max-width: 220px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          color: ${TXT};
          font-size: 12px;
          line-height: 1.3;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
          opacity: 0;
          animation: archiCaptionFade 320ms ease-out 150ms forwards;
          pointer-events: none;
          z-index: 27;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @keyframes archiCaptionFade {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .archibald-nudge-bubble {
          align-self: stretch;
          margin: 6px 12px 4px;
          padding: 10px 12px;
          background: rgba(200, 169, 110, 0.10);
          border: 1px solid rgba(200, 169, 110, 0.35);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: archiSlideUp 0.25s ease-out;
        }
        .archibald-nudge-text {
          font-size: 13px;
          color: ${TXT};
          line-height: 1.4;
        }
        .archibald-nudge-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .archibald-nudge-accept,
        .archibald-nudge-dismiss {
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: background-color 150ms ease, border-color 150ms ease, transform 150ms ease;
        }
        .archibald-nudge-accept {
          background: rgba(200, 169, 110, 0.25);
          border: 1px solid ${GOLD};
          color: ${GOLD};
        }
        .archibald-nudge-accept:hover:not(:disabled) {
          background: rgba(200, 169, 110, 0.4);
          transform: translateY(-1px);
        }
        .archibald-nudge-accept:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .archibald-nudge-dismiss {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.78);
        }
        .archibald-nudge-dismiss:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .archibald-window {
          position: absolute;
          right: 16px;
          bottom: ${16 + LAUNCHER_SIZE + WINDOW_GAP}px;
          width: 360px;
          /* 520px is the design height, but it must never win over the viewport.
             The window anchors to whichever quadrant the (draggable) launcher
             sits in; anchored by its top on a short screen, a fixed height runs
             straight off the bottom edge and takes the composer with it — a user
             who cannot reach the input cannot report anything, including this.
             dvh so the mobile URL bar collapsing does not re-break it; vh first
             as the fallback for browsers without dvh. The subtrahend covers the
             launcher, its gap and a margin. */
          height: 520px;
          max-height: calc(100vh - 96px);
          max-height: calc(100dvh - 96px);
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          box-shadow: 0 16px 64px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: ${TXT};
          z-index: 28;
          animation: archiSlideUp 0.25s ease-out;
        }
        @keyframes archiSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .archibald-mobile-handle {
          display: none;
        }

        .archibald-header {
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .archibald-header-title {
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: ${GOLD};
          line-height: 1.1;
        }
        .archibald-header-status {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 5px;
          line-height: 1.4;
        }
        .archibald-close {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          color: white;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
        }
        .archibald-close:hover {
          border-color: ${GOLD};
          background: rgba(200, 169, 110, 0.25);
          color: ${GOLD};
        }

        .archibald-scroll {
          flex: 1;
          /* Without this a flex item will not shrink below its content, so a long
             conversation pushes the composer out of the window's overflow:hidden
             box and it is clipped rather than scrolled. flex:1 alone is not
             enough — min-height defaults to auto in a flex column. */
          min-height: 0;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .archibald-input-row {
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .archibald-input {
          flex: 1;
          font-size: 13px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: ${TXT};
          background: rgba(255, 255, 255, 0.04);
          outline: none;
          transition: border-color 150ms ease, background 150ms ease;
          font-family: inherit;
        }
        .archibald-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .archibald-input:focus {
          border-color: ${GOLD};
          background: rgba(255, 255, 255, 0.06);
        }
        .archibald-send {
          padding: 0 16px;
          height: 38px;
          min-width: 56px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: ${GOLD};
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid ${GOLD};
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
        }
        .archibald-send:hover:not(:disabled) {
          background: rgba(200, 169, 110, 0.25);
        }
        .archibald-send:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          border-color: rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.5);
          background: rgba(0, 0, 0, 0.2);
        }

        .archibald-dots {
          display: inline-flex;
          gap: 3px;
        }
        .archibald-dots i {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.55);
          animation: archiDots 1s ease-in-out infinite;
        }
        .archibald-dots i:nth-child(2) { animation-delay: 0.15s; }
        .archibald-dots i:nth-child(3) { animation-delay: 0.3s; }
        @keyframes archiDots {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }

        /* ── Mobile bottom-sheet (≤640px) ────────────────
           Mirrors the SidePanel mobile pattern: drag handle, top-only
           rounded corners, 90vh height, full width, safe-area padding.
           Launcher pins to bottom-right safe-area; drag is disabled
           on mobile (full-screen sheet → no need to move the icon). */
        @media (max-width: 640px) {
          .archibald-launcher {
            width: 56px;
            height: 56px;
            right: max(16px, env(safe-area-inset-right));
            bottom: max(16px, env(safe-area-inset-bottom));
            /* Drag disabled on mobile — inline style from desktop
               persistence is ignored because launcherPos is reset to
               null when isMobile is true. */
          }

          .archibald-window {
            /* Override any anchored inline-style values from desktop. */
            left: 0 !important;
            right: 0 !important;
            top: 10% !important;
            bottom: 0 !important;
            width: auto !important;
            height: auto !important;
            border-radius: 16px 16px 0 0;
            border-left: 0;
            border-right: 0;
            border-bottom: 0;
            padding-bottom: env(safe-area-inset-bottom);
            animation: archiSlideUpMobile 0.28s ease-out;
          }
          @keyframes archiSlideUpMobile {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }

          .archibald-mobile-handle {
            display: flex;
            justify-content: center;
            padding: 8px 0 4px;
            flex-shrink: 0;
          }
          .archibald-mobile-handle > div {
            width: 36px;
            height: 4px;
            border-radius: 2px;
            background: rgba(255, 255, 255, 0.3);
          }

          .archibald-header {
            padding: 10px 16px 12px;
          }

          .archibald-input {
            /* iOS Safari zooms <16px inputs on focus — bumping to 16px
               keeps the viewport stable when Archibald is summoned on
               a phone. */
            font-size: 16px;
            padding: 12px 14px;
          }
          .archibald-send {
            height: 44px;
            min-width: 64px;
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}

// ───────────────── Inline SVG mascot ─────────────────
type AvatarMode = "idle" | "open" | "thinking";

function CatAvatar({ size, mode }: { size: number; mode: AvatarMode }) {
  // viewBox 32×32; ears, head, eyes, nose, whiskers
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="white"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
      aria-hidden
    >
      {/* Ears */}
      <path className="archi-ear-l" d="M7 11 L5 4 L11 8 Z" fill="white" />
      <path className="archi-ear-r" d="M25 11 L27 4 L21 8 Z" fill="white" />
      {/* Head */}
      <circle cx="16" cy="17" r="9" fill="none" />
      {/* Eyes group (animation target) */}
      <g className={`archi-eyes mode-${mode}`}>
        <circle className="archi-eye" cx="12" cy="16" r="1.4" fill="white" />
        <circle className="archi-eye" cx="20" cy="16" r="1.4" fill="white" />
      </g>
      {/* Nose */}
      <path d="M15 19 L17 19 L16 20.5 Z" fill="white" />
      {/* Mouth */}
      <path d="M16 20.5 Q14 22 13 21" />
      <path d="M16 20.5 Q18 22 19 21" />
      {/* Whiskers */}
      <line x1="6" y1="17" x2="10" y2="17.5" />
      <line x1="6" y1="19" x2="10" y2="18.5" />
      <line x1="22" y1="17.5" x2="26" y2="17" />
      <line x1="22" y1="18.5" x2="26" y2="19" />
    </svg>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  if (isUser) {
    return (
      <div
        style={{
          alignSelf: "flex-end",
          maxWidth: "85%",
          padding: "10px 14px",
          borderRadius: 14,
          // Gold accent for the user's voice — translucent so it reads
          // as accent on glass, not solid CTA chrome.
          background: "rgba(200, 169, 110, 0.85)",
          border: "1px solid rgba(200, 169, 110, 1)",
          color: "white",
          fontSize: 13,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {text}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: "85%" }}>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "rgba(200, 169, 110, 0.25)",
          border: `1px solid ${GOLD}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CatAvatar size={16} mode="idle" />
      </div>
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: TXT,
          fontSize: 13,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
      </div>
    </div>
  );
}
