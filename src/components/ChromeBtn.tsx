"use client";

/**
 * ChromeBtn — the unified ZAAHI glass button.
 *
 * Extracted from src/app/parcels/map/page.tsx (the original
 * 5×5 map button stack — zoom, compass, 3D, basemap, drone,
 * layers, legend, etc.) so dashboard / sidepanel / modals can
 * share the same affordance with one import.
 *
 * Behaviour (founder spec 2026-05-29 + 2026-05-31 Phase 1):
 *   • rest    : CHROME_BTN_BG (rgba(0,0,0,0.35)) + blur(20) +
 *               1px white-15% border, white icon, 0 8px 20px
 *               black-30% shadow. Slightly darker than PANEL_BG
 *               so the button reads as "indented" on a panel.
 *   • hover   : 1px gold border + rgba(200,169,110,0.25) bg + gold
 *               icon. Animated via direct style.borderColor /
 *               background / color flips (so the inline-style merge
 *               survives without needing a wrapping CSS class).
 *   • active  : same as hover (lights up the toggle state).
 *
 * Phase 1 (2026-05-31): polymorphic `as` prop so HeaderBar links
 * to /admin/queue and /dashboard can render <a>/<Link> while
 * sharing the same chrome as the <button> versions. Mirrors the
 * Panel.tsx pattern.
 *
 * `c` (ChromeTheme) was a legacy prop on the in-page version — it
 * was never read inside the body, just plumbed through. Dropped
 * here. If a caller needs theme-conditional chrome, pass a `style`
 * override.
 */

import {
  type CSSProperties,
  type ElementType,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  GOLD,
  CHROME_BTN_BG,
  CHROME_BTN_BORDER,
  CHROME_BTN_BORDER_COLOR,
  CHROME_BTN_HOVER_BG,
  CHROME_BTN_HOVER_BORDER,
  CHROME_BTN_SHADOW,
  CHROME_BTN_SIZE_DEFAULT,
  CHROME_BTN_RADIUS,
  PANEL_BLUR,
  TRANSITION_FAST,
  TXT,
} from "@/lib/design-tokens";

export interface ChromeBtnProps {
  /** Tooltip + default aria-label. Required for a11y. */
  title: string;
  /**
   * Click handler. Wrap in your own gate if you need disabled.
   * Optional — `<a>`/`<Link>` callsites navigate via href and
   * don't need a JS handler.
   */
  onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
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
   * affordances (HeaderBar), 36 for primary chrome groups. Border-
   * radius stays 8px regardless — the look is consistent across sizes.
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
  /**
   * HTML element. Default "button". Pass "a" for an anchor (with
   * `href` via the rest spread), Next "Link" or a custom polymorphic
   * component for routed navigation. The chrome and behaviour stay
   * identical across tags.
   */
  as?: ElementType;
  /** href for <a> / <Link> renderings. Ignored when as is "button". */
  href?: string;
  /** target attr for <a> renderings. */
  target?: string;
  /** rel attr for <a> renderings. */
  rel?: string;
}

export function ChromeBtn({
  title,
  onClick,
  children,
  active,
  size = CHROME_BTN_SIZE_DEFAULT,
  style,
  ariaLabel,
  as,
  href,
  target,
  rel,
}: ChromeBtnProps) {
  const isActive = !!active;
  const Tag: ElementType = as ?? "button";
  // Anchor / Link tags don't have a `type` attribute and shouldn't
  // get aria-pressed. The button tag both helps screen readers
  // (toggle press state) and avoids accidental form submit.
  const tagProps: Record<string, unknown> =
    Tag === "button"
      ? {
          type: "button",
          "aria-pressed": active != null ? isActive : undefined,
        }
      : {
          href,
          target,
          rel,
        };
  return (
    <Tag
      title={title}
      aria-label={ariaLabel ?? title}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: CHROME_BTN_RADIUS,
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
        textDecoration: "none",
        transition: TRANSITION_FAST,
        ...style,
      }}
      onMouseEnter={(e: ReactMouseEvent<HTMLElement>) => {
        e.currentTarget.style.borderColor = GOLD;
        e.currentTarget.style.background = CHROME_BTN_HOVER_BG;
        e.currentTarget.style.color = GOLD;
      }}
      onMouseLeave={(e: ReactMouseEvent<HTMLElement>) => {
        e.currentTarget.style.borderColor = isActive
          ? GOLD
          : CHROME_BTN_BORDER_COLOR;
        e.currentTarget.style.background = isActive
          ? CHROME_BTN_HOVER_BG
          : CHROME_BTN_BG;
        e.currentTarget.style.color = isActive ? GOLD : TXT;
      }}
      {...tagProps}
    >
      {children}
    </Tag>
  );
}
