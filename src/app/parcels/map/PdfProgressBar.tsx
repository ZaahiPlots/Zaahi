"use client";

// Visual progress indicator for PDF download / generation actions.
//
// Animation contract (founder spec):
//   • busy → false-to-true: bar fades in, fills to 95% over 1.5 s.
//   • busy stays true: bar holds at 95% (real network work still in flight).
//   • busy → true-to-false: bar completes to 100% over 200 ms, then fades out.
//
// Pure UI — does NOT measure actual download progress (browser fetch
// streams don't expose total bytes for arbitrary endpoints). The
// simulated curve is honest: it shows motion during the operation and
// completes when the caller flips busy off. No fake-precision.

import { useEffect, useState } from "react";

const GOLD = "#C8A96E";

export function PdfProgressBar({ busy }: { busy: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (busy) {
      // Mount + immediately bump to 95% (CSS transition handles the slide).
      setVisible(true);
      setProgress(0);
      // Two-frame wait so the browser registers `width: 0` before the
      // transition target lands — otherwise width: 95% appears instantly.
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setProgress(95));
        // Cleanup the second RAF if the caller flips busy off fast.
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }

    if (visible) {
      // Complete the run, then fade out.
      setProgress(100);
      const t = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 350);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [busy, visible]);

  if (!visible) return null;

  // Transition tuning by phase. Initial 0→95 is the 1.5s "fast then hold"
  // curve. 95→100 is a quick 200ms completion. The fill width is bound
  // directly to `progress`; the transition timing-function does the rest.
  const transitionMs =
    progress === 0 ? 0 :
    progress === 100 ? 200 :
    1500;
  const easing = progress === 100 ? "ease-out" : "cubic-bezier(0.16, 1, 0.3, 1)";

  return (
    <div style={trackStyle} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <div
        style={{
          ...fillStyle,
          width: `${progress}%`,
          transition: `width ${transitionMs}ms ${easing}`,
        }}
      />
    </div>
  );
}

const trackStyle: React.CSSProperties = {
  height: 3,
  width: "100%",
  marginTop: 6,
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 2,
  overflow: "hidden",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const fillStyle: React.CSSProperties = {
  height: "100%",
  background: `linear-gradient(90deg, rgba(200, 169, 110, 0.45) 0%, ${GOLD} 100%)`,
  boxShadow: `0 0 8px rgba(200, 169, 110, 0.6)`,
};
