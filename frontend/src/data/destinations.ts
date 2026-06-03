export interface Destination {
  id: string;
  name: string;
  country: string;
  gradient: string;
  trust: number;
  exploring: number;
  updates: number;
  guides: number;
  save: boolean;
  follow: boolean;
  safety: string;
  safetyLevel: "good" | "caution";
  tagline: string;
  badges: string[];
}

export const DESTINATIONS: Destination[] = [
  { id: "bali", name: "Bali", country: "Indonesia", gradient: "linear-gradient(150deg,#1B3A47,#5E97A8)", trust: 91, exploring: 23, updates: 104, guides: 12, save: false, follow: false, safety: "Safe this week", safetyLevel: "good", tagline: "Temples, rice terraces and surf towns — endlessly explorable.", badges: ["Safe for Solo Travellers", "Great for Families", "Backpacker Friendly"] },
  { id: "spiti", name: "Spiti Valley", country: "India", gradient: "linear-gradient(150deg,#1E2740,#5A6B96)", trust: 88, exploring: 14, updates: 62, guides: 6, save: true, follow: false, safety: "Roads open · carry layers", safetyLevel: "caution", tagline: "A cold desert mountain valley at the edge of the Himalayas.", badges: ["Safe for Solo Travellers", "Budget Friendly", "High Altitude"] },
  { id: "goa", name: "Goa", country: "India", gradient: "linear-gradient(150deg,#5A4F3E,#C2A878)", trust: 86, exploring: 67, updates: 188, guides: 18, save: false, follow: true, safety: "Safe · busy season", safetyLevel: "good", tagline: "Beaches, cafés and susegad — the easiest place to begin.", badges: ["Great for Families", "Backpacker Friendly", "Nightlife"] },
  { id: "rishikesh", name: "Rishikesh", country: "India", gradient: "linear-gradient(150deg,#243A33,#6E8C7E)", trust: 90, exploring: 41, updates: 121, guides: 9, save: false, follow: false, safety: "Safe · solo-women friendly", safetyLevel: "good", tagline: "Yoga capital on the Ganga — calm, spiritual, walkable.", badges: ["Safe for Solo Travellers", "Solo Female Friendly", "Wellness"] },
  { id: "jaisalmer", name: "Jaisalmer", country: "India", gradient: "linear-gradient(150deg,#6B5A38,#D4B483)", trust: 84, exploring: 31, updates: 77, guides: 14, save: false, follow: false, safety: "Safe · extreme heat midday", safetyLevel: "caution", tagline: "The golden city — forts, dunes and desert camps.", badges: ["Great for Families", "Budget Friendly"] },
  { id: "andaman", name: "Andaman", country: "India", gradient: "linear-gradient(150deg,#1B3A47,#5E97A8)", trust: 89, exploring: 15, updates: 48, guides: 7, save: false, follow: false, safety: "Safe · check ferry weather", safetyLevel: "good", tagline: "Turquoise water and quiet islands for divers and dreamers.", badges: ["Great for Families", "Safe for Solo Travellers"] },
];

export const getDest = (id: string) => DESTINATIONS.find(d => d.id === id) || DESTINATIONS[0];
