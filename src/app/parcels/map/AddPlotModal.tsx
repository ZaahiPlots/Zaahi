"use client";
/**
 * "List Your Property" — multi-claim Add Plot wizard.
 *
 * Step 9 (spec-05 §8) wired three paths into the same modal:
 *
 *   1. Plot entry — user types a plot number + clicks Continue.
 *      Modal probes /api/parcels/by-plot-number/[n] (sub-100 ms,
 *      Q3 disambiguator from docs/audits/add-plot-cohort-audit.md).
 *
 *   2a. Probe says "doesn't exist" → role picker (Broker / Owner) →
 *       existing Path B submit flow. Plot number is pre-seeded so the
 *       user doesn't re-type it. Server creates Parcel + PlotClaim
 *       in a single round-trip.
 *
 *   2b. Probe says "exists" → Path C multi-claim view. Lists existing
 *       claimants (filtered for non-ADMIN per LOCK-8) with their role +
 *       price + status pill. Below, an "Add your claim" form: role
 *       select, price, role-specific doc upload, submit. Hidden if the
 *       caller already has a claim (one-claim-per-user invariant).
 *
 * Submissions land in /api/parcels/submit (Path B) or
 * /api/parcels/[id]/claim (Path C). Both endpoints write a PlotClaim
 * row at the right status (PENDING for verifiable roles, SELF_DECLARED
 * for the rest); the admin queue's PlotClaimVerification tab (Step 10)
 * surfaces the PENDING ones.
 */
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  PLOT_CLAIM_DOC_REQUIREMENTS,
  CLAIM_DOC_KIND_LABELS,
  CLAIM_DOC_KIND_HINTS,
  CLAIM_MAX_FILE_BYTES,
  CLAIM_ALLOWED_MIME,
  type ClaimDocKind,
} from "@/lib/plot-claim-doc-requirements";
import { isVerifiableRole, claimDisplayLabel } from "@/lib/plot-claim";
import type { UserRole, ClaimStatus } from "@prisma/client";

const DOCUMENTS_BUCKET = "documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB hard cap — keeps S3 bill + modal UX sane
const ALLOWED_CT = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

interface UploadedDoc {
  kind: "title_deed" | "id_doc" | "rera_contract";
  url: string;
  name: string;
  size: number;
  contentType: string;
}

/**
 * Upload a document to Supabase Storage (`documents` bucket). Path:
 * `<userId>/<plotNumber>/<kind>-<timestamp>.<ext>`. Returns the public
 * URL + metadata. Best-effort — surfaces a user-readable error message
 * on failure (bucket missing, network, size limit) so the caller can
 * decide whether to proceed without the document or block submission.
 */
async function uploadDoc(
  file: File,
  kind: UploadedDoc["kind"],
  userId: string,
  plotNumber: string,
): Promise<UploadedDoc> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} exceeds 10 MB`);
  if (file.type && !ALLOWED_CT.has(file.type)) {
    throw new Error(`${file.name}: only PDF, JPG, PNG allowed`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase().slice(0, 8) || "bin";
  const path = `${userId}/${plotNumber}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabaseBrowser.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) throw new Error(`upload failed: ${error.message}`);
  const { data } = supabaseBrowser.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path);
  return {
    kind,
    url: data.publicUrl,
    name: file.name,
    size: file.size,
    contentType: file.type || "application/octet-stream",
  };
}

const GOLD = "#C8A96E";
const TXT = "#f5f1e8";
const SUBTLE = "rgba(255,255,255,0.55)";
const LINE = "rgba(200, 169, 110, 0.15)";

type Role = "broker" | "owner" | null;
type Phase = "entry" | "pickRole" | "broker" | "owner" | "pathC";

interface ProbeResponse {
  exists: boolean;
  parcel?: {
    id: string;
    plotNumber: string;
    emirate: string;
    district: string;
    projectName: string;
    hasVerifiedOwner: boolean;
    claimsCount: number;
  };
  callerHasClaim?: boolean;
  callerClaim?: { id: string; role: UserRole; status: ClaimStatus } | null;
}

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
  const [phase, setPhase] = useState<Phase>("entry");
  const [seedPlotNumber, setSeedPlotNumber] = useState<string>("");
  const [probe, setProbe] = useState<ProbeResponse | null>(null);

  // Subtitle reflects the current phase so the user knows where they are.
  const subtitle = useMemo(() => {
    if (phase === "entry") return "Enter your plot number";
    if (phase === "pickRole") return "Plot is new · choose how you're listing";
    if (phase === "broker") return "Broker · RERA contract";
    if (phase === "owner") return "Owner · Title Deed";
    if (phase === "pathC")
      return probe?.parcel
        ? `Plot ${probe.parcel.plotNumber} · ${probe.parcel.district}`
        : "Multi-claim view";
    return "";
  }, [phase, probe]);

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
          width: 520,
          maxHeight: "85vh",
          background: "rgba(10, 22, 40, 0.5)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          borderRadius: 16,
          border: `1px solid ${LINE}`,
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
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
            {subtitle && (
              <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>
                {subtitle}
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
          {phase === "entry" && (
            <PlotEntryStep
              onProbed={(plot, resp) => {
                setSeedPlotNumber(plot);
                setProbe(resp);
                setPhase(resp.exists ? "pathC" : "pickRole");
              }}
            />
          )}
          {phase === "pickRole" && (
            <RolePicker
              onPick={(r) => setPhase(r === "broker" ? "broker" : "owner")}
              onBack={() => setPhase("entry")}
              plotNumber={seedPlotNumber}
            />
          )}
          {phase === "broker" && (
            <BrokerFlow
              onBack={() => setPhase("pickRole")}
              onSubmitted={onSubmitted}
              initialPlotNumber={seedPlotNumber}
            />
          )}
          {phase === "owner" && (
            <OwnerFlow
              onBack={() => setPhase("pickRole")}
              onSubmitted={onSubmitted}
            />
          )}
          {phase === "pathC" && probe?.parcel && (
            <MultiClaimView
              parcel={probe.parcel}
              callerHasClaim={!!probe.callerHasClaim}
              callerClaim={probe.callerClaim ?? null}
              onBack={() => setPhase("entry")}
              onSubmitted={onSubmitted}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ───────── Step 1 (NEW): plot-number entry + existence probe ─────────
function PlotEntryStep({
  onProbed,
}: {
  onProbed: (plotNumber: string, response: ProbeResponse) => void;
}) {
  const [plotNumber, setPlotNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function probe() {
    setErr(null);
    const trimmed = plotNumber.trim();
    if (!trimmed) return setErr("Plot number required");
    if (!/^\d{5,10}$/.test(trimmed)) return setErr("Plot number must be 5–10 digits");
    setBusy(true);
    try {
      const r = await apiFetch(`/api/parcels/by-plot-number/${trimmed}`);
      const data = (await r.json()) as ProbeResponse | { error: string };
      if (!r.ok) {
        setErr((data as { error: string }).error ?? "Failed");
        setBusy(false);
        return;
      }
      onProbed(trimmed, data as ProbeResponse);
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 12, color: SUBTLE, margin: 0, lineHeight: 1.55 }}>
        Type the DLD plot number for the property you want to list. We&apos;ll
        check whether it&apos;s already in ZAAHI and route you to the right
        flow — fresh listing or join an existing one.
      </p>
      <Field label="Plot Number*">
        <input
          autoFocus
          value={plotNumber}
          onChange={(e) => setPlotNumber(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="e.g. 6457940"
          inputMode="numeric"
          onKeyDown={(e) => {
            if (e.key === "Enter") void probe();
          }}
          style={input()}
        />
      </Field>
      {err && <div style={{ fontSize: 11, color: "#EF4444" }}>✕ {err}</div>}
      <PrimaryBtn onClick={probe} busy={busy}>
        Continue
      </PrimaryBtn>
    </div>
  );
}

// ───────── Step 2 (was Step 0): role picker ─────────
function RolePicker({
  onPick,
  onBack,
  plotNumber,
}: {
  onPick: (r: Exclude<Role, null>) => void;
  onBack: () => void;
  plotNumber: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <BackLink onClick={onBack} label="← Change plot number" />
      {plotNumber && (
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${LINE}`,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 11,
            color: SUBTLE,
          }}
        >
          Plot <span style={{ color: GOLD, fontWeight: 600 }}>{plotNumber}</span> isn&apos;t in
          ZAAHI yet. We&apos;ll create it after you submit.
        </div>
      )}
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
        border: `1px solid rgba(200, 169, 110, 0.3)`,
        background: "rgba(255, 255, 255, 0.06)",
        color: TXT,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        transition: "border-color 150ms ease, background 150ms ease, transform 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = GOLD;
        e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
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
  onBack, onSubmitted, initialPlotNumber = "",
}: { onBack: () => void; onSubmitted: (id: string) => void; initialPlotNumber?: string }) {
  const [reraPermit, setReraPermit] = useState("");
  const [plotNumber, setPlotNumber] = useState(initialPlotNumber);
  const [askingPrice, setAskingPrice] = useState("");
  const [landUse, setLandUse] = useState("Residential");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const price = Number(askingPrice) || 0;

  async function submit() {
    setErr(null);
    const trimmedPlot = plotNumber.trim();
    if (!reraPermit.trim()) return setErr("RERA permit / Form A required");
    if (!trimmedPlot) return setErr("Plot number required");
    if (!/^\d{5,10}$/.test(trimmedPlot)) return setErr("Plot number must be 5-10 digits");
    if (price <= 0) return setErr("Asking price required");
    setBusy(true);
    try {
      const { data: sess } = await supabaseBrowser.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) {
        setErr("Please sign in");
        setBusy(false);
        return;
      }

      const documents: UploadedDoc[] = [];
      if (contractFile) {
        try {
          documents.push(await uploadDoc(contractFile, "rera_contract", userId, trimmedPlot));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "upload failed";
          setErr(`Contract upload: ${msg}`);
          setBusy(false);
          return;
        }
      }

      const r = await apiFetch("/api/parcels/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flow: "broker",
          plotNumber: trimmedPlot,
          askingPriceAed: price,
          landUse,
          description,
          broker: { reraPermit: reraPermit.trim(), contractRef: contractFile?.name ?? null },
          documents,
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
      <BackLink onClick={onBack} label="← Choose role" />
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
          onFile={(f) => setContractFile(f)}
          label={contractFile?.name ?? "Drop PDF here or click to browse"}
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

  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [titleDeedFile, setTitleDeedFile] = useState<File | null>(null);
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
    setTitleDeedFile(file);
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
    const plot = deed.plotNumber ?? "";
    if (!plot) return setErr("Plot number missing — re-upload deed");
    if (!/^\d{5,10}$/.test(plot)) return setErr("Plot number must be 5-10 digits");
    if (!fullName.trim() || !phone.trim()) return setErr("Identity required");
    if (price <= 0) return setErr("Asking price required");
    setBusy(true);
    try {
      const { data: sess } = await supabaseBrowser.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) {
        setErr("Please sign in");
        setBusy(false);
        return;
      }

      const documents: UploadedDoc[] = [];
      try {
        if (titleDeedFile) {
          documents.push(await uploadDoc(titleDeedFile, "title_deed", userId, plot));
        }
        if (idDocFile) {
          documents.push(await uploadDoc(idDocFile, "id_doc", userId, plot));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "upload failed";
        setErr(`Document upload: ${msg}`);
        setBusy(false);
        return;
      }

      const r = await apiFetch("/api/parcels/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flow: "owner",
          plotNumber: plot,
          askingPriceAed: price,
          landUse,
          description,
          owner: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            titleDeedNumber: deed.titleDeedNumber,
          },
          documents,
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
      <BackLink onClick={onBack} label="← Choose role" />
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
            <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
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
            <DropZone accept="image/*,.pdf" onFile={(f) => setIdDocFile(f)} label={idDocFile?.name ?? "Drop ID document"} />
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
          <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${LINE}`, borderRadius: 8, padding: 12 }}>
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
        <div style={{ ...input(), background: "rgba(255,255,255,0.05)", color: SUBTLE, display: "flex", alignItems: "center" }}>
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
                background: active || done ? GOLD : "rgba(255,255,255,0.08)",
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
        border: `2px dashed ${hover ? GOLD : "rgba(255,255,255,0.2)"}`,
        borderRadius: 8,
        background: hover ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.04)",
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
    background: "rgba(255,255,255,0.04)",
    color: TXT,
    outline: "none",
    fontFamily: "inherit",
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
        border: `1px solid rgba(200, 169, 110, 0.3)`,
        background: "rgba(255,255,255,0.06)",
        color: GOLD,
        cursor: "pointer",
        transition: "border-color 150ms ease, background 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = GOLD;
        e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)";
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      }}
    >
      {children}
    </button>
  );
}

function BackLink({ onClick, label = "← Back" }: { onClick: () => void; label?: string }) {
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
      {label}
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

// ───────── Path C: multi-claim view ─────────

// All cohort-applicant roles (spec §5.1) — the dropdown options for the
// "Add your claim" form. ADMIN / INVESTOR are excluded; ADMIN is system,
// INVESTOR is deprecated (auto-migrates to BUYER on next user touch).
const CLAIM_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "OWNER", label: "Owner" },
  { value: "BROKER", label: "Broker" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "BUYER", label: "Buyer" },
  { value: "ARCHITECT", label: "Architect" },
  { value: "POA", label: "Power of Attorney" },
  { value: "INTERMEDIARY", label: "Intermediary" },
  { value: "RELATIVE", label: "Relative" },
  { value: "REFERRAL", label: "Referral" },
  { value: "OTHER", label: "Other" },
];

interface MultiClaimViewParcel {
  id: string;
  plotNumber: string;
  emirate: string;
  district: string;
  projectName: string;
  hasVerifiedOwner: boolean;
  claimsCount: number;
}

interface ExistingClaim {
  id: string;
  role: UserRole;
  priceAed: string; // BigInt serialised
  status: ClaimStatus;
  verifiedAt: string | null;
  createdAt: string;
  isVerifiedOwner: boolean;
  isCaller: boolean;
  user: { nickname: string | null; role: string };
}

function MultiClaimView({
  parcel,
  callerHasClaim,
  callerClaim,
  onBack,
  onSubmitted,
}: {
  parcel: MultiClaimViewParcel;
  callerHasClaim: boolean;
  callerClaim: { id: string; role: UserRole; status: ClaimStatus } | null;
  onBack: () => void;
  onSubmitted: (id: string) => void;
}) {
  const [claims, setClaims] = useState<ExistingClaim[] | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);

  // Fetch the public claim list once per parcel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch(`/api/parcels/${parcel.id}/claims`);
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setListErr(data.error ?? "Failed to load claims");
          return;
        }
        setClaims(data.claims ?? []);
      } catch {
        if (!cancelled) setListErr("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parcel.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <BackLink onClick={onBack} label="← Change plot number" />

      {/* Plot summary */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${LINE}`,
          borderRadius: 8,
          padding: 12,
        }}
      >
        <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          Plot {parcel.plotNumber}
        </div>
        <div style={{ fontSize: 12, color: TXT, marginTop: 2 }}>
          {parcel.projectName}
          {parcel.district && parcel.district !== parcel.projectName ? ` · ${parcel.district}` : ""}
        </div>
        <div style={{ fontSize: 10, color: SUBTLE, marginTop: 4 }}>
          This plot is already in ZAAHI. Existing claims are shown below — you can join with your own role.
        </div>
      </div>

      {/* Existing claims list */}
      <div>
        <div
          style={{
            fontSize: 10,
            color: SUBTLE,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          Existing claims {claims ? `(${claims.length})` : ""}
        </div>
        {listErr && <div style={{ fontSize: 11, color: "#EF4444" }}>✕ {listErr}</div>}
        {!claims && !listErr && (
          <div style={{ fontSize: 11, color: SUBTLE }}>Loading…</div>
        )}
        {claims && claims.length === 0 && !listErr && (
          <div
            style={{
              fontSize: 11,
              color: SUBTLE,
              padding: "10px 12px",
              border: `1px dashed ${LINE}`,
              borderRadius: 8,
            }}
          >
            No public claims yet. Be the first to register your role on this plot.
          </div>
        )}
        {claims && claims.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {claims.map((c) => (
              <ClaimRow key={c.id} claim={c} />
            ))}
          </div>
        )}
      </div>

      {/* Add-claim form OR "you already have a claim" notice */}
      <div style={{ height: 1, background: LINE, margin: "4px 0" }} />
      {callerHasClaim ? (
        <div
          style={{
            background: "rgba(45, 106, 79, 0.15)",
            border: "1px solid rgba(45, 106, 79, 0.4)",
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            color: TXT,
            lineHeight: 1.55,
          }}
        >
          You already have a claim on this plot
          {callerClaim
            ? ` — ${formatRoleLabel(callerClaim.role)} · ${claimDisplayLabel(callerClaim.status)}`
            : ""}
          . One user can claim each plot once.
        </div>
      ) : (
        <AddClaimForm parcel={parcel} onSubmitted={onSubmitted} />
      )}
    </div>
  );
}

function ClaimRow({ claim }: { claim: ExistingClaim }) {
  const priceNum = Number(claim.priceAed) / 100; // fils → AED
  return (
    <div
      style={{
        background: claim.isCaller ? "rgba(200,169,110,0.10)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${claim.isCaller ? "rgba(200,169,110,0.35)" : LINE}`,
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 12, color: TXT, fontWeight: 600 }}>
          {claim.user.nickname ?? "—"}
          {claim.isCaller && (
            <span style={{ color: GOLD, fontWeight: 500, fontSize: 10, marginLeft: 6 }}>· you</span>
          )}
        </div>
        <ClaimStatusPill status={claim.status} isVerifiedOwner={claim.isVerifiedOwner} />
      </div>
      <div style={{ fontSize: 11, color: SUBTLE, display: "flex", justifyContent: "space-between" }}>
        <span>{formatRoleLabel(claim.role)}</span>
        <span>
          AED {Number.isFinite(priceNum) && priceNum > 0 ? priceNum.toLocaleString("en-US") : "—"}
        </span>
      </div>
    </div>
  );
}

function ClaimStatusPill({
  status,
  isVerifiedOwner,
}: {
  status: ClaimStatus;
  isVerifiedOwner: boolean;
}) {
  // Verified-owner claims get a stronger badge per spec §5.4.1 LOCK-8.
  let bg = "rgba(255,255,255,0.06)";
  let bd = LINE;
  let fg = SUBTLE;
  let label: string = claimDisplayLabel(status);
  if (status === "VERIFIED") {
    bg = "rgba(45, 106, 79, 0.18)";
    bd = "rgba(45, 106, 79, 0.45)";
    fg = "#7ABF99";
    label = isVerifiedOwner ? "Verified owner" : "Verified";
  } else if (status === "PENDING") {
    bg = "rgba(230, 126, 34, 0.18)";
    bd = "rgba(230, 126, 34, 0.45)";
    fg = "#E8A86A";
    label = "Pending verification";
  } else if (status === "SELF_DECLARED") {
    bg = "rgba(255,255,255,0.04)";
    bd = LINE;
    fg = SUBTLE;
    label = "Self-declared";
  }
  return (
    <span
      title={status === "SELF_DECLARED" ? "Self-declared, not verified" : undefined}
      style={{
        background: bg,
        border: `1px solid ${bd}`,
        color: fg,
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

function formatRoleLabel(role: UserRole | string): string {
  const found = CLAIM_ROLE_OPTIONS.find((o) => o.value === role);
  return found ? found.label : String(role);
}

function AddClaimForm({
  parcel,
  onSubmitted,
}: {
  parcel: MultiClaimViewParcel;
  onSubmitted: (id: string) => void;
}) {
  const [role, setRole] = useState<UserRole>("OWNER");
  const [askingPrice, setAskingPrice] = useState("");
  // Map of doc-kind -> file. One file per kind keeps the UI compact;
  // server accepts multiple per kind via "file_<kind>_<index>" naming.
  const [docs, setDocs] = useState<Partial<Record<ClaimDocKind, File>>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ claimId: string; status: ClaimStatus } | null>(null);

  const requirement = PLOT_CLAIM_DOC_REQUIREMENTS[role];
  const verifiable = isVerifiableRole(role);

  function handleDocChange(kind: ClaimDocKind, file: File | null) {
    setDocs((prev) => {
      const next = { ...prev };
      if (file) next[kind] = file;
      else delete next[kind];
      return next;
    });
  }

  async function submit() {
    setErr(null);
    const price = Number(askingPrice) || 0;
    if (price <= 0) return setErr("Stated price required");

    if (requirement.required && requirement.kinds.length > 0) {
      const missing = requirement.kinds.filter((k) => !docs[k]);
      if (missing.length > 0) {
        return setErr(
          `Missing required document${missing.length > 1 ? "s" : ""}: ${missing
            .map((k) => CLAIM_DOC_KIND_LABELS[k])
            .join(", ")}`,
        );
      }
    }

    // File-side validation — mirrors server checks for fast feedback.
    for (const f of Object.values(docs)) {
      if (!f) continue;
      if (f.size > CLAIM_MAX_FILE_BYTES) {
        return setErr(`${f.name} exceeds 10 MB`);
      }
      if (!CLAIM_ALLOWED_MIME.has(f.type)) {
        return setErr(`${f.name}: only PDF, JPG, PNG, WEBP allowed`);
      }
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("data", JSON.stringify({ role, priceAed: price }));
      let i = 0;
      for (const [kind, file] of Object.entries(docs)) {
        if (file) {
          fd.append(`file_${kind}_${i}`, file);
          i++;
        }
      }
      const r = await apiFetch(`/api/parcels/${parcel.id}/claim`, {
        method: "POST",
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data.message ?? data.error ?? "Failed");
        setBusy(false);
        return;
      }
      setDone({ claimId: data.claimId, status: data.status });
      onSubmitted(parcel.id);
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          background: "rgba(45, 106, 79, 0.15)",
          border: "1px solid rgba(45, 106, 79, 0.45)",
          borderRadius: 8,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: "#7ABF99" }}>
          Claim submitted
        </div>
        <div style={{ fontSize: 11, color: SUBTLE, lineHeight: 1.55 }}>
          {done.status === "PENDING"
            ? "An admin will verify your claim. We&apos;ll email you when it&apos;s reviewed — typically within 2–3 business days."
            : done.status === "SELF_DECLARED"
              ? "Your claim is now visible on the plot as self-declared. Verifiable roles (Owner, Broker, Developer, Architect, POA) can also be admin-verified by uploading documents."
              : "Done."}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          fontSize: 10,
          color: SUBTLE,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Add your claim
      </div>
      <Field label="Your role for this plot*">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          style={input()}
        >
          {CLAIM_ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={{ background: "#0a1628", color: TXT }}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <PriceFields price={askingPrice} setPrice={setAskingPrice} />
      {requirement.required && requirement.kinds.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {requirement.kinds.map((k) => (
            <Field key={k} label={`${CLAIM_DOC_KIND_LABELS[k]}*`}>
              <DropZone
                accept="application/pdf,image/*"
                onFile={(f) => handleDocChange(k, f)}
                label={docs[k]?.name ?? CLAIM_DOC_KIND_HINTS[k]}
              />
            </Field>
          ))}
        </div>
      )}
      <div
        style={{
          fontSize: 10,
          color: SUBTLE,
          padding: "6px 0",
          lineHeight: 1.55,
        }}
      >
        {verifiable
          ? "Verifiable role — admins will review your documents and confirm your claim."
          : "This role is self-declared and will be displayed with a “Self-declared, not verified” pill."}
      </div>
      {err && <div style={{ fontSize: 11, color: "#EF4444" }}>✕ {err}</div>}
      <PrimaryBtn onClick={submit} busy={busy}>
        Add claim
      </PrimaryBtn>
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
