"use client";
/**
 * "List Your Property" — two-flow listing wizard.
 *
 * Step 0: pick role (Broker | Owner)
 * Broker → 1 step (RERA + plot + price)
 * Owner  → 4 steps (Title Deed → Identity → Price → Submit)
 *
 * Submissions land in /api/parcels/submit with status PENDING_REVIEW;
 * the public map only shows LISTED / VERIFIED parcels so unverified
 * submissions stay hidden until an admin approves.
 */
import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

const GOLD = "#C8A96E";
const TXT = "#1A1A2E";
const SUBTLE = "#6B7280";
const LINE = "#E5E7EB";

type Role = "broker" | "owner" | null;

const LAND_USES = [
  "Residential",
  "Commercial",
  "Hotel",
  "Mixed Use",
  "Industrial",
  "Retail",
  "Future Development",
];

const fmtNum = (n: number): string =>
  Number.isFinite(n) ? n.toLocaleString("en-US") : "";

interface ParsedDeed {
  plotNumber: string | null;
  titleDeedNumber: string | null;
  ownerName: string | null;
  areaSqm: number | null;
  areaSqft: number | null;
  emirate: string | null;
  district: string | null;
  issueDate: string | null;
}

export default function AddPlotModal({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: (id: string) => void;
}) {
  const [role, setRole] = useState<Role>(null);

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(10,15,30,0.55)",
        backdropFilter: "blur(3px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxHeight: "80vh",
          background: "white",
          borderRadius: 14,
          border: `1px solid ${GOLD}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          color: TXT,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${LINE}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: GOLD, letterSpacing: 1 }}>
              List Your Property
            </div>
            {role && (
              <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>
                {role === "broker" ? "Broker · RERA contract" : "Owner · Title Deed"}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: 0, color: SUBTLE, fontSize: 22, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          {role === null && <RolePicker onPick={setRole} />}
          {role === "broker" && <BrokerFlow onBack={() => setRole(null)} onSubmitted={onSubmitted} />}
          {role === "owner" && <OwnerFlow onBack={() => setRole(null)} onSubmitted={onSubmitted} />}
        </div>
      </div>
    </div>
  );
}

// ───────── Step 0: role picker ─────────
function RolePicker({ onPick }: { onPick: (r: Role) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 12, color: SUBTLE, margin: 0, textAlign: "center" }}>
        Who is listing the property?
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <RoleCard
          icon="🏢"
          title="I'm a Broker"
          subtitle="List with RERA contract"
          onClick={() => onPick("broker")}
        />
        <RoleCard
          icon="🏠"
          title="I'm an Owner"
          subtitle="List with Title Deed"
          onClick={() => onPick("owner")}
        />
      </div>
    </div>
  );
}

function RoleCard({
  icon, title, subtitle, onClick,
}: { icon: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "20px 14px",
        borderRadius: 10,
        border: `1px solid ${LINE}`,
        background: "white",
        color: TXT,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        transition: "border-color 200ms ease, transform 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = GOLD;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = LINE;
        e.currentTarget.style.transform = "none";
      }}
    >
      <span style={{ fontSize: 36 }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: 13 }}>{title}</span>
      <span style={{ fontSize: 10, color: SUBTLE, textAlign: "center" }}>{subtitle}</span>
    </button>
  );
}

// ───────── Broker flow ─────────
function BrokerFlow({
  onBack, onSubmitted,
}: { onBack: () => void; onSubmitted: (id: string) => void }) {
  const [reraPermit, setReraPermit] = useState("");
  const [plotNumber, setPlotNumber] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [landUse, setLandUse] = useState("Residential");
  const [contractName, setContractName] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const price = Number(askingPrice) || 0;

  async function submit() {
    setErr(null);
    if (!reraPermit.trim()) return setErr("RERA permit / Form A required");
    if (!plotNumber.trim()) return setErr("Plot number required");
    if (price <= 0) return setErr("Asking price required");
    setBusy(true);
    try {
      const r = await apiFetch("/api/parcels/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flow: "broker",
          plotNumber: plotNumber.trim(),
          askingPriceAed: price,
          landUse,
          description,
          broker: { reraPermit: reraPermit.trim(), contractRef: contractName },
        }),
      });
      const data = await r.json();
      if (!r.ok) setErr(data.error ?? "Failed");
      else {
        setDone(data.id);
        onSubmitted(data.id);
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <SuccessCard
        title="Submitted for review"
        message="Your listing has been submitted for review. We will verify your RERA contract and publish within 24 hours."
        onBack={onBack}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <BackLink onClick={onBack} />
      <Field label="RERA Permit / Form A Number*">
        <input value={reraPermit} onChange={(e) => setReraPermit(e.target.value)} style={input()} />
      </Field>
      <Field label="Plot Number*">
        <input value={plotNumber} onChange={(e) => setPlotNumber(e.target.value)} placeholder="e.g. 6457940" style={input()} />
      </Field>
      <PriceFields price={askingPrice} setPrice={setAskingPrice} />
      <Field label="Land Use">
        <select value={landUse} onChange={(e) => setLandUse(e.target.value)} style={input()}>
          {LAND_USES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Upload Contract (PDF)">
        <DropZone
          accept=".pdf"
          onFile={(f) => setContractName(f.name)}
          label={contractName ?? "Drop PDF here or click to browse"}
        />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...input(), resize: "vertical", minHeight: 60 }} />
      </Field>
      {err && <div style={{ fontSize: 11, color: "#EF4444" }}>✕ {err}</div>}
      <PrimaryBtn onClick={submit} busy={busy}>Submit for Review</PrimaryBtn>
    </div>
  );
}

// ───────── Owner flow (multi-step) ─────────
function OwnerFlow({
  onBack, onSubmitted,
}: { onBack: () => void; onSubmitted: (id: string) => void }) {
  const [step, setStep] = useState(1); // 1..4
  const [parsing, setParsing] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [deed, setDeed] = useState<ParsedDeed>({
    plotNumber: null, titleDeedNumber: null, ownerName: null,
    areaSqm: null, areaSqft: null, emirate: null, district: null, issueDate: null,
  });

  const [idDocName, setIdDocName] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [askingPrice, setAskingPrice] = useState("");
  const [landUse, setLandUse] = useState("Residential");
  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleDeedFile(file: File) {
    setParseErr(null);
    if (!/^image\//.test(file.type)) {
      setParseErr("Please upload a JPG/PNG photo of the title deed");
      return;
    }
    setParsing(true);
    try {
      const base64 = await fileToBase64(file);
      const r = await apiFetch("/api/parcels/parse-title-deed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      });
      const data = await r.json();
      if (!r.ok) {
        setParseErr(data.error ?? "Failed to parse title deed");
      } else {
        const f = (data.fields ?? {}) as ParsedDeed;
        setDeed(f);
        if (f.ownerName) setFullName(f.ownerName);
      }
    } catch {
      setParseErr("Network error");
    } finally {
      setParsing(false);
    }
  }

  async function submit() {
    setErr(null);
    const price = Number(askingPrice) || 0;
    if (!deed.plotNumber) return setErr("Plot number missing — re-upload deed");
    if (!fullName.trim() || !phone.trim()) return setErr("Identity required");
    if (price <= 0) return setErr("Asking price required");
    setBusy(true);
    try {
      const r = await apiFetch("/api/parcels/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flow: "owner",
          plotNumber: deed.plotNumber,
          askingPriceAed: price,
          landUse,
          description,
          owner: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            titleDeedNumber: deed.titleDeedNumber,
          },
        }),
      });
      const data = await r.json();
      if (!r.ok) setErr(data.error ?? "Failed");
      else {
        setDone(data.id);
        onSubmitted(data.id);
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <SuccessCard
        title="Submitted for review"
        message="Your property has been submitted for review. We will verify ownership and publish within 24-48 hours."
        onBack={onBack}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <BackLink onClick={onBack} />
      <StepIndicator step={step} total={4} />

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Title Deed (JPG / PNG of sanad)">
            <DropZone
              accept="image/*"
              onFile={handleDeedFile}
              label={parsing ? "Parsing with Claude Vision…" : "Drop your title deed here"}
            />
          </Field>
          {parseErr && <div style={{ fontSize: 11, color: "#EF4444" }}>✕ {parseErr}</div>}
          {deed.plotNumber && (
            <div style={{ background: "#F9FAFB", border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                We found
              </div>
              <KV2 k="Plot Number" v={deed.plotNumber} onChange={(v) => setDeed({ ...deed, plotNumber: v })} />
              <KV2 k="Title Deed #" v={deed.titleDeedNumber} onChange={(v) => setDeed({ ...deed, titleDeedNumber: v })} />
              <KV2 k="Owner Name" v={deed.ownerName} onChange={(v) => setDeed({ ...deed, ownerName: v })} />
              <KV2 k="Area sqm" v={deed.areaSqm?.toString() ?? null} onChange={(v) => setDeed({ ...deed, areaSqm: Number(v) || null })} />
              <KV2 k="Emirate" v={deed.emirate} onChange={(v) => setDeed({ ...deed, emirate: v })} />
              <KV2 k="District" v={deed.district} onChange={(v) => setDeed({ ...deed, district: v })} />
            </div>
          )}
          <PrimaryBtn disabled={!deed.plotNumber} onClick={() => setStep(2)}>Next: Verify Identity</PrimaryBtn>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Emirates ID or Passport (PDF / image)">
            <DropZone accept="image/*,.pdf" onFile={(f) => setIdDocName(f.name)} label={idDocName ?? "Drop ID document"} />
          </Field>
          <Field label="Full Name*">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={input()} />
          </Field>
          <Field label="Phone*">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971…" style={input()} />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={input()} />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <SecondaryBtn onClick={() => setStep(1)}>Back</SecondaryBtn>
            <PrimaryBtn disabled={!fullName.trim() || !phone.trim()} onClick={() => setStep(3)}>Next: Set Price</PrimaryBtn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PriceFields price={askingPrice} setPrice={setAskingPrice} areaSqft={deed.areaSqft ?? null} />
          <Field label="Land Use">
            <select value={landUse} onChange={(e) => setLandUse(e.target.value)} style={input()}>
              {LAND_USES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...input(), resize: "vertical", minHeight: 60 }} />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <SecondaryBtn onClick={() => setStep(2)}>Back</SecondaryBtn>
            <PrimaryBtn disabled={!askingPrice} onClick={() => setStep(4)}>Review</PrimaryBtn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "#F9FAFB", border: `1px solid ${LINE}`, borderRadius: 8, padding: 12 }}>
            <KV2 k="Plot" v={deed.plotNumber} onChange={() => {}} readOnly />
            <KV2 k="Owner" v={fullName} onChange={() => {}} readOnly />
            <KV2 k="Phone" v={phone} onChange={() => {}} readOnly />
            <KV2 k="Price AED" v={fmtNum(Number(askingPrice) || 0)} onChange={() => {}} readOnly />
            <KV2 k="Land Use" v={landUse} onChange={() => {}} readOnly />
          </div>
          {err && <div style={{ fontSize: 11, color: "#EF4444" }}>✕ {err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <SecondaryBtn onClick={() => setStep(3)}>Back</SecondaryBtn>
            <PrimaryBtn onClick={submit} busy={busy}>Submit for Review</PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── Shared price block ─────────
function PriceFields({
  price, setPrice, areaSqft,
}: { price: string; setPrice: (v: string) => void; areaSqft?: number | null }) {
  const num = Number(price) || 0;
  const perSqft = areaSqft && areaSqft > 0 && num > 0 ? Math.round(num / areaSqft) : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
      <Field label="Asking Price AED*">
        <input
          type="text"
          value={price ? Number(price).toLocaleString("en-US") : ""}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0"
          style={input()}
        />
      </Field>
      <Field label="Per sqft">
        <div style={{ ...input(), background: "#F9FAFB", color: SUBTLE, display: "flex", alignItems: "center" }}>
          {perSqft != null ? perSqft.toLocaleString("en-US") : "—"}
        </div>
      </Field>
    </div>
  );
}

// ───────── Shared atoms ─────────
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: active || done ? GOLD : "white",
                color: active || done ? "white" : SUBTLE,
                border: `1px solid ${active || done ? GOLD : LINE}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {done ? "✓" : n}
            </div>
            {n < total && <div style={{ width: 24, height: 1, background: done ? GOLD : LINE }} />}
          </div>
        );
      })}
    </div>
  );
}

function DropZone({
  accept, onFile, label,
}: { accept: string; onFile: (f: File) => void; label: string }) {
  const [hover, setHover] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 12px",
        border: `2px dashed ${hover ? GOLD : "#D1D5DB"}`,
        borderRadius: 8,
        background: hover ? "rgba(200,169,110,0.08)" : "#F9FAFB",
        color: SUBTLE,
        fontSize: 11,
        cursor: "pointer",
        textAlign: "center",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
        style={{ display: "none" }}
      />
      📎 {label}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: SUBTLE, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      {children}
    </label>
  );
}

function KV2({
  k, v, onChange, readOnly = false,
}: { k: string; v: string | null; onChange: (v: string) => void; readOnly?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", alignItems: "center", gap: 8, padding: "3px 0" }}>
      <span style={{ fontSize: 10, color: SUBTLE }}>{k}</span>
      {readOnly ? (
        <span style={{ fontSize: 11, color: TXT }}>{v ?? "—"}</span>
      ) : (
        <input
          value={v ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...input(), padding: "4px 8px", fontSize: 11 }}
        />
      )}
    </div>
  );
}

function input(): React.CSSProperties {
  return {
    width: "100%",
    fontSize: 12,
    padding: "8px 10px",
    border: `1px solid ${LINE}`,
    borderRadius: 6,
    background: "white",
    color: TXT,
    outline: "none",
  };
}

function PrimaryBtn({
  onClick, children, busy = false, disabled = false,
}: { onClick: () => void; children: React.ReactNode; busy?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      style={{
        padding: "10px 16px",
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 6,
        border: "none",
        background: GOLD,
        color: "white",
        cursor: busy || disabled ? "not-allowed" : "pointer",
        opacity: busy || disabled ? 0.55 : 1,
        flex: 1,
      }}
    >
      {busy ? "Submitting…" : children}
    </button>
  );
}
function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        fontSize: 12,
        borderRadius: 6,
        border: `1px solid ${LINE}`,
        background: "white",
        color: TXT,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: 0,
        color: SUBTLE,
        fontSize: 11,
        cursor: "pointer",
        alignSelf: "flex-start",
        padding: 0,
      }}
    >
      ← Choose role
    </button>
  );
}

function SuccessCard({
  title, message, onBack,
}: { title: string; message: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "10px 0 20px" }}>
      <div style={{ fontSize: 48 }}>✅</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: GOLD, textAlign: "center" }}>{title}</div>
      <div style={{ fontSize: 12, color: SUBTLE, textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>{message}</div>
      <SecondaryBtn onClick={onBack}>List another property</SecondaryBtn>
    </div>
  );
}

// ───────── helpers ─────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
