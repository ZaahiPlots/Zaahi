"use client";

/**
 * Panel — the unified ZAAHI glassmorphism surface.
 *
 * Wraps the rgba(0,0,0,0.3) + blur(16) + 1px white-15% border +
 * 16px 64px black-40% shadow quartet (founder spec 2026-05-29) so
 * every card / aside / modal / dropdown picks up the same chrome
 * with one import.
 *
 * Usage:
 *
 *   <Panel style={{ padding: 16 }}>
 *     ...
 *   </Panel>
 *
 *   <Panel radius={16} noShadow style={{ position: "absolute", top: 0 }}>
 *     ...
 *   </Panel>
 *
 *   // className escape hatch for layout-only utilities
 *   <Panel className="sm:w-[320px] sm:h-full">…</Panel>
 *
 * If you need to override the tokens themselves, raise it with the
 * founder first. The whole point of unification is one look across
 * the app — drift through `style={{ background: … }}` defeats that.
 */

import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import {
  PANEL_BG,
  PANEL_BLUR,
  PANEL_BORDER,
  PANEL_SHADOW,
  TXT,
} from "@/lib/design-tokens";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Border radius in px. Default 12. Pass 0 for sharp panels. */
  radius?: number;
  /** Drop the default 16px 64px shadow (e.g. for nested cards). */
  noShadow?: boolean;
  /**
   * Drop the backdrop-filter blur. Rare — only use when the parent
   * already blurs (Safari nested blurs degrade visibly) or when the
   * panel sits over an already-rendered solid background.
   */
  noBlur?: boolean;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { radius = 12, noShadow, noBlur, style, children, ...rest },
  ref,
) {
  const merged: CSSProperties = {
    background: PANEL_BG,
    backdropFilter: noBlur ? undefined : PANEL_BLUR,
    WebkitBackdropFilter: noBlur ? undefined : PANEL_BLUR,
    border: PANEL_BORDER,
    borderRadius: radius,
    boxShadow: noShadow ? undefined : PANEL_SHADOW,
    color: TXT,
    ...style,
  };
  return (
    <div ref={ref} style={merged} {...rest}>
      {children}
    </div>
  );
});
