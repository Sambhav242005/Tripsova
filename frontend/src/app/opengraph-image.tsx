import { ImageResponse } from "next/og";

export const alt = "Tripsova — Discover through people";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1B263B, #0F1722)",
          color: "#FAF9F6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              display: "flex",
              width: 128,
              height: 128,
              borderRadius: 30,
              background: "linear-gradient(135deg, #243349, #0F1722)",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #6C8BA7",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 68,
                height: 68,
                borderRadius: 999,
                background: "#0F1722",
                border: "6px solid #6C8BA7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 18, height: 18, borderRadius: 999, background: "#D4B483" }} />
            </div>
          </div>
          <div style={{ fontSize: 104, fontWeight: 800, letterSpacing: -2 }}>Tripsova</div>
        </div>
        <div style={{ marginTop: 30, fontSize: 40, color: "#D4B483" }}>Discover through people.</div>
        <div style={{ marginTop: 10, fontSize: 24, color: "#9FB2C9" }}>Powered by Travellers</div>
      </div>
    ),
    { ...size },
  );
}
