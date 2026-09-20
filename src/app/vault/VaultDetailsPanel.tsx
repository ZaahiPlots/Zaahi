"use client";

// ZAAHI Vault — expanded row panel: broker notes, source, owner contact,
// then price history. Fetches GET /api/me/vault/entries/[id] on mount (the
// list endpoint omits notes). Owner-only; shared rows never render this.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { patchVaultEntry, PHONE_RE } from "./patchEntry";
import { PriceHistoryDropdown } from "./PriceHistoryDropdown";

const GOLD = "#C8A96E";
const RED = "#E63946";
const GREEN = "#2D6A4F";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface OwnerContact {
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
  notes?: string;
}

type ContactKey = keyof OwnerContact;
const CONTACT_FIELDS: { key: ContactKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "notes", label: "Notes" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function VaultDetailsPanel({ entryId }: { entryId: string }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [notesState, setNotesState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [source, setSource] = useState("");
  const [savedSource, setSavedSource] = useState("");
  const [contact, setContact] = useState<OwnerContact>({});
  const [savedContact, setSavedContact] = useState<OwnerContact>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiFetch(`/api/me/vault/entries/${entryId}`);
        if (!r.ok) {
          if (alive) setLoadError(`Load failed (${r.status})`);
          return;
        }
        const d = (await r.json()) as {
          brokerNotes: string | null;
          source: string | null;
          ownerContact: OwnerContact | null;
        };
        if (!alive) return;
        setNotes(d.brokerNotes ?? "");
        setSavedNotes(d.brokerNotes ?? "");
        setSource(d.source ?? "");
        setSavedSource(d.source ?? "");
        setContact(d.ownerContact ?? {});
        setSavedContact(d.ownerContact ?? {});
      } catch (e) {
        console.error("[VaultDetailsPanel] load:", e);
        if (alive) setLoadError("Network error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [entryId]);

  async function saveNotes() {
    setNotesState("saving");
    const err = await patchVaultEntry(entryId, { brokerNotes: notes.trim() ? notes : null });
    if (err) {
      setNotesState("error");
      return;
    }
    setSavedNotes(notes);
    setNotesState("saved");
  }

  async function saveSource() {
    const v = source.trim();
    if (v === savedSource) return;
    const err = await patchVaultEntry(entryId, { source: v || null });
    if (err) {
      setFieldErrors((f) => ({ ...f, source: err }));
      setSource(savedSource);
      return;
    }
    setFieldErrors((f) => ({ ...f, source: "" }));
    setSource(v);
    setSavedSource(v);
  }

  async function saveContactField(key: ContactKey) {
    const v = (contact[key] ?? "").trim();
    if (v === (savedContact[key] ?? "")) return;
    if (key === "phone" && v && !PHONE_RE.test(v)) {
      setFieldErrors((f) => ({ ...f, [key]: "Invalid phone (7–20 digits, + space -)" }));
      return;
    }
    if (key === "email" && v && !EMAIL_RE.test(v)) {
      setFieldErrors((f) => ({ ...f, [key]: "Invalid email" }));
      return;
    }
    const next: OwnerContact = { ...savedContact };
    if (v) next[key] = v;
    else delete next[key];
    const err = await patchVaultEntry(entryId, {
      ownerContact: Object.keys(next).length ? next : null,
    });
    if (err) {
      setFieldErrors((f) => ({ ...f, [key]: err }));
      setContact((c) => ({ ...c, [key]: savedContact[key] }));
      return;
    }
    setFieldErrors((f) => ({ ...f, [key]: "" }));
    setSavedContact(next);
    setContact(next);
  }

  if (loading) return <div style={panelStyle}><span style={{ color: TEXT_DIM, fontSize: 12 }}>Loading…</span></div>;
  if (loadError) return <div style={panelStyle}><span style={{ color: RED, fontSize: 12 }}>{loadError}</span></div>;

  return (
    <div style={panelStyle} data-testid="vault-details">
      <div style={sectionLabel}>Broker notes</div>
      <textarea
        data-testid="broker-notes"
        aria-label="Broker notes"
        value={notes}
        maxLength={8000}
        rows={4}
        placeholder="No notes yet — add context on this plot, owner, or negotiation."
        onChange={(e) => {
          setNotes(e.target.value);
          setNotesState("idle");
        }}
        style={{ ...inputStyle, width: "100%", resize: "vertical" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <button
          data-testid="broker-notes-save"
          onClick={() => void saveNotes()}
          disabled={notesState === "saving" || notes === savedNotes}
          style={saveButtonStyle}
        >
          {notesState === "saving" ? "Saving…" : "Save notes"}
        </button>
        {notesState === "saved" && <span style={{ color: GREEN, fontSize: 11 }}>Saved</span>}
        {notesState === "error" && <span style={{ color: RED, fontSize: 11 }}>Save failed</span>}
      </div>

      <div style={{ ...sectionLabel, marginTop: 18 }}>Source</div>
      <input
        data-testid="source-input"
        aria-label="Source"
        value={source}
        maxLength={40}
        placeholder="e.g. Referral, Cold call"
        onChange={(e) => setSource(e.target.value)}
        onBlur={() => void saveSource()}
        style={{ ...inputStyle, maxWidth: 320 }}
      />
      {fieldErrors.source && <div style={errStyle}>{fieldErrors.source}</div>}

      <div style={{ ...sectionLabel, marginTop: 18 }}>Owner contact</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        {CONTACT_FIELDS.map(({ key, label }) => (
          <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: TEXT_DIM, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
            <input
              data-testid={`contact-${key}`}
              value={contact[key] ?? ""}
              maxLength={key === "notes" ? 2000 : 120}
              onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
              onBlur={() => void saveContactField(key)}
              style={inputStyle}
            />
            {fieldErrors[key] && <span style={errStyle}>{fieldErrors[key]}</span>}
          </label>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <PriceHistoryDropdown entryId={entryId} />
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  padding: "14px 18px 18px 44px",
  borderBottom: `1px solid ${BORDER}`,
  background: "rgba(255, 255, 255, 0.02)",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: GOLD,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  color: TEXT_PRIMARY,
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms ease",
};

const errStyle: React.CSSProperties = { color: RED, fontSize: 11, marginTop: 4 };

const saveButtonStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(200, 169, 110, 0.3)",
  color: GOLD,
  borderRadius: 6,
  padding: "7px 14px",
  fontSize: 11,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "border-color 150ms ease, background 150ms ease",
};
