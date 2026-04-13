"use client";
/**
 * Archibald — ZAAHI's AI assistant chat widget.
 * Inline SVG mascot with CSS-driven idle / hover / open / thinking states.
 */
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

const GOLD = "#C8A96E";
const TXT = "#1A1A2E";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I'm Archibald — your Dubai real estate expert. Ask me anything about properties, fees, procedures, or let me help you navigate the platform.",
};

export default function ArchibaldChat({ hidden = false }: { hidden?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, open]);

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setThinking(true);
    try {
      const r = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: next.slice(0, -1).filter((m) => m !== GREETING),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `⚠️ ${data.error ?? "Archibald is sleeping"}` },
        ]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply || "…" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Network error." }]);
    } finally {
      setThinking(false);
    }
  }

  // Close chat when SidePanel opens (cat would overlap content)
  useEffect(() => {
    if (hidden && open) setOpen(false);
  }, [hidden, open]);

  const launcherMode: AvatarMode = thinking ? "thinking" : open ? "open" : "idle";

  if (hidden) return null;

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Archibald — AI assistant"
        aria-label="Open Archibald assistant"
        className="archibald-launcher"
      >
        {!open && <span className="archibald-pulse" aria-hidden />}
        <CatAvatar mode={launcherMode} size={32} />
      </button>

      {/* Chat window */}
      {open && (
        <div className="archibald-window">
          {/* Header */}
          <div className="archibald-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CatAvatar mode="open" size={24} />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Archibald</span>
                <span
                  style={{
                    fontSize: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    opacity: 0.95,
                  }}
                >
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
              style={{
                background: "transparent",
                border: 0,
                color: "white",
                fontSize: 20,
                cursor: "pointer",
                lineHeight: 1,
              }}
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
                  color: "#6B7280",
                  fontStyle: "italic",
                  paddingLeft: 28,
                }}
              >
                Archibald is thinking
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
          right: 10px;
          bottom: 10px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: ${GOLD};
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(200, 169, 110, 0.5),
            0 2px 6px rgba(0, 0, 0, 0.2);
          z-index: 27;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
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
          right: 10px;
          bottom: 72px;
          width: 350px;
          height: 500px;
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(8px);
          border: 1px solid ${GOLD};
          border-radius: 12px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
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
        .archibald-header {
          padding: 10px 14px;
          background: ${GOLD};
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .archibald-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(249, 250, 251, 0.7);
        }
        .archibald-input-row {
          padding: 10px;
          border-top: 1px solid #e5e7eb;
          background: white;
          display: flex;
          gap: 6px;
        }
        .archibald-input {
          flex: 1;
          font-size: 12px;
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: ${TXT};
          background: white;
          outline: none;
          transition: border-color 150ms ease;
        }
        .archibald-input:focus {
          border-color: ${GOLD};
        }
        .archibald-send {
          padding: 0 14px;
          font-size: 12px;
          font-weight: 700;
          color: white;
          background: ${GOLD};
          border: 0;
          border-radius: 6px;
          cursor: pointer;
        }
        .archibald-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .archibald-dots {
          display: inline-flex;
          gap: 3px;
        }
        .archibald-dots i {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #6b7280;
          animation: archiDots 1s ease-in-out infinite;
        }
        .archibald-dots i:nth-child(2) { animation-delay: 0.15s; }
        .archibald-dots i:nth-child(3) { animation-delay: 0.3s; }
        @keyframes archiDots {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
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
          padding: "8px 12px",
          borderRadius: 12,
          background: GOLD,
          color: "white",
          fontSize: 12,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {text}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", maxWidth: "85%" }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: GOLD,
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
          padding: "8px 12px",
          borderRadius: 12,
          background: "#F3F4F6",
          color: TXT,
          fontSize: 12,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        {text}
      </div>
    </div>
  );
}
