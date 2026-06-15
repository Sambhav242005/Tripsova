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

// The demo destination catalog that used to live here was removed — destinations
// are now sourced from the backend API via the useDestinations hook in
// src/lib/destinations.ts. This file keeps only the shared UI Destination type.
