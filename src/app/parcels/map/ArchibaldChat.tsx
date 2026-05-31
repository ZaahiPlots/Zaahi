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
import {
  type MapControls,
  type ArchieReply,
  type AssistantWithTools,
  toolHumanLabel,
  executeArchieTool,
} from "@/lib/archie-tools";

const GOLD = "#C8A96E";
const TXT = "#FFFFFF";

// Drag / persistence. Mirrors the other map-page localStorage keys
// (zaahi-drone-mode, zaahi-vault-only-mode).
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
    "Hi! I'm Archibald — your Dubai real estate expert. Ask me anything about properties, fees, procedures, or tell me where to fly the map.",
};

// Safety cap for the dispatch loop. Eight turns covers any sensible
// multi-tool chain (e.g. resolve-district → fitBounds → highlight →
// open) without letting a runaway prompt burn tokens forever.
const MAX_TOOL_TURNS = 8;

function clampPos(x: number, y: number): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: Math.max(VIEWPORT_MARGIN, Math.min(w - LAUNCHER_SIZE - VIEWPORT_MARGIN, x)),
    y: Math.max(VIEWPORT_MARGIN, Math.min(h - LAUNCHER_SIZE - VIEWPORT_MARGIN, y)),
  };
}

export default function ArchibaldChat({
  hidden = false,
  mapControls,
}: {
  hidden?: boolean;
  mapControls: MapControls;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMsg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");

    // Build the wire-format history (last 30 turns of useful state,
    // not counting the static greeting bubble). The new user turn
    // goes at the tail.
    const uiNext: UiMsg[] = [...messages, { role: "user", content: text }];
    setMessages(uiNext);
    setThinking(true);
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
          body: JSON.stringify({ history: wireHistory.slice(-30) }),
        });
        const data = (await r.json()) as ArchieReply;

        if (!r.ok || data.error) {
          const errText = data.error ?? "Archibald is sleeping";
          setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${errText}` }]);
          break;
        }

        // Pure text reply → end loop, surface bubble.
        if ("reply" in data && typeof data.reply === "string") {
          const reply = data.reply || "…";
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
            setPendingTool(`Archibald is ${toolHumanLabel(tc.name, tc.arguments)}`);
            let result: unknown;
            try {
              result = await executeArchieTool(tc, mapControls);
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
          { role: "assistant", content: "⚠️ Empty response from Archibald" },
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
    setOpen((v) => !v);
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
    windowStyle = {
      left: anchorLeft ? launcherPos!.x : "auto",
      right: anchorLeft ? "auto" : w - launcherPos!.x - LAUNCHER_SIZE,
      top: anchorTop ? launcherPos!.y + LAUNCHER_SIZE + WINDOW_GAP : "auto",
      bottom: anchorTop ? "auto" : h - launcherPos!.y + WINDOW_GAP,
    };
  }

  return (
    <>
      {/* Launcher button */}
      <button
        ref={launcherRef}
        onClick={onLauncherClick}
        onPointerDown={onLauncherPointerDown}
        onPointerMove={onLauncherPointerMove}
        onPointerUp={onLauncherPointerUp}
        onPointerCancel={onLauncherPointerCancel}
        title="Archibald — AI assistant"
        aria-label="Open Archibald assistant"
        className="archibald-launcher"
        style={launcherStyle}
      >
        {!open && <span className="archibald-pulse" aria-hidden />}
        <CatAvatar mode={launcherMode} size={32} />
      </button>

      {/* Chat window */}
      {open && (
        <div className="archibald-window" style={windowStyle}>
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
                <span className="archibald-header-title">Archibald</span>
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
                {pendingTool ?? "Archibald is thinking"}
                <span className="archibald-dots">
                  <i />
                  <i />
                  <i />
                </span>
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
              placeholder="Ask Archibald..."
              disabled={thinking}
              className="archibald-input"
            />
            <button
              onClick={send}
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

        .archibald-window {
          position: absolute;
          right: 16px;
          bottom: ${16 + LAUNCHER_SIZE + WINDOW_GAP}px;
          width: 360px;
          height: 520px;
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
