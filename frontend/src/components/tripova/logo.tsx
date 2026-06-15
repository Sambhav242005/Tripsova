// Tripsova brand mark — inline SVG, crisp at every size, no external image needed.
export function LogoMark({ size = 32 }: { size?: number }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      fill="none"
      style={{ flexShrink: 0, display: "block", borderRadius: "50%" }}
    >
      {/* Navy disc */}
      <circle cx="16" cy="16" r="16" fill="#1B263B" />
      {/* Subtle inner glow */}
      <circle cx="16" cy="16" r="14" fill="url(#g)" opacity="0.35" />
      {/* Gold serif T */}
      <text
        x="16"
        y="22.5"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="18"
        fontWeight="700"
        fill="#D4B483"
        letterSpacing="0.5"
      >
        T
      </text>
      {/* Subtle arc — travel / orbit accent */}
      <path
        d="M6 20.5 Q10 26 16 26 Q22 26 26 20.5"
        stroke="#D4B483"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Small dot on arc (airplane/waypoint) */}
      <circle cx="22" cy="23.2" r="1.5" fill="#D4B483" opacity="0.6" />
      <defs>
        <radialGradient id="g" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#D4B483" stopOpacity="0.3" />
          <stop offset="1" stopColor="#D4B483" stopOpacity="0" />
        </radialGradient>
      </defs>
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
