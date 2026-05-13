"use client";

// ZAAHI Vault — "Conflicts (N)" tab pane.
// Filtered list of caller's entries where conflictsWithOthers=true.
// Shares the same VaultListItem rendering as the main list.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { VaultListItem } from "./VaultListItem";
import { EmptyState } from "./EmptyState";
import type { VaultEntrySummary } from "./types";

interface Props {
  selfUserId: string;
  onPriceSaved: (id: string, newPriceFils: string | null) => void;
}

interface ConflictsResponse {
  items: VaultEntrySummary[];
  total: number;
}

export function ConflictsTab({ selfUserId, onPriceSaved }: Props) {
  const [items, setItems] = useState<VaultEntrySummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await apiFetch("/api/me/vault/conflicts");
        if (cancelled) return;
        if (!r.ok) {
          setError(`Load failed (${r.status})`);
          return;
        }
        const d = (await r.json()) as ConflictsResponse;
        setItems(d.items);
      } catch (e) {
        console.error("[ConflictsTab] fetch:", e);
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

  if (loading) {
    return (
      <div style={{ padding: 24, color: "rgba(255, 255, 255, 0.55)", fontSize: 13 }}>
        Loading conflicts…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 24, color: "#E63946", fontSize: 13 }}>{error}</div>
    );
  }
  if (!items || items.length === 0) {
    return <EmptyState kind="no-conflicts" />;
  }

  return (
    <div>
      {items.map((e) => (
        <VaultListItem
          key={e.id}
          variant="owned"
          entry={e}
          selfUserId={selfUserId}
          onPriceSaved={onPriceSaved}
        />
      ))}
    </div>
  );
}
