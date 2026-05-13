"use client";

// ZAAHI Vault — main list view container for /vault.
//
// Three tabs (mine / shared / conflicts) over the same table chrome.
// Filters: stage multi-select, free-text search. Cursor pagination via
// "Load more" button — keeps initial render lean.

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { AddPlotWizard } from "@/app/parcels/map/AddPlotWizard";
import { useEscapeClose } from "@/app/parcels/map/useEscapeClose";
import { VaultListItem } from "./VaultListItem";
import { ConflictsTab } from "./ConflictsTab";
import { EmptyState } from "./EmptyState";
import {
  TAB_LABELS,
  VAULT_STAGE_LABELS,
  type TabKey,
  type VaultEntryShareSummary,
  type VaultEntrySummary,
  type VaultStage,
} from "./types";

const GOLD = "#C8A96E";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";
const BG_GLASS = "rgba(10, 22, 40, 0.5)";

interface Props {
  selfUserId: string;
}

export function VaultListView({ selfUserId }: Props) {
  const [tab, setTab] = useState<TabKey>("mine");
  const [stageFilter, setStageFilter] = useState<VaultStage | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Bumped on every wizard success so OwnedList re-fetches without us
  // needing an imperative ref handle.
  const [refreshKey, setRefreshKey] = useState(0);
  const [showWizard, setShowWizard] = useState(false);

  // Debounce search input — typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  function openWizard() {
    setShowWizard(true);
  }

  function handleWizardSuccess() {
    setShowWizard(false);
    setTab("mine");
    setRefreshKey((k) => k + 1);
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>My vault</h1>
          <p style={subduedStyle}>
            Personal plot tracker. Private to you unless you choose to share.
          </p>
        </div>
        <button onClick={openWizard} style={addButtonStyle} aria-label="Add a plot to your vault">
          + Add to vault
        </button>
      </div>

      <div style={tabsRowStyle}>
        {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={tabButtonStyle(tab === k)}
          >
            {TAB_LABELS[k]}
          </button>
        ))}
      </div>

      {(tab === "mine" || tab === "shared") && (
        <div style={filterRowStyle}>
          <input
            type="search"
            placeholder="Search plot number or district…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInputStyle}
          />
          {tab === "mine" && (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as VaultStage | "")}
              style={selectStyle}
            >
              <option value="">All stages</option>
              {(Object.keys(VAULT_STAGE_LABELS) as VaultStage[]).map((s) => (
                <option key={s} value={s}>
                  {VAULT_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div style={tableShellStyle}>
        <div style={tableHeaderRowStyle}>
          <div>Plot</div>
          <div>Stage</div>
          <div>Asking price</div>
          <div>{tab === "shared" ? "—" : "Next follow-up"}</div>
          <div>{tab === "shared" ? "Permission" : "Shares"}</div>
          <div>Attribution</div>
        </div>

        {tab === "mine" && (
          <OwnedList
            stageFilter={stageFilter}
            search={debouncedSearch}
            selfUserId={selfUserId}
            refreshKey={refreshKey}
            onAddClick={openWizard}
          />
        )}
        {tab === "shared" && <SharedList search={debouncedSearch} />}
        {tab === "conflicts" && (
          <ConflictsTab selfUserId={selfUserId} onPriceSaved={() => {}} />
        )}
      </div>

      {showWizard && (
        <AddPlotWizardModal
          onCreated={handleWizardSuccess}
          onCancel={() => setShowWizard(false)}
          onExistingFound={handleWizardSuccess}
        />
      )}
    </div>
  );
}

// ── Add Plot Wizard modal wrapper ──
//
// AddPlotWizard renders its 3-step body without a backdrop — this wrapper
// adds the dialog chrome (glassmorphism backdrop, centered card, Esc close).

function AddPlotWizardModal({
  onCreated,
  onCancel,
  onExistingFound,
}: {
  onCreated: (entryId: string) => void;
  onCancel: () => void;
  onExistingFound: (existingId: string) => void;
}) {
  useEscapeClose(onCancel);
  return (
    <div onClick={onCancel} style={modalBackdropStyle}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={modalPanelStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Add a plot to your vault"
      >
        <div style={modalHeaderStyle}>
          <div style={modalTinyLabelStyle}>Add a plot to your vault</div>
          <button onClick={onCancel} style={modalCloseButtonStyle} aria-label="Close">
            ×
          </button>
        </div>
        <AddPlotWizard
          onCreated={onCreated}
          onCancel={onCancel}
          onExistingFound={onExistingFound}
        />
      </div>
    </div>
  );
}

// ── "All entries" pane — paginated via cursor ──

function OwnedList({
  stageFilter,
  search,
  selfUserId,
  refreshKey,
  onAddClick,
}: {
  stageFilter: VaultStage | "";
  search: string;
  selfUserId: string;
  refreshKey: number;
  onAddClick: () => void;
}) {
  const [items, setItems] = useState<VaultEntrySummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor: string | null, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (stageFilter) params.set("stage", stageFilter);
        if (search) params.set("search", search);
        params.set("limit", "50");
        if (cursor) params.set("cursor", cursor);
        const r = await apiFetch(`/api/me/vault/entries?${params.toString()}`);
        if (!r.ok) {
          setError(`Load failed (${r.status})`);
          return;
        }
        const d = (await r.json()) as {
          items: VaultEntrySummary[];
          nextCursor: string | null;
        };
        setItems((prev) => (replace ? d.items : [...prev, ...d.items]));
        setNextCursor(d.nextCursor);
      } catch (e) {
        console.error("[OwnedList] fetch:", e);
        setError("Network error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [stageFilter, search],
  );

  // Reload on filter/search change AND when refreshKey bumps (wizard success).
  useEffect(() => {
    void load(null, true);
  }, [load, refreshKey]);

  function handlePriceSaved(id: string, newPriceFils: string | null) {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, askingPriceFils: newPriceFils } : p)),
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24, color: TEXT_DIM, fontSize: 13 }}>Loading…</div>
    );
  }
  if (error) {
    return <div style={{ padding: 24, color: "#E63946", fontSize: 13 }}>{error}</div>;
  }
  if (items.length === 0) {
    if (stageFilter || search) return <EmptyState kind="filtered-empty" />;
    return <EmptyState kind="no-entries" onAddClick={onAddClick} />;
  }

  return (
    <div>
      {items.map((e) => (
        <VaultListItem
          key={e.id}
          variant="owned"
          entry={e}
          selfUserId={selfUserId}
          onPriceSaved={handlePriceSaved}
        />
      ))}
      {nextCursor && (
        <div style={{ padding: 18, textAlign: "center" }}>
          <button
            onClick={() => void load(nextCursor, false)}
            disabled={loadingMore}
            style={loadMoreButtonStyle}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── "Shared with me" pane ──

function SharedList({ search }: { search: string }) {
  const [items, setItems] = useState<VaultEntryShareSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await apiFetch("/api/vault/shared-with-me");
        if (cancelled) return;
        if (!r.ok) {
          setError(`Load failed (${r.status})`);
          return;
        }
        const d = (await r.json()) as { items: VaultEntryShareSummary[] };
        setItems(d.items);
      } catch (e) {
        console.error("[SharedList] fetch:", e);
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = search
    ? items.filter(
        (s) =>
          s.entry.plotNumber.toLowerCase().includes(search.toLowerCase()) ||
          s.entry.district.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  if (loading) return <div style={{ padding: 24, color: TEXT_DIM, fontSize: 13 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: "#E63946", fontSize: 13 }}>{error}</div>;
  if (filtered.length === 0) {
    if (search) return <EmptyState kind="filtered-empty" />;
    return <EmptyState kind="no-shared" />;
  }

  return (
    <div>
      {filtered.map((s) => (
        <VaultListItem key={s.shareId} variant="shared" share={s} />
      ))}
    </div>
  );
}

// ── Styles (CLAUDE.md UI STYLE GUIDE) ──

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 24,
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
};

const headerStyle: React.CSSProperties = {
  marginBottom: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
};

const addButtonStyle: React.CSSProperties = {
  background: "rgba(200, 169, 110, 0.15)",
  border: `1px solid ${GOLD}`,
  color: GOLD,
  borderRadius: 8,
  padding: "10px 18px",
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  transition: "background 150ms ease, border-color 150ms ease",
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 20,
};

const modalPanelStyle: React.CSSProperties = {
  background: "rgba(10, 22, 40, 0.92)",
  backdropFilter: "blur(24px) saturate(150%)",
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: 22,
  maxWidth: 760,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  paddingBottom: 12,
  borderBottom: `1px solid ${BORDER}`,
};

const modalTinyLabelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: GOLD,
  opacity: 0.8,
};

const modalCloseButtonStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  color: TEXT_DIM,
  borderRadius: 6,
  width: 30,
  height: 30,
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 28,
  fontWeight: 700,
  margin: 0,
  letterSpacing: "-0.02em",
};

const subduedStyle: React.CSSProperties = {
  color: TEXT_DIM,
  fontSize: 13,
  marginTop: 4,
};

const tabsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
  marginBottom: 16,
  borderBottom: `1px solid ${BORDER}`,
};

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "none",
    borderBottom: `2px solid ${active ? GOLD : "transparent"}`,
    color: active ? GOLD : TEXT_DIM,
    padding: "10px 14px",
    fontSize: 12,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "color 150ms ease, border-color 150ms ease",
  };
}

const filterRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginBottom: 12,
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "10px 14px",
  color: TEXT_PRIMARY,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...searchInputStyle,
  flex: 0,
  minWidth: 180,
};

const tableShellStyle: React.CSSProperties = {
  background: BG_GLASS,
  backdropFilter: "blur(16px) saturate(150%)",
  WebkitBackdropFilter: "blur(16px) saturate(150%)",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  overflow: "hidden",
};

const tableHeaderRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr 0.8fr 1.4fr",
  gap: 14,
  padding: "12px 18px",
  background: "rgba(255, 255, 255, 0.03)",
  borderBottom: `1px solid ${BORDER}`,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: TEXT_DIM,
};

const loadMoreButtonStyle: React.CSSProperties = {
  background: "rgba(200, 169, 110, 0.10)",
  border: `1px solid rgba(200, 169, 110, 0.3)`,
  color: GOLD,
  borderRadius: 8,
  padding: "8px 18px",
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
};
