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

export const getFI = (id: string) => ALL_FOOD_TYPES.find(f => f.id === id) || ALL_FOOD_TYPES[ALL_FOOD_TYPES.length - 1];
