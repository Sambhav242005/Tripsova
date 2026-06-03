// TRIPOVA — trust & food badges + food multi-selects. Babel-loaded.
// Globals: FD, FH, FB, ALL_FOOD_TYPES, getFI, Btn, FoodBadge.

const FoodBadge = ({ id, small, t }) => {
  const f = getFI(id);
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:f.color+"16", border:`1px solid ${f.color}30`, borderRadius:6, padding:small?"2px 8px":"3px 11px", fontSize:small?10:11, fontWeight:600, color:f.color, fontFamily:FB, whiteSpace:"nowrap", letterSpacing:0.2 }}>{f.emoji} {f.label}</span>;
};

const TrustBadge = ({ score, t }) => {
  const color = score>=80 ? t.accent : score>=60 ? t.secondary : t.gold;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:color+"14", border:`1px solid ${color}30`, borderRadius:6, padding:"2px 8px 2px 6px", fontSize:11, fontWeight:700, color, fontFamily:FB }}><Icon name="ShieldCheck" size={12} color={color} /> {score}</span>;
};

// Clean champagne-gold verified pill.
const Hallmark = ({ label, t, light }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:light?"rgba(255,255,255,0.92)":t.goldFill+"24", border:`1px solid ${light?"transparent":t.gold+"55"}`, borderRadius:7, padding:"4px 10px 4px 8px", fontSize:11, fontWeight:700, color:light?"#1B263B":t.gold, fontFamily:FB, letterSpacing:0.2, whiteSpace:"nowrap" }}>
    <Icon name="BadgeCheck" size={13} color={light?"#B58F4F":t.gold} /> {label}
  </span>
);

const MultiSelectFood = ({ selected, onChange, t, hint }) => (
  <div style={{ marginBottom:14 }}>
    {hint && <div style={{ fontSize:12, color:t.muted, fontFamily:FB, marginBottom:10, fontStyle:"italic" }}>{hint}</div>}
    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
      {ALL_FOOD_TYPES.map(f => {
        const active = selected.includes(f.id);
        return <button key={f.id} onClick={() => onChange(active ? selected.filter(x=>x!==f.id) : [...selected,f.id])}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:6, border:`1.5px solid ${active?f.color:t.border}`, background:active?f.color+"15":t.tag, color:active?f.color:t.muted, fontSize:12, fontWeight:active?700:400, cursor:"pointer", fontFamily:FB, transition:"all 0.18s" }}>
          {f.emoji} {f.label} {active&&"✓"}
        </button>;
      })}
    </div>
    {selected.length>0 && <div style={{ marginTop:10, padding:"9px 13px", background:t.tag, borderRadius:10, fontSize:12, color:t.accent, fontFamily:FB, fontWeight:600 }}>Filtering for: {selected.map(id=>getFI(id).label).join(" + ")}</div>}
  </div>
);

const GroupFoodBuilder = ({ members, onChange, t }) => {
  const add = () => onChange([...members, { name:`Traveller ${members.length+1}`, foods:[] }]);
  const remove = (i) => onChange(members.filter((_,idx)=>idx!==i));
  const update = (i, key, val) => onChange(members.map((m,idx)=>idx===i?{...m,[key]:val}:m));
  const allFoods = [...new Set(members.flatMap(m=>m.foods))];
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD }}>Group Members</div>
        <Btn onClick={add} outline t={t} small>+ Add Person</Btn>
      </div>
      {members.map((m,i) => (
        <div key={i} style={{ background:t.tag, borderRadius:10, padding:12, marginBottom:10, border:`1px solid ${t.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
            <input value={m.name} onChange={e=>update(i,"name",e.target.value)} style={{ background:"transparent", border:"none", fontSize:15, fontWeight:600, color:t.text, fontFamily:FB, outline:"none", width:"70%" }} />
            {members.length>1 && <button onClick={()=>remove(i)} style={{ background:"transparent", border:"none", color:t.muted, cursor:"pointer", fontSize:16 }}>✕</button>}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {ALL_FOOD_TYPES.map(f => {
              const active = m.foods.includes(f.id);
              return <button key={f.id} onClick={()=>update(i,"foods",active?m.foods.filter(x=>x!==f.id):[...m.foods,f.id])}
                style={{ padding:"4px 10px", borderRadius:5, border:`1.5px solid ${active?f.color:t.border}`, background:active?f.color+"18":"transparent", color:active?f.color:t.muted, fontSize:11, fontWeight:active?700:400, cursor:"pointer", fontFamily:FB }}>
                {f.emoji} {f.label}
              </button>;
            })}
          </div>
        </div>
      ))}
      {allFoods.length>0 && <div style={{ padding:"10px 14px", background:t.tag, borderRadius:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:t.accent, fontFamily:FB, marginBottom:6, letterSpacing:0.3 }}>Group needs — must support all:</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>{allFoods.map(id=><FoodBadge key={id} id={id} small t={t} />)}</div>
      </div>}
    </div>
  );
};

// Community verification — the "Powered by Travellers" signal.
// e.g. <CommunityVerified foodId="jain" count={18} t={t} />
const CommunityVerified = ({ foodId, count, t }) => {
  const f = getFI(foodId);
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:f.color+"14", border:`1px solid ${f.color}30`, borderRadius:7, padding:"4px 10px", fontSize:11, fontWeight:700, color:f.color, fontFamily:FB, whiteSpace:"nowrap" }}>
    <Icon name="BadgeCheck" size={13} color={f.color} /> {f.label} Verified · {count}
  </span>;
};

// Community trait badge — "Safe for Solo Travellers", "Backpacker Friendly", etc.
const CommBadge = ({ label, t }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:t.tag, border:`1px solid ${t.border}`, borderRadius:7, padding:"5px 11px", fontSize:11.5, fontWeight:600, color:t.text, fontFamily:FB, whiteSpace:"nowrap" }}>
    <Icon name="Users" size={12} color={t.secondary} /> {label}
  </span>
);

// "Powered by Travellers" attribution line.
const PoweredBy = ({ t, style={} }) => (
  <div style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:10.5, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:t.muted, fontFamily:FB, ...style }}>
    <Icon name="Users" size={12} color={t.gold} /> Powered by Travellers
  </div>
);

// Compatibility pill for TripPods — colored by strength.
const CompatBadge = ({ pct, t }) => {
  const color = pct>=85 ? t.success : pct>=70 ? t.secondary : t.gold;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:color+"16", border:`1px solid ${color}35`, borderRadius:20, padding:"4px 11px 4px 9px", fontSize:11.5, fontWeight:800, color, fontFamily:FB }}>
    <Icon name="Sparkles" size={12} color={color} /> {pct}% match
  </span>;
};

// Interest chip (shared interests on pods/profiles).
const InterestChip = ({ label, t, shared }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:shared?t.secondary+"16":t.tag, border:`1px solid ${shared?t.secondary+"40":t.border}`, borderRadius:20, padding:"4px 11px", fontSize:11.5, fontWeight:600, color:shared?t.secondary:t.muted, fontFamily:FB }}>
    {shared && <Icon name="Check" size={11} color={t.secondary} />}{label}
  </span>
);

// Inline verification badges beside a username — compact icon row.
const VerifyMarks = ({ levels=[], t, size=13, max=3 }) => {
  const show = levels.filter(l=>l!=="email"&&l!=="phone").slice(0,max);
  const list = show.length ? show : levels.slice(0,max);
  return <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
    {list.map(l=>{ const v=VERIFY_LEVELS[l]; if(!v) return null; const c=t[v.color]||t.muted; return <Icon key={l} name={v.icon} size={size} color={c} />; })}
  </span>;
};

// Premium crown pill.
const PremiumBadge = ({ t, small }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:`linear-gradient(135deg,${t.gold},${t.goldFill})`, borderRadius:6, padding:small?"1px 6px":"2px 9px 2px 7px", fontSize:small?9.5:10.5, fontWeight:800, color:"#fff", fontFamily:FB, letterSpacing:0.4, textTransform:"uppercase", whiteSpace:"nowrap" }}>
    <Icon name="Crown" size={small?10:12} color="#fff" /> Premium
  </span>
);

// Author line: name + verify marks + optional premium.
const AuthorLine = ({ name, t, premium, size=14.5 }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
    <span style={{ fontSize:size, fontWeight:700, color:t.text, fontFamily:FB }}>{name}</span>
    <VerifyMarks levels={getVerify(name)} t={t} />
    {(premium ?? USER_PREMIUM.includes(name)) && <PremiumBadge t={t} small />}
  </span>
);

// Small "PRO / Coming Soon" pill to mark Full-Vision-only features.
const VisionTag = ({ t, label="Vision" }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:t.gold+"1A", border:`1px solid ${t.gold}45`, borderRadius:5, padding:"1px 7px", fontSize:9.5, fontWeight:800, color:t.gold, fontFamily:FB, letterSpacing:0.5, textTransform:"uppercase", whiteSpace:"nowrap" }}>
    <Icon name="Sparkles" size={10} color={t.gold} /> {label}
  </span>
);

Object.assign(window, { FoodBadge, TrustBadge, Hallmark, MultiSelectFood, GroupFoodBuilder, CommunityVerified, CommBadge, PoweredBy, CompatBadge, InterestChip, VerifyMarks, PremiumBadge, AuthorLine, VisionTag });
