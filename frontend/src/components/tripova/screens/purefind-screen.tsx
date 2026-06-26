"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import type { Theme } from "@/data";
import { ALL_FOOD_TYPES } from "@/data";
import { getFI, placeSupportsDiet } from "@/data";
import { Icon } from "../icon";
import { SectionTitle, ScreenHeader } from "../primitives/index";
import { PoweredBy } from "../badges/index";
import { api } from "@/lib/api";
import type { FoodPlaceResponse, DeepReviewResponse, RoutePoint } from "@/lib/types";

const FOOD_TYPES_FILTER = ALL_FOOD_TYPES.filter(f => f.id !== "everything");

function destinationHint(location: string, fallback: string) {
  const parts = location.split(",").map(part => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || fallback;
}

// Turn a raw tag (cuisine like "south_indian", or our "Restaurant"/"Cafe" fallback) into
// a human label. Diet tags go through getFI instead; these are the neutral chips.
const humanizeTag = (s: string) => (s || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

function apiToPlace(p: FoodPlaceResponse) {
  const dietTags = p.diet_tags || [];
  const verifiedBy: Record<string, number> = {};
  if (p.is_diet_trusted && p.verified_count > 0 && dietTags.length > 0) {
    const perTag = Math.max(1, Math.round(p.verified_count / dietTags.length));
    for (const tag of dietTags) verifiedBy[tag] = perTag;
  }
  // Prefer diet chips; when a place has no diet info, fall back to neutral cuisine/type
  // chips so no card is ever bare (these are never presented as a diet claim).
  const dietLabels = Array.from(new Set(dietTags.map(t => getFI(t).label)));
  const cuisineLabels = Array.from(new Set((p.tags || []).map(humanizeTag))).filter(Boolean);
  const chipsAreDiet = dietLabels.length > 0;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    location: p.address || "",
    types: dietTags,
    verifiedBy,
    rating: Math.round(p.food_score * 10) / 10,
    reviews: p.verified_count || 0,
    chips: chipsAreDiet ? dietLabels : cuisineLabels.slice(0, 4),
    chipsAreDiet,
    dietSource: p.diet_source ?? null,
    distance: p.distance_km != null ? `${p.distance_km} km` : "—",
    lastVerified: "—",
    photo: p.photos?.find(Boolean),
    source: p.source,
    isCommunityVerified: p.is_community_verified,
    isDietTrusted: p.is_diet_trusted,
  };
}

export function PureFindScreen({ t }: { t: Theme }) {
  const [filters, setFilters] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const [apiPlaces, setApiPlaces] = useState<FoodPlaceResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  // Approximate (privacy-coarsened) location the traveller opted into sharing.
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "prompting" | "granted" | "denied" | "unavailable">("idle");
  // City resolved from the search box (debounced). When set, we pull that city's food
  // live from OSM instead of just filtering the already-loaded list. null = the term
  // isn't a city (treat it as a plain name filter over loaded rows).
  const [cityGeo, setCityGeo] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [citySearching, setCitySearching] = useState(false);
  // Live Reddit deep-review per place, loaded on demand when the trust panel opens.
  const [reviews, setReviews] = useState<Record<string, DeepReviewResponse | "loading" | "error">>({});
  // The location the currently-loaded rows belong to. When the discover target moves
  // (e.g. "near me" → a typed city), the old rows are for a different place, so we drop
  // them rather than let them flash under the new city's banner with stale distances.
  const loadedLocKey = React.useRef<string | null>(null);
  // Locations we've already scheduled a one-time enrichment refresh for, so we pull
  // background-backfilled addresses (and retry a flaky Overpass) exactly once — no loop.
  const refreshedFor = React.useRef<Set<string>>(new Set());

  // Single-select: tapping a filter selects only it; tapping the active one clears it.
  const toggleF = (id: string) => setFilters(f => (f[0] === id ? [] : [id]));

  // Two-pass: adopt any stored approximate location after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tripova_geo");
      if (raw) {
        const saved = JSON.parse(raw) as { lat: number; lng: number };
        if (typeof saved.lat === "number" && typeof saved.lng === "number") {
          // Two-pass: adopt the stored coarse location after mount (see note above).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setGeo({ lat: saved.lat, lng: saved.lng });
          setGeoStatus("granted");
        }
      }
    } catch {
      /* ignore malformed cache */
    }
  }, []);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("prompting");
    navigator.geolocation.getCurrentPosition(
      pos => {
        // Coarsen to ~1.1km (2 decimals) before storing/sending — never the precise fix.
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        try {
          localStorage.setItem("tripova_geo", JSON.stringify({ lat, lng, ts: Date.now() }));
        } catch {
          /* private mode — keep in memory only */
        }
        setGeo({ lat, lng });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  const clearLocation = () => {
    try { localStorage.removeItem("tripova_geo"); } catch { /* ignore */ }
    setGeo(null);
    setGeoStatus("idle");
  };

  // Debounced city resolution: typing filters loaded rows instantly (below), but after a
  // short pause we try to resolve the term to a real city via the geocoder. On success we
  // pull that city's restaurants on demand; on failure the term stays a plain name filter.
  useEffect(() => {
    const term = search.trim();
    if (term.length < 3) {
      // Term too short → clear any debounced city resolution synchronously.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCityGeo(null);
      setCitySearching(false);
      return;
    }
    let active = true;
    setCitySearching(true);
    const handle = setTimeout(async () => {
      try {
        const pt = await api.get<RoutePoint>(`/api/trips/geocode?q=${encodeURIComponent(term)}`);
        if (active) setCityGeo({ lat: pt.latitude, lng: pt.longitude, name: pt.name });
      } catch {
        if (active) setCityGeo(null); // not a city — fall back to the local name filter
      } finally {
        if (active) setCitySearching(false);
      }
    }, 600);
    return () => { active = false; clearTimeout(handle); };
  }, [search]);

  useEffect(() => {
    let mounted = true;

    // A typed city wins over "near me"; both pull live OSM data via /discover. With
    // neither, we just read whatever is already in the catalogue.
    const discoverAt = cityGeo ?? geo;

    // If the discover *location* moved, the loaded rows are for a different place —
    // drop them so the skeleton shows instead of stale cards (a diet-filter change
    // keeps the same location, so we keep the rows visible and just refetch in place).
    const locKey = discoverAt ? `${discoverAt.lat},${discoverAt.lng}` : "catalogue";
    if (locKey !== loadedLocKey.current) {
      loadedLocKey.current = locKey;
      setApiPlaces(null);
    }

    startTransition(() => {
      setError(null);
      setLoading(true);
    });
    const fetchPlaces = discoverAt
      ? api.post<FoodPlaceResponse[]>("/api/food/discover", {
          lat: discoverAt.lat,
          lng: discoverAt.lng,
          radius_km: cityGeo ? 8 : 5,
          diet_tag: filters.length ? filters : undefined,
        })
      : (() => {
          const params = new URLSearchParams();
          filters.forEach(f => params.append("diet_tag", f));
          const qs = params.toString();
          return api.get<FoodPlaceResponse[]>(`/api/food${qs ? `?${qs}` : ""}`);
        })();

    fetchPlaces
      .then(data => {
        if (!mounted) return;
        startTransition(() => {
          setApiPlaces(data);
          setLoading(false);
        });
        // After a live discover, the backend enriches addresses (and may have hit a
        // flaky Overpass). Refresh once a few seconds later so those fill in — but only
        // if something's actually pending (missing data) and we haven't already done so.
        if (discoverAt && !refreshedFor.current.has(locKey)) {
          const needsEnrichment = data.length === 0 || data.some(p => !p.address);
          if (needsEnrichment) {
            refreshedFor.current.add(locKey);
            window.setTimeout(() => { if (mounted) setRetryKey(k => k + 1); }, 6000);
          }
        }
      })
      .catch(err => {
        if (!mounted) return;
        startTransition(() => {
          setError(err.message);
          setLoading(false);
        });
      });

    return () => { mounted = false; };
  }, [filters, retryKey, geo, cityGeo]);

  // Deep-review is available for every place now (not just diet-trusted ones) —
  // it searches the open web *and* Reddit for what travellers actually say.
  const loadReview = (place: { id: string; name: string; location: string }) => {
    setExpanded(e => (e === place.id ? null : place.id));
    if (reviews[place.id] && reviews[place.id] !== "error") return;
    setReviews(r => ({ ...r, [place.id]: "loading" }));
    api.post<DeepReviewResponse>("/api/reviews/deep-check", {
      placeId: place.id,
      placeName: place.name,
      destinationName: destinationHint(place.location, place.name),
      includeReddit: true,
      includeWeb: true,
    })
      .then(data => setReviews(r => ({ ...r, [place.id]: data })))
      .catch(() => setReviews(r => ({ ...r, [place.id]: "error" })));
  };

  const displayPlaces = Array.isArray(apiPlaces) ? apiPlaces.map(apiToPlace) : [];

  const filtered = displayPlaces.filter(r => {
    // In city mode the fetch is already scoped to that city, and OSM addresses often omit
    // the city name — so don't re-filter the results by the search term, or we'd hide them.
    const ms = !!cityGeo || search === "" || r.name.toLowerCase().includes(search.toLowerCase()) || r.location.toLowerCase().includes(search.toLowerCase());
    const mf = filters.length === 0 || filters.every(f => placeSupportsDiet(r.types, f));
    return ms && mf;
  });
  const trustedCount = filtered.filter(r => r.isDietTrusted).length;
  const needsVerificationCount = filtered.length - trustedCount;

  return (
    <div style={{ padding: "0 12px 16px" }}>
      <ScreenHeader t={t} eyebrow="Eat with confidence" title={<>Find food you can<br />actually eat.</>} subtitle="Diet-aware places verified by fellow travellers.">
        <PoweredBy t={t} style={{ marginTop: 10 }} />
      </ScreenHeader>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex" }}><Icon name="Search" size={17} color={t.muted} /></span>
        <input aria-label="Search restaurants or cities" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search restaurant or city..." style={{ width: "100%", padding: "12px 16px 12px 42px", borderRadius: 12, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14, outline: "2px solid transparent", outlineOffset: 2, boxSizing: "border-box" }} />
      </div>

      {(citySearching || cityGeo) && (
        <div style={{ marginTop: -6, marginBottom: 12, fontSize: 12, color: t.muted, display: "flex", alignItems: "center", gap: 6 }}>
          {citySearching ? (
            <><Icon name="Loader" size={13} color={t.accent} /> Searching “{search.trim()}” for real food…</>
          ) : cityGeo ? (
            <><Icon name="MapPin" size={13} color={t.secondary} /> Showing live food in <strong style={{ color: t.text }}>{cityGeo.name}</strong></>
          ) : null}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        {geo ? (
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 13px", borderRadius: 12, background: t.secondary + "12", border: `1px solid ${t.secondary}30` }}>
            <Icon name="MapPin" size={15} color={t.secondary} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.text }}>
              Showing real food near you · <span style={{ color: t.muted }}>approx {geo.lat.toFixed(2)}, {geo.lng.toFixed(2)}</span>
            </span>
            <button onClick={clearLocation} style={{ background: "transparent", border: "none", color: t.muted, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Clear</button>
          </div>
        ) : (
          <button
            onClick={requestLocation}
            disabled={geoStatus === "prompting"}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 14px", borderRadius: 12, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 13, cursor: geoStatus === "prompting" ? "default" : "pointer", textAlign: "left" }}
          >
            <Icon name={geoStatus === "prompting" ? "Loader" : "Navigation"} size={16} color={t.accent} />
            <span style={{ flex: 1 }}>{geoStatus === "prompting" ? "Getting your approximate location…" : "Find real food near me"}</span>
            <Icon name="ChevronRight" size={15} color={t.muted} />
          </button>
        )}
        {geoStatus === "denied" && (
          <div style={{ fontSize: 11.5, color: t.muted, marginTop: 7, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="Info" size={12} color={t.muted} /> Location permission was declined — showing all verified spots instead.
          </div>
        )}
        {geoStatus === "unavailable" && (
          <div style={{ fontSize: 11.5, color: t.muted, marginTop: 7, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="Info" size={12} color={t.muted} /> Your browser can&apos;t share location — showing all verified spots instead.
          </div>
        )}
      </div>

      <div style={{ background: t.card, borderRadius: 14, padding: "13px 14px", marginBottom: 18, border: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch", boxShadow: `0 1px 3px ${t.overlay}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: t.accent + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="Camera" size={19} color={t.accent} /></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, color: t.heading }}>AI Menu Scanner</div>
            <div style={{ fontSize: 11.5, color: t.muted }}>Menu upload is planned; live diet verification comes from travellers.</div>
          </div>
        </div>
        <button
          disabled
          style={{ width: "100%", padding: "10px 16px", borderRadius: 9, border: `1px solid ${t.border}`, background: t.tag, color: t.muted, fontSize: 12.5, fontWeight: 700, cursor: "not-allowed", flexShrink: 0 }}
        >
          Coming Soon
        </button>
      </div>

      <SectionTitle t={t}>Dietary Filter · Pick One</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
        {FOOD_TYPES_FILTER.map(f => {
          const active = filters.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggleF(f.id)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 8,
                border: `1.5px solid ${active ? f.color : t.border}`,
                background: active ? f.color + "15" : t.tag,
                color: active ? f.color : t.muted, fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: "pointer", transition: "background 0.18s, border-color 0.18s, color 0.18s",
              }}
            >
              {f.emoji} {f.label} {active && <Icon name="Check" size={12} color={f.color} />}
            </button>
          );
        })}
      </div>
      {filters.length > 0 && <button onClick={() => setFilters([])} style={{ fontSize: 12, color: t.muted, background: "transparent", border: "none", cursor: "pointer", marginBottom: 10 }}>✕ Clear filter</button>}

      {loading && apiPlaces === null && (
        <div>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} style={{ background: t.card, borderRadius: 16, overflow: "hidden", marginBottom: 14, border: `1px solid ${t.border}`, opacity: 0.5 }}>
              <div style={{ height: 90, background: t.tag }} />
              <div style={{ padding: 14 }}>
                <div style={{ height: 16, width: "60%", background: t.tag, borderRadius: 6, marginBottom: 8 }} />
                <div style={{ height: 12, width: "40%", background: t.tag, borderRadius: 6, marginBottom: 12 }} />
                <div style={{ height: 12, width: "80%", background: t.tag, borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && apiPlaces === null && (
        <div style={{ background: t.danger + "12", borderRadius: 12, padding: "12px 16px", marginBottom: 14, border: `1px solid ${t.danger}25`, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.danger }}>
          <Icon name="AlertTriangle" size={15} color={t.danger} />
          <span style={{ flex: 1 }}>Could not load live data.</span>
          <button onClick={() => setRetryKey(k => k + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.danger}40`, background: "transparent", color: t.danger, fontSize: 12, cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {(!loading || apiPlaces !== null) && !(error && apiPlaces === null) && (
        <>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 14 }}>
            {trustedCount} diet-trusted places
            {needsVerificationCount > 0 ? ` · ${needsVerificationCount} need traveller verification` : ""}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Icon name="Salad" size={28} color={t.secondary} /></div>
              {(() => {
                // Distinguish "your diet filter hid everything" from "we have no live data
                // for this place yet" — the Ratlam case, where Overpass returned nothing.
                if (filters.length > 0) {
                  return <>
                    <div style={{ fontSize: 18, color: t.heading, marginBottom: 6 }}>No places match that diet here.</div>
                    <div style={{ fontSize: 13.5, color: t.muted }}>Try clearing the filter{cityGeo ? ` to see everything in ${cityGeo.name}` : ""}.</div>
                  </>;
                }
                if (cityGeo) {
                  // OpenStreetMap volunteer coverage is thin for many smaller Indian towns
                  // (Ratlam, for instance, has almost no mapped eateries) and we have no
                  // other licensed food source wired in — so rather than fabricate places,
                  // we point the traveller to a live external map search that does have them.
                  const mapQ = encodeURIComponent(`cafes and restaurants in ${cityGeo.name}`);
                  return <>
                    <div style={{ fontSize: 18, color: t.heading, marginBottom: 6 }}>No mapped food spots in {cityGeo.name} yet.</div>
                    <div style={{ fontSize: 13.5, color: t.muted, marginBottom: 14 }}>We pull live places from OpenStreetMap, and smaller towns are often barely mapped there yet — it doesn’t mean there’s nowhere to eat.</div>
                    <a href={`https://www.google.com/maps/search/${mapQ}`} target="_blank" rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 10, border: `1px solid ${t.accent}40`, background: t.accent + "12", color: t.accent, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                      <Icon name="MapPin" size={15} color={t.accent} /> Find cafés in {cityGeo.name} on Maps →
                    </a>
                  </>;
                }
                return <>
                  <div style={{ fontSize: 18, color: t.heading, marginBottom: 6 }}>No verified food spots here yet.</div>
                  <div style={{ fontSize: 13.5, color: t.muted }}>Search a city or share your location to pull live places.</div>
                </>;
              })()}
            </div>
          )}

          {filtered.map((r) => (
            <div key={r.id} style={{ background: t.card, borderRadius: 16, overflow: "hidden", marginBottom: 14, border: `1px solid ${t.border}`, boxShadow: `0 1px 3px ${t.overlay}` }}>
              {r.photo && (
                <div style={{ height: 112, backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.42)),url(${r.photo})`, backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
                  {r.isDietTrusted && (
                    <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.entries(r.verifiedBy).slice(0, 2).map(([fid, c]) => (
                        <span key={fid} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.94)", borderRadius: 7, padding: "4px 9px", fontSize: 11, fontWeight: 700, color: getFI(fid).color }}>
                          <Icon name="BadgeCheck" size={12} color={getFI(fid).color} /> {getFI(fid).label} · {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{ padding: 14 }}>
                {!r.photo && r.isDietTrusted && Object.keys(r.verifiedBy).length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {Object.entries(r.verifiedBy).slice(0, 2).map(([fid, c]) => (
                      <span key={fid} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: getFI(fid).color + "12", border: `1px solid ${getFI(fid).color}30`, borderRadius: 7, padding: "4px 9px", fontSize: 11, fontWeight: 700, color: getFI(fid).color }}>
                        <Icon name="BadgeCheck" size={12} color={getFI(fid).color} /> {getFI(fid).label} · {c}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    {/* Link by UUID — get_place resolves either id or slug, and a
                        UUID path is immune to slug encoding (accents etc.). */}
                    <Link href={`/food/${r.id}`} style={{ fontSize: 16, color: t.heading, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {r.name}<Icon name="ArrowUpRight" size={13} color={t.muted} />
                    </Link>
                    <div style={{ fontSize: 12, color: t.muted, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="MapPin" size={11} color={t.muted} />{" "}
                      {/* Real address when known; otherwise the real distance ("1.2 km away").
                          OSM addresses are backfilled in the background, so a freshly-discovered
                          card may show distance first and gain its address on the next refresh. */}
                      {r.location
                        ? `${r.location}${r.distance && r.distance !== "—" ? ` · ${r.distance}` : ""}`
                        : r.distance && r.distance !== "—"
                        ? `${r.distance} away`
                        : "Address unavailable"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {r.isDietTrusted && r.rating > 0 && <div style={{ fontSize: 12, fontWeight: 800, color: t.gold, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}><Icon name="ShieldCheck" size={12} color={t.gold} /> {Math.round(r.rating)}</div>}
                    {r.reviews > 0 && <div style={{ fontSize: 11, color: t.muted }}>{r.reviews} verified</div>}
                  </div>
                </div>
                {r.chips.length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {r.chips.map(tag => {
                      // Verified diet → green check; suggested diet or neutral cuisine → grey tag.
                      const verified = r.chipsAreDiet && r.isDietTrusted;
                      return (
                        <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: verified ? t.secondary : t.muted, background: verified ? t.secondary + "14" : t.tag, border: verified ? `1px solid ${t.secondary}30` : `1px solid ${t.border}`, padding: "3px 10px", borderRadius: 6 }}>
                          <Icon name={verified ? "BadgeCheck" : r.chipsAreDiet ? "Sparkles" : "Tag"} size={11} color={verified ? t.secondary : t.muted} /> {tag}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: t.muted, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name="Info" size={12} color={t.muted} /> Diet info not confirmed — verify if you visit
                  </div>
                )}

                {/* Diet trust status. Community verification is what upgrades a place to
                    "trusted"; OSM/AI-derived diet tags are shown as unverified suggestions. */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, fontSize: 11.5, color: r.isDietTrusted ? t.gold : t.muted }}>
                  <Icon name={r.isDietTrusted ? "ShieldCheck" : "ShieldAlert"} size={13} color={r.isDietTrusted ? t.gold : t.muted} />
                  <span style={{ flex: 1 }}>
                    {r.isDietTrusted
                      ? `Diet tags community-verified${r.reviews > 0 ? ` · ${r.reviews} traveller check${r.reviews === 1 ? "" : "s"}` : ""}`
                      : r.dietSource === "suggested"
                      ? "Diet suggested (AI-assisted) · not yet traveller-verified"
                      : "Diet not yet traveller-verified"}
                  </span>
                </div>

                {/* Traveller reviews — searches the open web + Reddit, for every place. */}
                {expanded === r.id ? (
                  <div style={{ background: t.gold + "10", border: `1px solid ${t.gold}35`, borderRadius: 12, padding: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                      <Icon name="MessagesSquare" size={15} color={t.gold} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.gold, flex: 1 }}>What travellers say</span>
                      <button onClick={() => setExpanded(null)} aria-label="Collapse reviews" style={{ background: "transparent", border: "none", cursor: "pointer", color: t.muted, display: "flex" }}><Icon name="ChevronUp" size={16} color={t.muted} /></button>
                    </div>
                    {(() => {
                      const rv = reviews[r.id];
                      if (rv === undefined || rv === "loading") {
                        return <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: t.muted }}><Icon name="Loader" size={14} color={t.muted} /> Searching the web &amp; Reddit for traveller reviews…</div>;
                      }
                      if (rv === "error") {
                        return <div style={{ fontSize: 12.5, color: t.muted }}>Could not load live reviews right now.</div>;
                      }
                      const hasContent = rv.topReviews.length > 0 || rv.positiveSignals.length > 0 || rv.negativeSignals.length > 0;
                      if (!hasContent) {
                        return <div style={{ fontSize: 12.5, color: t.muted }}>No traveller discussion found online for this exact place yet.</div>;
                      }
                      return (
                        <div>
                          {rv.overallSummary && <div style={{ fontSize: 12.5, color: t.text, marginBottom: 10, lineHeight: 1.5 }}>{rv.overallSummary}</div>}
                          {rv.positiveSignals.length > 0 && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                              {rv.positiveSignals.slice(0, 3).map((s, i) => (
                                <span key={i} style={{ fontSize: 11, color: t.secondary, background: t.secondary + "15", padding: "3px 9px", borderRadius: 6 }}>{s}</span>
                              ))}
                            </div>
                          )}
                          {rv.topReviews.slice(0, 4).map((rev, i) => {
                            const sentiment = rev.sentiment.toUpperCase();
                            const sentColor = sentiment === "POSITIVE" ? t.secondary : sentiment === "NEGATIVE" ? t.danger : t.muted;
                            const sourceLabel = rev.subreddit ? `r/${rev.subreddit}` : rev.source;
                            return (
                              <a key={i} href={rev.url} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none", background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 11px", marginBottom: 7 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                  <Icon name={rev.subreddit ? "MessageCircle" : "Globe"} size={12} color={sentColor} />
                                  <span style={{ fontSize: 12, fontWeight: 700, color: t.heading, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rev.title}</span>
                                  {sourceLabel && <span style={{ fontSize: 10.5, color: t.muted, flexShrink: 0, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sourceLabel}</span>}
                                </div>
                                {rev.snippet && <div style={{ fontSize: 11.5, color: t.muted, lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{rev.snippet}</div>}
                              </a>
                            );
                          })}
                          <div style={{ fontSize: 10.5, color: t.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
                            <Icon name="Info" size={11} color={t.muted} /> Live from the web &amp; Reddit · community sentiment, not a Tripsova rating
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <button onClick={() => loadReview(r)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 13px", borderRadius: 10, border: `1px dashed ${t.gold}55`, background: t.gold + "0A", color: t.text, fontSize: 12.5, cursor: "pointer", textAlign: "left" }}>
                    <Icon name="Search" size={15} color={t.gold} /> <span>See what travellers say online</span> <span style={{ marginLeft: "auto" }}><Icon name="ChevronRight" size={15} color={t.muted} /></span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
