import React from "react";

// Tripsova brand mark: a deep-navy disc with a gold serif "T", an airplane
// taking off, and a dashed flight-path orbit. Recreated as inline SVG (not the
// raster logo) so it scales crisply and themes cleanly across light/dark.
export function LogoMark({ size = 32 }: { size?: number; rounded?: number }) {
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
        <radialGradient id={`${id}-bg`} cx="0.32" cy="0.26" r="0.95">
          <stop stopColor="#21365C" />
          <stop offset="1" stopColor="#0C1730" />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="12" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EBD292" />
          <stop offset="0.55" stopColor="#D4B06A" />
          <stop offset="1" stopColor="#B98E3F" />
        </linearGradient>
      </defs>

      {/* navy disc with a faint gold rim */}
      <circle cx="24" cy="24" r="23" fill={`url(#${id}-bg)`} />
      <circle cx="24" cy="24" r="23" fill="none" stroke={`url(#${id}-gold)`} strokeOpacity="0.35" strokeWidth="1" />

      {/* dashed flight-path orbit sweeping up to the plane */}
      <path
        d="M12.5 30.5 C 18.5 36.5, 30.5 33.5, 35 19.5"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeDasharray="0.4 3.1"
        fill="none"
      />

      {/* serif T */}
      <text
        x="22.5"
        y="33"
        textAnchor="middle"
        fontFamily="var(--font-dm-serif), Georgia, 'Times New Roman', serif"
        fontSize="27"
        fontWeight={500}
        fill={`url(#${id}-gold)`}
      >
        T
      </text>

      {/* airplane lifting off (lucide plane silhouette) */}
      <g transform="translate(25.5 2.4) scale(0.58)">
        <path
          d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
          fill={`url(#${id}-gold)`}
        />
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
              color: taglineColor || "#B0894A",
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
