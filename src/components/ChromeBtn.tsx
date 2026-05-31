"use client";

/**
 * ChromeBtn — the unified ZAAHI glass button.
 *
 * Extracted from src/app/parcels/map/page.tsx (the original
 * 5×5 map button stack — zoom, compass, 3D, basemap, drone,
 * layers, legend, etc.) so dashboard / sidepanel / modals can
 * share the same affordance with one import.
 *
 * Behaviour (founder spec 2026-05-29):
 *   • rest    : rgba(0,0,0,0.3) + blur(16) + 1px white-15% border,
 *               white icon, 0 8px 20px black-30% shadow.
 *   • hover   : 1px gold border + rgba(200,169,110,0.25) bg + gold
 *               icon. Animated via direct style.borderColor /
 *               background / color flips (so the inline-style merge
 *               survives without needing a wrapping CSS class).
 *   • active  : same as hover (lights up the toggle state).
 *
 * `c` (ChromeTheme) was a legacy prop on the in-page version — it
 * was never read inside the body, just plumbed through. Dropped
 * here. If a caller needs theme-conditional chrome, pass a `style`
 * override.
 */

import { type CSSProperties, type ReactNode } from "react";
import {
  GOLD,
  CHROME_BTN_BG,
  CHROME_BTN_BORDER,
  CHROME_BTN_BORDER_COLOR,
  CHROME_BTN_HOVER_BG,
  CHROME_BTN_HOVER_BORDER,
  CHROME_BTN_SHADOW,
  PANEL_BLUR,
  TRANSITION_FAST,
  TXT,
} from "@/lib/design-tokens";

export interface ChromeBtnProps {
  /** Tooltip + default aria-label. Required for a11y. */
  title: string;
  /** Click handler. Wrap in your own gate if you need disabled. */
  onClick: () => void;
  /** Icon, label, or any inline content. */
  children: ReactNode;
  /**
   * Active / toggle-on state. When true the button paints in the
   * hover palette permanently (gold border + gold-25% bg + gold icon)
   * and exposes aria-pressed for screen readers.
   */
  active?: boolean;
  /**
   * Override the default 32×32 footprint. Use 28 for inline header
   * affordances, 36 for primary chrome groups. Border-radius stays
   * 8px regardless — the look is consistent across sizes.
   */
  size?: number;
  /**
   * Inline style override (font-size, padding, position, etc.).
   * Merged AFTER the token defaults so callers can adjust layout
   * without losing the glass chrome.
   */
  style?: CSSProperties;
  /**
   * Override the auto-derived aria-label. Defaults to `title`.
   * Use when the visible title is decorative and you want the
   * screen reader to hear something else.
   */
  ariaLabel?: string;
}

export function ChromeBtn({
  title,
  onClick,
  children,
  active,
  size = 32,
  style,
  ariaLabel,
}: ChromeBtnProps) {
  const isActive = !!active;
  return (
    <button
      title={title}
      aria-label={ariaLabel ?? title}
      aria-pressed={active != null ? isActive : undefined}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        border: isActive ? CHROME_BTN_HOVER_BORDER : CHROME_BTN_BORDER,
        background: isActive ? CHROME_BTN_HOVER_BG : CHROME_BTN_BG,
        backdropFilter: PANEL_BLUR,
        WebkitBackdropFilter: PANEL_BLUR,
        color: isActive ? GOLD : TXT,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: CHROME_BTN_SHADOW,
        padding: 0,
        fontFamily: "inherit",
        transition: TRANSITION_FAST,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = GOLD;
        e.currentTarget.style.background = CHROME_BTN_HOVER_BG;
        e.currentTarget.style.color = GOLD;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isActive
          ? GOLD
          : CHROME_BTN_BORDER_COLOR;
        e.currentTarget.style.background = isActive
          ? CHROME_BTN_HOVER_BG
          : CHROME_BTN_BG;
        e.currentTarget.style.color = isActive ? GOLD : TXT;
      }}
    >
      {children}
    </button>
  );
}
