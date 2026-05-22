"use client";

// Small reusable hook — when the component renders, attach a global
// keydown listener that fires onClose() on Escape. Cleans up on unmount.
//
// Used by the vault modal + side-panel components on Day 12 (polish):
// ShareModal, PromoteToPublicModal, ConflictDetailModal,
// VaultSidePanelAdapter.

import { useEffect } from "react";

export function useEscapeClose(onClose: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, enabled]);
}
