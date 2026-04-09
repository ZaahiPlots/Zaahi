"use client";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { TIMELINE, currentStepIndex, fmtAed, DealAction, getRole } from "@/lib/deal-flow";

const GOLD = "#C8A96E";
const TXT = "#1A1A2E";
const SUBTLE = "#6B7280";
const LINE = "#E5E7EB";
const GREEN = "#16a34a";
const RED = "#dc2626";
const BG = "#FAFAFA";

interface DealData {
  id: string;
  status: string;
  parcelId: string;
  parcel: { id: string; plotNumber: string; district: string; emirate: string; area: number };
  sellerId: string;
  buyerId: string;
  brokerId: string | null;
  seller: { id: string; name: string };
  buyer: { id: string; name: string };
  broker: { id: string; name: string } | null;
  offerPriceInFils: string | null;
  agreedPriceInFils: string | null;
  priceInFils: string;
  paymentType: string | null;
  closingDays: number;
  conditions: string | null;
  initialMessage: string | null;
  depositPaid: boolean;
  mouSigned: boolean;
  nocReceived: boolean;
  dldApproved: boolean;
  dldReference: string | null;
  rating: number | null;
  createdAt: string;
  messages: Array<{ id: string; userId: string; content: string; createdAt: string; user: { id: string; name: string } }>;
  auditEvents: Array<{ id: string; eventType: string; txHash: string | null; createdAt: string; metadata: any }>;
}

const EXPLORER = "https://amoy.polygonscan.com/tx/";

export default function DealRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deal, setDeal] = useState<DealData | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  // Init auth + initial fetch
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const tk = data.session?.access_token ?? null;
      setToken(tk);
      setMe(data.session?.user.id ?? null);
      if (!tk) {
        setErr("Please sign in");
        setLoading(false);
        return;
      }
      await loadDeal(tk);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDeal = useCallback(async (tk: string) => {
    setLoading(true);
    const res = await fetch(`/api/deals/${id}`, { headers: { Authorization: `Bearer ${tk}` } });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Failed to load deal");
      setLoading(false);
      return;
    }
    const d = await res.json();
    setDeal(d);
    setErr(null);
    setLoading(false);
  }, [id]);

  const role = useMemo(() => {
    if (!deal || !me) return null;
    return getRole(deal, me);
  }, [deal, me]);

  const stepIdx = useMemo(() => deal ? currentStepIndex({ status: deal.status as any, dldApproved: deal.dldApproved }) : 1, [deal]);

  async function doAction(action: DealAction, body: Record<string, any> = {}) {
    if (!token) return;
    setActing(true);
    const res = await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...body }),
    });
    setActing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Action failed");
      return;
    }
    await loadDeal(token);
  }

  if (loading) return <CenteredMsg>Loading deal…</CenteredMsg>;
  if (err) return <CenteredMsg>{err}</CenteredMsg>;
  if (!deal) return <CenteredMsg>Deal not found</CenteredMsg>;

  const cancelled = deal.status === "DEAL_CANCELLED";
  const disputed = deal.status === "DISPUTE_INITIATED";

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TXT }}>
      <header style={{ padding: "16px 28px", borderBottom: `1px solid ${LINE}`, background: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Link href="/dashboard" style={{ color: SUBTLE, fontSize: 11, textDecoration: "none" }}>← Dashboard</Link>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            Deal Room · <span style={{ color: GOLD }}>Plot {deal.parcel.plotNumber}</span>
          </div>
          <div style={{ fontSize: 11, color: SUBTLE }}>{deal.parcel.district} · {deal.parcel.emirate} · {Math.round(deal.parcel.area).toLocaleString()} ft²</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: SUBTLE, textTransform: "uppercase", letterSpacing: 1 }}>Agreed Price</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: GOLD }}>
            {fmtAed(deal.agreedPriceInFils ? BigInt(deal.agreedPriceInFils) : (deal.offerPriceInFils ? BigInt(deal.offerPriceInFils) : BigInt(deal.priceInFils)))}
          </div>
          <div style={{ fontSize: 10, color: SUBTLE, textTransform: "uppercase", marginTop: 2 }}>You: {role ?? "viewer"}</div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 320px", gap: 1, background: LINE, minHeight: "calc(100vh - 88px)" }}>
        <Timeline currentIdx={stepIdx} cancelled={cancelled} disputed={disputed} events={deal.auditEvents} />
        <div style={{ background: BG, padding: 24, overflowY: "auto" }}>
          {cancelled ? (
            <Banner color={RED}>This deal has been cancelled.</Banner>
          ) : disputed ? (
            <Banner color={RED}>Dispute initiated. ZAAHI support will contact participants.</Banner>
          ) : (
            <StepContent deal={deal} stepIdx={stepIdx} role={role} acting={acting} doAction={doAction} />
          )}
        </div>
        <ChatPanel dealId={id} token={token} me={me} initialMessages={deal.messages} />
      </div>
    </div>
  );
}

function CenteredMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: SUBTLE, background: BG }}>
      {children}
    </div>
  );
}

function Banner({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 16, background: "white", border: `1px solid ${color}`, borderRadius: 8, color, fontWeight: 600 }}>
      {children}
    </div>
  );
}

// ── TIMELINE ────────────────────────────────────────────
function Timeline({ currentIdx, cancelled, disputed, events }: {
  currentIdx: number; cancelled: boolean; disputed: boolean;
  events: DealData["auditEvents"];
}) {
  // Find the most recent tx hash for each step (best-effort by event order matching timeline keys)
  return (
    <div style={{ background: "white", padding: 20, overflowY: "auto" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 }}>
        Progress
      </div>
      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
        {TIMELINE.map((step, i) => {
          const idx = i + 1;
          const done = !cancelled && idx < currentIdx;
          const current = !cancelled && !disputed && idx === currentIdx;
          const future = idx > currentIdx;
          const color = cancelled || disputed ? RED : done ? GREEN : current ? GOLD : SUBTLE;
          const bg = done ? GREEN : current ? GOLD : "white";
          const matchingEvent = events.find((e) => e.eventType.includes(step.key.split("_")[0]));
          return (
            <div key={step.key} style={{ display: "flex", gap: 10, paddingBottom: 14, position: "relative" }}>
              {i < TIMELINE.length - 1 && (
                <div style={{ position: "absolute", left: 9, top: 18, bottom: 0, width: 2, background: done ? GREEN : LINE }} />
              )}
              <div style={{
                width: 20, height: 20, borderRadius: 10, border: `2px solid ${color}`, background: bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                color: "white", fontSize: 10, fontWeight: 700,
              }}>
                {done ? "✓" : current ? "•" : ""}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: current ? 700 : 500, color: current ? GOLD : future ? SUBTLE : TXT }}>
                  {step.short}
                </div>
                {matchingEvent?.txHash && matchingEvent.txHash !== "pending" && (
                  <a href={EXPLORER + matchingEvent.txHash} target="_blank" rel="noreferrer"
                    style={{ fontSize: 9, color: GOLD, fontFamily: "monospace", textDecoration: "none" }}>
                    {matchingEvent.txHash.slice(0, 10)}…
                  </a>
                )}
                {matchingEvent?.txHash === "pending" && (
                  <div style={{ fontSize: 9, color: SUBTLE, fontFamily: "monospace" }}>chain: pending</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STEP CONTENT ────────────────────────────────────────
function StepContent({ deal, stepIdx, role, acting, doAction }: {
  deal: DealData; stepIdx: number; role: ReturnType<typeof getRole>;
  acting: boolean; doAction: (a: DealAction, body?: any) => Promise<void>;
}) {
  const offerAed = Number(deal.offerPriceInFils ?? deal.priceInFils) / 100;
  const agreedAed = deal.agreedPriceInFils ? Number(deal.agreedPriceInFils) / 100 : offerAed;
  const depositAed = agreedAed * 0.1;

  switch (stepIdx) {
    case 1:
      return (
        <Card title="Offer Details">
          <Row k="Offer Price" v={`${offerAed.toLocaleString()} AED`} />
          <Row k="Payment" v={deal.paymentType ?? "—"} />
          <Row k="Closing" v={`${deal.closingDays} days`} />
          {deal.conditions && <Row k="Conditions" v={deal.conditions} />}
          {deal.initialMessage && (
            <div style={{ marginTop: 10, padding: 10, background: BG, borderRadius: 6, fontSize: 12, color: SUBTLE, fontStyle: "italic" }}>
              "{deal.initialMessage}"
            </div>
          )}

          {role === "seller" && (
            <ActionBar>
              <Btn primary onClick={() => doAction("ACCEPT")} disabled={acting}>Accept Offer</Btn>
              <Btn onClick={() => {
                const v = prompt("Counter offer (AED):", String(Math.round(offerAed)));
                if (v && Number(v) > 0) doAction("COUNTER", { counterPriceAed: Number(v) });
              }} disabled={acting}>Counter</Btn>
              <Btn danger onClick={() => confirm("Reject this offer?") && doAction("REJECT")} disabled={acting}>Reject</Btn>
            </ActionBar>
          )}
          {role === "buyer" && <Note>Waiting for seller response…</Note>}
        </Card>
      );
    case 2:
      return (
        <Card title="Deposit Required">
          <Row k="Deposit Amount" v={`${depositAed.toLocaleString()} AED`} />
          <Row k="Escrow" v="ZAAHI Escrow (mock — wire details TBD)" />
          <Note>Buyer must transfer 10% deposit within 5 business days.</Note>
          {role === "buyer" && (
            <ActionBar>
              <Btn primary onClick={() => doAction("DEPOSIT")} disabled={acting}>Mark Deposit Paid</Btn>
              <Btn danger onClick={() => confirm("Cancel deal?") && doAction("CANCEL")} disabled={acting}>Cancel</Btn>
            </ActionBar>
          )}
          {role === "seller" && <Note>Waiting for buyer deposit…</Note>}
        </Card>
      );
    case 3:
      return (
        <Card title="Deposit Confirmed ✅">
          <Note>Deposit has been recorded on the audit trail. Proceed to MOU signing.</Note>
          {(role === "buyer" || role === "seller") && (
            <ActionBar>
              <Btn primary onClick={() => doAction("SIGN_MOU")} disabled={acting}>Sign MOU</Btn>
            </ActionBar>
          )}
        </Card>
      );
    case 4:
      return (
        <Card title="Agreement Signed">
          <Note>MOU executed by both parties. Document hash anchored on Polygon.</Note>
          <ActionBar>
            <Btn primary onClick={() => doAction("DOCS_COMPLETE")} disabled={acting}>Mark Documents Collected</Btn>
          </ActionBar>
        </Card>
      );
    case 5:
      return (
        <Card title="Documents Collection">
          <Checklist items={[
            "Title Deed (seller)",
            "Passports (both parties)",
            "NOC application form",
            "Mortgage pre-approval (if applicable)",
            "Valuation report",
          ]} />
          <ActionBar>
            <Btn primary onClick={() => doAction("GOV_VERIFIED")} disabled={acting}>Submit for Gov Verification</Btn>
          </ActionBar>
        </Card>
      );
    case 6:
      return (
        <Card title="Government Verification">
          <Note>Verified by DLD/RERA records. Request NOC from developer next.</Note>
          <ActionBar>
            <Btn primary onClick={() => doAction("NOC_REQUEST")} disabled={acting}>Request NOC</Btn>
          </ActionBar>
        </Card>
      );
    case 7:
      return (
        <Card title="NOC Pending">
          <Note>Awaiting No Objection Certificate from the master developer.</Note>
          {!deal.nocReceived ? (
            <ActionBar>
              <Btn primary onClick={() => doAction("NOC_RECEIVED")} disabled={acting}>Mark NOC Received</Btn>
            </ActionBar>
          ) : (
            <ActionBar>
              <Btn primary onClick={() => doAction("FEES_PAID")} disabled={acting}>Mark Transfer Fees Paid</Btn>
            </ActionBar>
          )}
        </Card>
      );
    case 8: {
      const dld = agreedAed * 0.04;
      const reg = 580;
      const admin = 4200;
      const agent = agreedAed * 0.02;
      const total = dld + reg + admin + agent;
      return (
        <Card title="Transfer Fees">
          <Row k="DLD 4%" v={`${dld.toLocaleString(undefined, { maximumFractionDigits: 0 })} AED`} />
          <Row k="Registration" v={`${reg} AED`} />
          <Row k="Admin" v={`${admin.toLocaleString()} AED`} />
          <Row k="Agent 2%" v={`${agent.toLocaleString(undefined, { maximumFractionDigits: 0 })} AED`} />
          <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 8, paddingTop: 8 }}>
            <Row k="Total" v={`${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} AED`} bold />
          </div>
          <ActionBar>
            <Btn primary onClick={() => {
              const ref = prompt("DLD Reference number:");
              if (ref) doAction("DLD_SUBMIT", { dldReference: ref });
            }} disabled={acting}>Submit to DLD</Btn>
          </ActionBar>
        </Card>
      );
    }
    case 9:
      return (
        <Card title="Submitted to DLD">
          {deal.dldReference && <Row k="Reference" v={deal.dldReference} />}
          <Note>Tracking submission with Dubai Land Department.</Note>
          <ActionBar>
            <Btn primary onClick={() => doAction("DLD_APPROVE")} disabled={acting}>Mark DLD Approved</Btn>
          </ActionBar>
        </Card>
      );
    case 10:
      return (
        <Card title="DLD Approved ✅">
          <Note>Final step: confirm completion to close the deal.</Note>
          <ActionBar>
            <Btn primary onClick={() => {
              const r = prompt("Rate this transaction (1-5):", "5");
              const n = Number(r);
              if (Number.isInteger(n) && n >= 1 && n <= 5) doAction("COMPLETE", { rating: n });
            }} disabled={acting}>Complete Deal</Btn>
          </ActionBar>
        </Card>
      );
    case 11:
      return (
        <Card title="🎉 Deal Completed">
          <Row k="Final Price" v={`${agreedAed.toLocaleString()} AED`} />
          {deal.rating && <Row k="Rating" v={"★".repeat(deal.rating) + "☆".repeat(5 - deal.rating)} />}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Audit Trail</div>
            {deal.auditEvents.map((e) => (
              <div key={e.id} style={{ fontSize: 11, padding: "4px 0", borderBottom: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between" }}>
                <span>{e.eventType}</span>
                {e.txHash && e.txHash !== "pending" ? (
                  <a href={EXPLORER + e.txHash} target="_blank" rel="noreferrer" style={{ color: GOLD, fontFamily: "monospace", textDecoration: "none" }}>
                    {e.txHash.slice(0, 12)}…
                  </a>
                ) : (
                  <span style={{ color: SUBTLE, fontFamily: "monospace" }}>pending</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      );
    default:
      return <Card title="Unknown step"><Note>Step {stepIdx}</Note></Card>;
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 10, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: `1px solid ${LINE}`, maxWidth: 640 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: SUBTLE }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 12, padding: 10, background: BG, borderRadius: 6, fontSize: 12, color: SUBTLE }}>{children}</div>;
}
function ActionBar({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>{children}</div>;
}
function Btn({ children, onClick, primary, danger, disabled }: { children: React.ReactNode; onClick: () => void; primary?: boolean; danger?: boolean; disabled?: boolean }) {
  const bg = danger ? RED : primary ? GOLD : "white";
  const color = primary || danger ? "white" : TXT;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "9px 16px", borderRadius: 6, border: primary || danger ? 0 : `1px solid ${LINE}`,
      background: disabled ? SUBTLE : bg, color, fontWeight: 700, fontSize: 11, textTransform: "uppercase",
      letterSpacing: 0.5, cursor: disabled ? "wait" : "pointer",
    }}>{children}</button>
  );
}
function Checklist({ items }: { items: string[] }) {
  return (
    <div>
      {items.map((it) => (
        <div key={it} style={{ padding: "6px 0", fontSize: 12, display: "flex", gap: 8 }}>
          <span style={{ color: SUBTLE }}>☐</span>
          <span>{it}</span>
        </div>
      ))}
    </div>
  );
}

// ── CHAT ────────────────────────────────────────────────
function ChatPanel({ dealId, token, me, initialMessages }: {
  dealId: string; token: string | null; me: string | null;
  initialMessages: DealData["messages"];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for new messages every 10s
  useEffect(() => {
    if (!token) return;
    const tick = async () => {
      const since = messages.length ? messages[messages.length - 1].createdAt : "";
      const res = await fetch(`/api/deals/${dealId}/messages${since ? `?since=${encodeURIComponent(since)}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const fresh = await res.json();
        if (Array.isArray(fresh) && fresh.length) {
          setMessages((m) => [...m, ...fresh]);
        }
      }
    };
    const i = setInterval(tick, 10000);
    return () => clearInterval(i);
  }, [dealId, token, messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!token || !text.trim()) return;
    const res = await fetch(`/api/deals/${dealId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      const m = await res.json();
      setMessages((prev) => [...prev, m]);
      setText("");
    }
  }

  return (
    <div style={{ background: "white", display: "flex", flexDirection: "column", height: "calc(100vh - 88px)" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1.2 }}>Negotiation Chat</div>
        <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>Polled every 10 seconds</div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ color: SUBTLE, fontSize: 11, textAlign: "center", marginTop: 30 }}>No messages yet. Start the conversation.</div>
        )}
        {messages.map((m) => {
          const mine = m.userId === me;
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%" }}>
              {!mine && <div style={{ fontSize: 9, color: SUBTLE, marginBottom: 2 }}>{m.user.name}</div>}
              <div style={{
                padding: "8px 12px", borderRadius: 10,
                background: mine ? GOLD : BG, color: mine ? "white" : TXT,
                fontSize: 12, lineHeight: 1.4,
              }}>{m.content}</div>
              <div style={{ fontSize: 8, color: SUBTLE, marginTop: 2, textAlign: mine ? "right" : "left" }}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: 10, borderTop: `1px solid ${LINE}`, display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          style={{ flex: 1, padding: "8px 12px", border: `1px solid ${LINE}`, borderRadius: 6, fontSize: 12 }}
        />
        <button onClick={send} style={{
          padding: "8px 14px", border: 0, background: GOLD, color: "white",
          borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer",
        }}>Send</button>
      </div>
    </div>
  );
}
