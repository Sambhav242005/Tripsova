// Tripsova brand palette (see docs/superpowers/specs/2026-06-07-tripsova-rebrand-design.md)
// Source palette: Midnight Navy #1B263B · Dusty Blue #6C8BA7 · Champagne Gold #D4B483
//                 Off White #FAF9F6 · Pearl Grey #ECECEC · Graphite #2E2E2E
export const LIGHT = {
  bg: "#FAF9F6",        // Off White
  bg2: "#ECECEC",       // Pearl Grey
  card: "#FFFFFF",
  accent: "#1B263B",    // Midnight Navy (primary)
  secondary: "#6C8BA7", // Dusty Blue
  gold: "#B0894A",      // Champagne (darkened for legible text/icons on light)
  goldFill: "#D4B483",  // Champagne Gold (fills, icon-on-navy)
  text: "#2E2E2E",      // Graphite
  heading: "#1B263B",   // Navy
  muted: "#6E7681",
  border: "#E4E2DC",
  success: "#3F8F5B",
  warning: "#C8922E",
  danger: "#C0492F",
  overlay: "rgba(27,38,59,0.05)",
  tag: "#EFEDE8",
  teal: "#5E8295",      // remapped to slate-blue
};

export const DARK = {
  bg: "#11161F",
  bg2: "#161D29",
  card: "#1C2533",
  accent: "#8AA9C6",    // lightened dusty blue for contrast on dark
  secondary: "#6C8BA7",
  gold: "#D9B871",
  goldFill: "#E3C58A",
  text: "#E6E8EC",
  heading: "#F4F6F9",
  muted: "#93A0B2",
  border: "#2A3344",
  success: "#5FB87C",
  warning: "#E0B25A",
  danger: "#E0775C",
  overlay: "rgba(230,232,236,0.05)",
  tag: "#222C3B",
  teal: "#6FA0B5",
};

export type Theme = typeof LIGHT;
