import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #243349, #0F1722)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 96,
            height: 96,
            borderRadius: 999,
            background: "#0F1722",
            border: "10px solid #6C8BA7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 26, height: 26, borderRadius: 999, background: "#D4B483" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
