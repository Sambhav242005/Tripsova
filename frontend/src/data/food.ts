export interface FoodType {
  id: string;
  label: string;
  emoji: string;
  color: string;
  desc: string;
}

export const ALL_FOOD_TYPES: FoodType[] = [
  { id: "jain", label: "Jain", emoji: "🟡", color: "#C0934A", desc: "No root vegetables, separate prep" },
  { id: "pure_veg", label: "Pure Veg", emoji: "🟢", color: "#3E7D5A", desc: "Strictly vegetarian, no egg" },
  { id: "vegan", label: "Vegan", emoji: "🟣", color: "#7A6A9E", desc: "No animal products" },
  { id: "veg_egg", label: "Veg + Egg", emoji: "🟤", color: "#9A7E5E", desc: "Vegetarian including eggs" },
  { id: "halal", label: "Halal", emoji: "🔵", color: "#4A7A95", desc: "Halal certified" },
  { id: "gluten", label: "Gluten-Free", emoji: "⚪", color: "#7C8794", desc: "No wheat, barley, rye" },
  { id: "sattvic", label: "Sattvic", emoji: "🔴", color: "#9E5048", desc: "No onion, garlic, or meat" },
  { id: "kosher", label: "Kosher", emoji: "✡️", color: "#4A6A8A", desc: "Kosher certified" },
  { id: "buddhist", label: "Buddhist Veg", emoji: "☸️", color: "#8A7A4A", desc: "No meat, often no egg" },
  { id: "everything", label: "Everything", emoji: "🌐", color: "#8A93A0", desc: "No restrictions" },
];

// Maps a catalog chip id to the diet tag values the backend may store. Keeps the
// frontend matching in sync with backend/app/shared/diet.py. Some seed tags use
// alternate names (Sattvic data is stored as NO_ONION_GARLIC).
const DIET_ALIASES: Record<string, string[]> = {
  jain: ["JAIN"],
  pure_veg: ["PURE_VEG", "PUREVEG", "VEG"],
  vegan: ["VEGAN"],
  veg_egg: ["VEG_EGG", "VEGEGG", "EGGETARIAN"],
  halal: ["HALAL"],
  gluten: ["GLUTEN", "GLUTEN_FREE", "GLUTENFREE"],
  sattvic: ["SATTVIC", "NO_ONION_GARLIC"],
  kosher: ["KOSHER"],
  buddhist: ["BUDDHIST", "BUDDHIST_VEG"],
};

const normalizeTag = (tag: string) => (tag || "").trim().toUpperCase().replace(/[-\s]/g, "_");

// Reverse map: any stored tag value -> catalog chip id (so badges resolve correctly).
const TAG_TO_CHIP: Record<string, string> = Object.entries(DIET_ALIASES).reduce((acc, [chip, vals]) => {
  vals.forEach(v => { acc[normalizeTag(v)] = chip; });
  acc[normalizeTag(chip)] = chip;
  return acc;
}, {} as Record<string, string>);

// Case- and alias-insensitive lookup — resolves "VEGAN", "no_onion_garlic", etc.
// Falls back to the last entry ("Everything").
export const getFI = (id: string) => {
  const chip = TAG_TO_CHIP[normalizeTag(id)] || (id || "").toLowerCase();
  return ALL_FOOD_TYPES.find(f => f.id === chip) || ALL_FOOD_TYPES[ALL_FOOD_TYPES.length - 1];
};

// True when a place's stored diet tags satisfy a selected chip (alias-aware).
export const placeSupportsDiet = (placeTags: string[], chipId: string): boolean => {
  const aliases = (DIET_ALIASES[chipId] || [chipId]).map(normalizeTag);
  const have = new Set((placeTags || []).map(normalizeTag));
  return aliases.some(a => have.has(a));
};
