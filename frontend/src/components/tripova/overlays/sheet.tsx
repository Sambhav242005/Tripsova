"use client";

import React, { useEffect, useId } from "react";
import type { Theme } from "@/data";
import { Icon } from "../icon";

// Responsive overlay: a bottom sheet on mobile, a centered modal dialog on
// tablet/desktop (md+). Shared by the Create, Notifications and Emergency sheets.
export function Sheet({
  open, onClose, t, children, title,
}: {
  open: boolean; onClose: () => void; t: Theme; children: React.ReactNode; title?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex justify-center items-end md:items-center md:p-6"
      style={{ pointerEvents: "auto" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "rgba(13,19,32,0.55)", opacity: open ? 1 : 0 }}
      />

      {/* Panel: bottom-pinned on mobile, floating card on md+ */}
      <div
        className={[
          "relative w-full max-w-[440px] md:max-w-[480px] overflow-y-auto",
          "rounded-t-[22px] md:rounded-[20px]",
          "transition-transform duration-300 ease-out",
          "translate-y-0 opacity-100 md:scale-100",
        ].join(" ")}
        style={{
          background: t.bg,
          border: `1px solid ${t.border}`,
          boxShadow: "0 -8px 40px rgba(13,19,32,0.3)",
          maxHeight: "90vh",
          paddingBottom: 24,
        }}
      >
        {/* Mobile grabber handle (hidden on desktop) */}
        <div className="flex md:hidden" style={{ justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: t.border }} />
        </div>

        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 12px" }}>
            <span id={titleId} style={{ fontSize: 20, fontWeight: 700 }}>{title}</span>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "none", background: t.tag, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon name="X" size={17} color={t.muted} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
