import Image from "next/image";

const LOGO_SRC = "/brand/tripsova-client-logo.png";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      src={LOGO_SRC}
      width={size}
      height={size}
      alt=""
      unoptimized
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "block",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
}

export function Logo({
  size = 34,
  showTagline = false,
  color,
  taglineColor,
}: {
  size?: number;
  showTagline?: boolean;
  color?: string;
  taglineColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <div style={{ lineHeight: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-dm-serif), Georgia, serif",
            fontSize: Math.round(size * 0.56),
            fontWeight: 600,
            letterSpacing: 1.2,
            color: color || "#1B263B",
          }}
        >
          Tripsova
        </div>
        {showTagline && (
          <div
            style={{
              fontSize: Math.max(8, Math.round(size * 0.26)),
              fontWeight: 700,
              letterSpacing: 0.5,
              color: taglineColor || "#8A6A2E",
              marginTop: 3,
            }}
          >
            Discover through people.
          </div>
        )}
      </div>
    </div>
  );
}
