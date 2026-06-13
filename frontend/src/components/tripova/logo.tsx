import React from "react";

// Tripsova brand mark: a location pin / teardrop framing a moonlit mountain scene.
// Recreated as inline SVG (not the raster logo) so it scales crisply and themes cleanly.
export function LogoMark({ size = 32, rounded = 10 }: { size?: number; rounded?: number }) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Tripsova logo"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#243349" />
          <stop offset="1" stopColor="#0F1722" />
        </linearGradient>
        <linearGradient id={`${id}-pin`} x1="14" y1="8" x2="34" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8AB0D6" />
          <stop offset="1" stopColor="#3F6695" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <circle cx="24" cy="20.5" r="8.5" />
        </clipPath>
      </defs>
      <rect width="48" height="48" rx={rounded} fill={`url(#${id}-bg)`} />
      <path
        d="M24 9c6.6 0 12 5.2 12 11.7 0 8-12 18.3-12 18.3S12 28.7 12 20.7C12 14.2 17.4 9 24 9Z"
        fill={`url(#${id}-pin)`}
      />
      <circle cx="24" cy="20.5" r="8.5" fill="#0F1722" />
      <g clipPath={`url(#${id}-c)`}>
        <circle cx="28.5" cy="16" r="2.6" fill="#D4B483" />
        <path d="M14 29 19 22 22.5 26 26 20.5 34 29Z" fill="#7CA3CC" />
        <path d="M14 29 20.5 24 25 29Z" fill="#A9C4E0" />
      </g>
    </svg>
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
            fontSize: Math.round(size * 0.56),
            fontWeight: 800,
            letterSpacing: 0.2,
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
              color: taglineColor || "#B0894A",
              marginTop: 2,
            }}
          >
            Discover through people.
          </div>
        )}
      </div>
    </div>
  );
}
