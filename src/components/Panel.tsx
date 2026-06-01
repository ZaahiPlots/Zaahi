"use client";

/**
 * Panel — the unified ZAAHI glassmorphism surface.
 *
 * Wraps the navy-tint glass quartet (PANEL_BG + blur(20) + 1px
 * white-15% border + 16/64 black-40% shadow) so every card / aside
 * / modal / dropdown picks up the same chrome with one import.
 *
 * Phase 1 (founder spec 2026-05-31): polymorphic `as` prop so
 * SidePanel and similar full-height side surfaces can render a
 * semantic <aside> instead of being forced into a <div>.
 *
 * Usage:
 *
 *   <Panel style={{ padding: 16 }}>
 *     ...
 *   </Panel>
 *
 *   <Panel as="aside" radius={RADIUS_EDGE} className="…">
 *     ...
 *   </Panel>
 *
 *   <Panel radius={RADIUS_CARD} noShadow style={{ position: "absolute" }}>
 *     ...
 *   </Panel>
 *
 * If you need to override the tokens themselves, raise it with the
 * founder first. The whole point of unification is one look across
 * the app — drift through `style={{ background: … }}` defeats that.
 */

import { forwardRef, type CSSProperties, type ElementType, type HTMLAttributes } from "react";
import {
  PANEL_BG,
  PANEL_BLUR,
  PANEL_BORDER,
  PANEL_SHADOW,
  RADIUS_PANEL,
  TXT,
} from "@/lib/design-tokens";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  /**
   * HTML tag for the wrapper. Default "div". Pass "aside" for
   * full-height side panels (SidePanel), "section" / "nav" for
   * semantic regions. The component still renders the same
   * glassmorphism quartet regardless of tag.
   */
  as?: ElementType;
  /**
   * Border radius in px. Default `RADIUS_PANEL` (12). Pass
   * `RADIUS_CARD` (6) for hover popups, `RADIUS_PILL` (999) for
   * capsule controls, `RADIUS_EDGE` (0) for full-height side
   * panels flush to the viewport edge.
   */
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

export const Panel = forwardRef<HTMLElement, PanelProps>(function Panel(
  { as: Tag = "div", radius = RADIUS_PANEL, noShadow, noBlur, style, children, ...rest },
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
    <Tag ref={ref} style={merged} {...rest}>
      {children}
    </Tag>
  );
});
