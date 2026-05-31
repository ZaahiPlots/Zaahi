"use client";

/**
 * Panel — the unified ZAAHI glassmorphism surface.
 *
 * Wraps the navy-tint glass stack (PANEL_BG + PANEL_BLUR + gold
 * 50% border + inner-top highlight + drop shadow) so every card /
 * aside / modal / dropdown picks up the same chrome with one import.
 *
 * Phase "Clear Glass C" (founder spec 2026-06-01): blur dropped
 * from 20 to 2 px, border moved from white-15% to gold-50%, and a
 * 1px inset-top highlight was added so the pane reads as a 3D piece
 * of glass over the live map instead of a matte navy card. Text
 * INSIDE a Panel must use TEXT_SHADOW_STRONG so the body copy stays
 * legible against arbitrary basemap noise underneath.
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
  PANEL_INNER_HIGHLIGHT,
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
  // Clear-glass C (founder spec 2026-06-01): boxShadow stacks the
  // outer drop shadow with the inner-top highlight, so the pane has
  // a beveled top edge plus depth against the map underneath.
  // noShadow drops only the drop shadow — the inner highlight stays
  // because it's the cheap visual cue that the surface is glass.
  const boxShadow = noShadow
    ? PANEL_INNER_HIGHLIGHT
    : `${PANEL_INNER_HIGHLIGHT}, ${PANEL_SHADOW}`;
  const merged: CSSProperties = {
    background: PANEL_BG,
    backdropFilter: noBlur ? undefined : PANEL_BLUR,
    WebkitBackdropFilter: noBlur ? undefined : PANEL_BLUR,
    border: PANEL_BORDER,
    borderRadius: radius,
    boxShadow,
    color: TXT,
    ...style,
  };
  return (
    <Tag ref={ref} style={merged} {...rest}>
      {children}
    </Tag>
  );
});
