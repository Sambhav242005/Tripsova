"use client";

import React, { useState } from "react";
import type { Theme } from "@/data";
import { Card, Btn, InputF } from "../primitives/index";
import { MultiSelectFood, FoodBadge } from "../badges/index";
import { Icon } from "../icon";
import { useApp } from "../app-provider";
import { api } from "@/lib/api";
import type { TransportKey, TripGenerateRequest, TripGenerateResponse } from "@/lib/types";

export function PlanScreen({ t }: { t: Theme }) {
  const { setSub } = useApp();
  const [form, setForm] = useState({ destination: "", days: "4", groupType: "Friends", travelMode: "CAR" as TransportKey, budget: "10000", interests: [] as string[], foods: [] as string[], groupMode: false, members: [{ name: "Person 1", foods: [] as string[] }] });
  const [loading, setLoading] = useState(false);
  const [fuelStops, setFuelStops] = useState<Record<string, unknown>[]>([]);
  const [itinerary, setItinerary] = useState<{
    destination: string; totalCost: string; activeFoods: string[]; days: Record<string, unknown>[]; tips: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupTypes = [{ id: "Solo", icon: "🧍" }, { id: "Couple", icon: "👫" }, { id: "Family", icon: "👨‍👩‍👧" }, { id: "Friends", icon: "👯" }];
  // Each transport carries its own behaviour; refuel === true means fuel stops are shown.
  const travelModes: { id: TransportKey; icon: string; label: string; refuel: boolean }[] = [
    { id: "CAR", icon: "🚗", label: "Car", refuel: true },
    { id: "MOTORCYCLE", icon: "🏍️", label: "Bike", refuel: true },
    { id: "TRAIN", icon: "🚆", label: "Train", refuel: false },
    { id: "BUS", icon: "🚌", label: "Bus", refuel: false },
    { id: "FLIGHT", icon: "✈️", label: "Flight", refuel: false },
    { id: "FERRY", icon: "⛴️", label: "Ferry", refuel: false },
  ];
  const currentMode = travelModes.find(m => m.id === form.travelMode);
  const interests = ["Adventure", "Nature", "Food", "Culture", "Spiritual", "Photography", "Shopping", "Wellness"];
  const toggleI = (i: string) => setForm(f => ({ ...f, interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i] }));

  const generate = async () => {
    if (!form.destination) { setError("Please enter a destination"); return; }
    setLoading(true); setItinerary(null); setError(null); setFuelStops([]);
    const body: TripGenerateRequest = {
      destination: form.destination,
      days: parseInt(form.days),
      budget: parseInt(form.budget),
      peopleCount: form.groupType === "Solo" ? 1 : form.groupType === "Couple" ? 2 : 4,
      tripType: form.groupType,
      travelMode: form.travelMode,
    };
    if (form.interests.length > 0) body.travelStyle = form.interests;
    if (form.foods.length > 0) body.dietPreference = form.foods;
    try {
      const res = await api.post<TripGenerateResponse>("/api/trips/generate", body);
      setItinerary(transformResponse(res, form));
      setFuelStops(res.fuelStops || []);
    } catch {
      try {
        setItinerary(mockGenerate(form));
      } catch {
        setError("Failed to generate trip. Please try again.");
      }
    }
    setLoading(false);
  };

  interface ItineraryResult { destination: string; totalCost: string; activeFoods: string[]; days: Record<string, unknown>[]; tips: string[]; }

  function transformResponse(res: TripGenerateResponse, form: Record<string, unknown>): ItineraryResult {
    const perDay = Math.floor(parseInt(form.budget as string) / parseInt(form.days as string));
    const dayTitles = ["Arrival & First Light", "Deep Exploration", "Local Immersion", "Hidden Gems", "Adventure Day", "Leisure & Reflection", "Farewell"];
    const days = res.itinerary.map((d: Record<string, unknown>, i: number) => {
      const dayNum = d.day || (i + 1) as number;
      const getSlot = (slot: string) => {
        if (d[slot]) return d[slot];
        const slotIdx = slot === "morning" ? 0 : slot === "afternoon" ? 1 : 2;
        const acts = d.activities as unknown[];
        if (acts?.[slotIdx]) return acts[slotIdx];
        return null;
      };
      const fallback = (slot: string, idx: number) => {
        const costs = [0.3, 0.4, 0.3];
        const acts = ["Explore", "Discover", "Relax"];
        const descs = ["Morning exploration in the area", "Afternoon adventure", "Evening wind down"];
        return { activity: d[`${slot}_activity`] || acts[idx], description: d[`${slot}_description`] || descs[idx], cost: `₹${Math.floor(perDay * costs[idx])}`, food: (form.foods as string[])?.[0] || "Local" };
      };
      const s = getSlot("morning");
      return {
        day: dayNum,
        title: d.title || dayTitles[i] || `Day ${dayNum}`,
        morning: s || fallback("morning", 0),
        afternoon: getSlot("afternoon") || fallback("afternoon", 1),
        evening: getSlot("evening") || fallback("evening", 2),
      };
    });
    const budgetTotal = res.estimatedBudget?.total || res.estimatedBudget?.totalCost || form.budget;
    return {
      destination: form.destination as string,
      totalCost: `₹${budgetTotal}`,
      activeFoods: form.foods as string[],
      days,
      tips: res.safetyNotes?.length > 0 ? res.safetyNotes : [
        `Book accommodation in ${form.destination} at least 2 weeks ahead in peak season`,
        (form.foods as string[])?.includes("jain") ? "Call ahead to confirm Jain preparation" : "Ask locals for hidden gems",
        form.groupType === "Solo" ? "Join local traveller WhatsApp groups for safety" : "Tripsova's Budget Tracker splits all expenses automatically",
        "Carry backup snacks from a local grocery — especially useful in remote areas",
      ],
    } as ItineraryResult;
  }

  function mockGenerate(form: Record<string, unknown>): ItineraryResult {
    const perDay = Math.floor(parseInt(form.budget as string) / parseInt(form.days as string));
    const foodRecs: Record<string, string[]> = { jain: ["Jain Bhavan", "Purity Kitchen", "Shree Ram Jain Bhojanalay"], pure_veg: ["Satvik Dhaba", "Shuddh Shakahari", "Pure Veg Corner"], vegan: ["Green Bowl Café", "The Vegan Table", "Plant Plate"], halal: ["Al-Raheem Kitchen", "Bismillah Foods", "Halal Corner"], gluten: ["GF Kitchen", "Pure Plate", "Clean Bowl"], sattvic: ["Satvik Ashram Kitchen", "Divine Foods", "Pure Soul Café"], everything: ["Local Dhaba", "Mountain Café", "Traveller's Table"] };
    const formFoods = form.foods as string[];
    const formInterests = form.interests as string[];
    const foods = foodRecs[formFoods?.[0] || "everything"] || foodRecs["everything"];
    const acts: Record<string, [string, string][]> = { Adventure: [["Sunrise Trek", "Panoramic mountain hike"], ["Valley Exploration", "Hidden trails and streams"], ["Summit Push", "Reach the top before golden hour"]], Nature: [["Dawn Nature Walk", "Forests, meadows, birdsong"], ["Waterfall Hike", "Hidden falls in the hills"], ["Wildlife Spotting", "Fauna, flora, open skies"]], Food: [["Market Food Walk", "Street food, spice stalls, local flavour"], ["Cooking Class", "Regional recipes from local families"], ["Restaurant Crawl", "Best spots curated for your diet"]], Culture: [["Temple & Heritage Tour", "Ancient architecture and history"], ["Museum Visit", "Regional art and culture"], ["Folk Performance", "Traditional music and dance"]], Spiritual: [["Sunrise Meditation", "Guided practice by the river"], ["Ashram Visit", "Discourse and inner reflection"], ["Evening Aarti", "Sacred prayer ceremony at dusk"]], Photography: [["Golden Hour Shoot", "The destination at its cinematic best"], ["Street Walk", "People, markets, texture, light"], ["Night Sky", "Stars, long exposures, silence"]], Shopping: [["Local Bazaar", "Handcrafts, textiles, antiques"], ["Artisan Workshop", "Watch masters at work"], ["Night Market", "Street stalls and local goods"]], Wellness: [["Morning Yoga", "Guided session in nature"], ["Ayurvedic Spa", "Traditional healing therapies"], ["Sound Bath", "Meditation and inner calm"]] };
    const a = acts[formInterests?.[0] || "Nature"] || acts["Nature"];
    const dayTitles = ["Arrival & First Light", "Deep Exploration", "Local Immersion", "Hidden Gems", "Adventure Day", "Leisure & Reflection", "Farewell"];
    const days = Array.from({ length: Math.min(parseInt(form.days as string), 5) }, (_, i) => ({
      day: i + 1, title: dayTitles[i] || `Day ${i + 1}`,
      morning: { activity: i === 0 ? `Arrive in ${form.destination} & Settle In` : a[i % a.length][0], description: i === 0 ? "Check in, freshen up, explore the neighbourhood" : a[i % a.length][1], cost: `₹${Math.floor(perDay * 0.3)}`, food: foods[0] },
      afternoon: { activity: i === 0 ? `${form.destination} First Walk` : a[(i + 1) % a.length][0], description: i === 0 ? "Stroll through main market and landmarks" : a[(i + 1) % a.length][1], cost: `₹${Math.floor(perDay * 0.4)}`, food: foods[1] },
      evening: { activity: i === parseInt(form.days as string) - 1 ? "Pack & Farewell" : `Sunset at ${form.destination}`, description: i === parseInt(form.days as string) - 1 ? "Pack up, reflect, early rest" : "Watch the sun go down with a warm drink", cost: `₹${Math.floor(perDay * 0.3)}`, food: foods[2] || foods[0] },
    }));
    const tips = [
      `Book accommodation in ${form.destination} at least 2 weeks ahead in peak season`,
      formFoods?.includes("jain") ? "Call ahead to confirm Jain preparation" : "Ask locals for hidden gems",
      form.groupType === "Solo" ? "Join local traveller WhatsApp groups for safety" : "Tripsova's Budget Tracker splits all expenses automatically",
      "Carry backup snacks from a local grocery — especially useful in remote areas",
    ];
    return { destination: form.destination as string, totalCost: `₹${form.budget}`, activeFoods: formFoods, days, tips } as ItineraryResult;
  }

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <button onClick={() => { setSub("route"); window.scrollTo(0, 0); }}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", marginBottom: 14, borderRadius: 14, border: `1px solid ${t.accent}25`, background: `linear-gradient(135deg,${t.accent}12,${t.secondary}0A)`, cursor: "pointer", textAlign: "left" }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: t.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="Route" size={19} color={t.accent} />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: t.text }}>Plan the route &amp; map</span>
          <span style={{ display: "block", fontSize: 12, color: t.muted, marginTop: 1 }}>Multi-leg journey, travel times, overnight &amp; fuel stops</span>
        </span>
        <Icon name="ChevronRight" size={18} color={t.muted} />
      </button>
      <Card t={t}>
        <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 18 }}>✦ Build My Trip</div>
        <InputF label="Destination" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Manali, Goa, Spiti, Udaipur..." t={t} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 0 }}>
          <InputF label="Days" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} type="number" t={t} />
          <InputF label="Budget (₹)" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} type="number" t={t} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 8 }}>Group Type</div>
          <div style={{ display: "flex", gap: 8 }}>
            {groupTypes.map(g => (
              <button key={g.id} onClick={() => setForm(f => ({ ...f, groupType: g.id }))} style={{ flex: 1, padding: "9px 6px", borderRadius: 8, border: `1.5px solid ${form.groupType === g.id ? t.accent : t.border}`, background: form.groupType === g.id ? t.accent + "12" : t.tag, color: form.groupType === g.id ? t.accent : t.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.18s" }}>
                <span style={{ fontSize: 18 }}>{g.icon}</span>{g.id}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 8 }}>How are you getting there?</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
            {travelModes.map(m => (
              <button key={m.id} onClick={() => setForm(f => ({ ...f, travelMode: m.id }))} style={{ padding: "9px 4px", borderRadius: 8, border: `1.5px solid ${form.travelMode === m.id ? t.accent : t.border}`, background: form.travelMode === m.id ? t.accent + "12" : t.tag, color: form.travelMode === m.id ? t.accent : t.muted, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.18s" }}>
                <span style={{ fontSize: 17 }}>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: t.muted, marginTop: 6, fontStyle: "italic" }}>
            {currentMode?.refuel ? "Self-driven — petrol-pump stops will be suggested along the way" : "You're a passenger — no fuel stops (you don't refuel a " + (currentMode?.label.toLowerCase() ?? "vehicle") + ")"}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 8 }}>Interests</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {interests.map(i => { const a = form.interests.includes(i); return <button key={i} onClick={() => toggleI(i)} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${a ? t.accent : t.border}`, background: a ? t.accent + "12" : t.tag, color: a ? t.accent : t.muted, fontSize: 12, fontWeight: a ? 700 : 400, cursor: "pointer", transition: "all 0.18s" }}>{i}</button>; })}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <MultiSelectFood selected={form.foods} onChange={foods => setForm(f => ({ ...f, foods }))} t={t} hint="Select all that apply — mix and match freely" />
        </div>
        {error && <div style={{ background: t.danger + "12", border: `1px solid ${t.danger}25`, borderRadius: 8, padding: "10px 14px", color: t.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <Btn onClick={generate} disabled={loading} full t={t}>{loading ? "Crafting your journey..." : "✦ Build My Trip"}</Btn>
      </Card>

      {loading && (
        <div style={{ textAlign: "center", padding: "50px 20px" }}>
          <div style={{ fontSize: 34, animation: "spin 2s linear infinite", display: "inline-block", marginBottom: 14, color: t.accent }}>✦</div>
          <div style={{ color: t.muted, fontSize: 14, fontStyle: "italic" }}>Crafting your perfect journey...</div>
        </div>
      )}

      {itinerary && (
        <div>
          <div style={{ background: `linear-gradient(135deg,${t.accent}15,${t.secondary}10)`, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${t.accent}20` }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>📍 {itinerary.destination}</div>
            <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>Estimated total: <span style={{ color: t.accent, fontWeight: 700 }}>{itinerary.totalCost}</span></div>
            {itinerary.activeFoods.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{itinerary.activeFoods.map((id: string) => <FoodBadge key={id} id={id} small t={t} />)}</div>}
          </div>
          {itinerary.days.map((day: Record<string, unknown>, idx: number) => (
            <Card key={String(day.day ?? idx)} t={t}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, marginBottom: 14 }}>Day {String(day.day ?? "")} — {String(day.title ?? "")}</div>
              {["morning", "afternoon", "evening"].map(time => {
                const slot = day[time] as Record<string, string> | undefined;
                return slot && (
                <div key={time} style={{ marginBottom: 12, paddingLeft: 14, borderLeft: `2px solid ${t.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: 2 }}>{time}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginTop: 2 }}>{slot.activity}</div>
                  <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{slot.description}</div>
                  <div style={{ display: "flex", gap: 12, marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: t.success, fontWeight: 600 }}>💰 {slot.cost}</span>
                    <span style={{ fontSize: 11, color: t.secondary, fontWeight: 600 }}>🍽 {slot.food}</span>
                  </div>
                </div>
                );
              })}
            </Card>
          ))}
          {fuelStops.length > 0 && (
            <Card t={t}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>⛽ Fuel Stops Nearby</div>
              <div style={{ fontSize: 12, color: t.muted, marginBottom: 10 }}>Real petrol pumps around {itinerary.destination} for your road trip.</div>
              {fuelStops.map((fs, i) => (
                <div key={String(fs.id ?? i)} style={{ marginBottom: 9, paddingLeft: 12, borderLeft: `2px solid ${t.accent}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{String(fs.name ?? "Petrol pump")}</div>
                  {fs.address ? <div style={{ fontSize: 12, color: t.muted }}>{String(fs.address)}</div> : null}
                  {fs.phone ? <div style={{ fontSize: 11, color: t.secondary, marginTop: 2 }}>📞 {String(fs.phone)}</div> : null}
                </div>
              ))}
            </Card>
          )}
          <Card t={t}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>💡 Pro Tips</div>
            {itinerary.tips.map((tip: string, i: number) => <div key={i} style={{ fontSize: 13, color: t.muted, marginBottom: 9, paddingLeft: 12, borderLeft: `2px solid ${t.secondary}`, lineHeight: 1.6 }}>{tip}</div>)}
          </Card>
        </div>
      )}
    </div>
  );
}
