"use client";

import React, { useState, useEffect } from "react";
import type { Theme } from "@/data";
import { Card } from "../primitives/index";
import { api } from "@/lib/api";
import type { OfflinePackResponse } from "@/lib/types";

interface MapRegion {
  name: string;
  size: string;
  trails: number;
  note: string;
  warning: boolean;
}

function regionSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function OfflineMapsScreen({ t }: { t: Theme }) {
  const [maps, setMaps] = useState<MapRegion[]>([]);
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const packs = await api.get<OfflinePackResponse[]>("/api/offline/packs");
        if (packs && packs.length > 0) {
          const regions: MapRegion[] = packs.map(p => ({
            name: p.title || "Unknown Region",
            size: p.size_bytes ? `${Math.round(p.size_bytes / (1024 * 1024))} MB` : "—",
            trails: 0,
            note: p.generated_at ? `Generated ${new Date(p.generated_at).toLocaleDateString()}` : "",
            warning: false,
          }));
          setMaps(regions);
          const dl: Record<string, boolean> = {};
          packs.forEach(p => { if (p.title) dl[p.title] = true; });
          setDownloaded(dl);
        }
      } catch {
        // no packs available — empty state shown below
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startDownload = async (name: string) => {
    setDownloading(d => ({ ...d, [name]: true }));
    setDownloadError(null);
    try {
      await api.post("/api/offline/packs", { destinationId: regionSlug(name) });
      setDownloaded(d => ({ ...d, [name]: true }));
    } catch {
      setDownloadError(`Failed to download ${name}. Please try again.`);
    } finally {
      setDownloading(d => ({ ...d, [name]: false }));
    }
  };

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <div style={{ background: `linear-gradient(135deg,${t.teal}12,${t.accent}08)`, borderRadius: 12, padding: "13px 16px", marginBottom: 20, border: `1px solid ${t.teal}20` }}>
        <div style={{ fontSize: 14, color: t.teal, fontWeight: 700 }}>🗺 Offline Maps</div>
        <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>Navigate without internet. Essential for remote India.</div>
      </div>
      {downloadError && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: t.danger + "15", border: `1px solid ${t.danger}30`, color: t.danger, fontSize: 12, marginBottom: 12 }}>{downloadError}</div>
      )}
      {!loading && maps.length === 0 && (
        <Card t={t} style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 6 }}>No offline maps yet</div>
          <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.5 }}>Map packs will appear here once regions are available to download.</div>
        </Card>
      )}
      {maps.map(m => (
        <Card key={m.name} t={t}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{m.name}</div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{m.size}{m.trails > 0 ? ` · ${m.trails} trails mapped` : ""}</div>
              {m.warning && <div style={{ fontSize: 11, color: t.warning, marginTop: 4, fontStyle: "italic" }}>⚠ {m.note}</div>}
              {!m.warning && m.note && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{m.note}</div>}
            </div>
            {downloaded[m.name] ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: t.success }}>✓ Downloaded</span>
            ) : downloading[m.name] ? (
              <span style={{ fontSize: 12, color: t.accent, fontStyle: "italic" }}>Downloading...</span>
            ) : (
              <button onClick={() => startDownload(m.name)} style={{ padding: "7px 14px", borderRadius: 6, border: `1.5px solid ${t.accent}`, background: t.accent + "12", color: t.accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Download</button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
