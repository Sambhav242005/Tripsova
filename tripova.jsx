import { useState, useEffect } from "react";

// fonts: Amiri (serif elegance), Cinzel Decorative (deco headers), Cormorant Garamond (classic body)
const FD = "'Cinzel Decorative', serif";   // decorative — logo, screen titles
const FH = "'Amiri', serif";               // elegant serif — headings, names
const FB = "'Cormorant Garamond', serif";  // classic body — all readable text

const LIGHT = {
  bg: "#FAF8F4", card: "#FFFFFF", accent: "#8B5E3C", secondary: "#C9956A",
  text: "#1C1410", muted: "#8A7968", border: "#E8E0D5", success: "#2D6A4F",
  warning: "#B5762A", danger: "#9B2335", overlay: "rgba(139,94,60,0.04)",
  tag: "#F4F0EA", gold: "#B8860B", teal: "#2E6B7A"
};
const DARK = {
  bg: "#100E0B", card: "#1A1612", accent: "#D4A574", secondary: "#C9956A",
  text: "#F0EAE0", muted: "#9A8C7C", border: "#2C2520", success: "#52B788",
  warning: "#E9C46A", danger: "#E07A5F", overlay: "rgba(212,165,116,0.05)",
  tag: "#1E1A16", gold: "#D4AF37", teal: "#5BA4B5"
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const FEED_POSTS = [
  { id:1, user:"Aryan M.", avatar:"AM", score:92, location:"Manali", category:"Food", time:"2h ago", expiry:"5 days", content:"Incredible Jain thali at Sharma Ji Ka Dhaba near Mall Road. ₹180, no onion garlic, spotless kitchen. A must for Jain travellers passing through.", helpful:34, verified:true },
  { id:2, user:"Priya S.", avatar:"PS", score:87, location:"Rishikesh", category:"Safety", time:"5h ago", expiry:"4 days", content:"Solo women — Lakshman Jhula is safe at night. Many cafes open till 11pm. Avoid the ghats after midnight. Beatles Café too crowded weekends — try Little Buddha instead.", helpful:61, verified:true },
  { id:3, user:"Rahul K.", avatar:"RK", score:78, location:"Spiti", category:"Transport", time:"1h ago", expiry:"6 days", content:"Alert — small landslide near Losar on Kaza road. Take alternate route via Gramphoo. Roads otherwise clear. 8°C right now, carry warm layers.", helpful:89, verified:false },
  { id:4, user:"Sneha V.", avatar:"SV", score:95, location:"Goa", category:"Stay", time:"3h ago", expiry:"4 days", content:"Hidden gem — Bluebell Homestay in Assagao. ₹1,200/night, pure veg kitchen, rooftop garden. Book directly to avoid OTA fees.", helpful:47, verified:true },
  { id:5, user:"Dev P.", avatar:"DP", score:83, location:"Coorg", category:"Weather", time:"6h ago", expiry:"1 day", content:"Heavy rain since morning. Abbey Falls trail slippery. Raja's Seat still open and breathtaking in the mist. Carry a raincoat.", helpful:28, verified:true },
];

const DESTINATIONS = [
  { name:"Manali", posts:23, gradient:"linear-gradient(150deg,#1a3d6b,#4A7FB5)" },
  { name:"Rishikesh", posts:41, gradient:"linear-gradient(150deg,#1a3d1a,#4A8C5C)" },
  { name:"Goa", posts:67, gradient:"linear-gradient(150deg,#6b2e00,#C9956A)" },
  { name:"Spiti", posts:12, gradient:"linear-gradient(150deg,#1a1a35,#6B68C4)" },
  { name:"Coorg", posts:19, gradient:"linear-gradient(150deg,#0a2010,#3A7A52)" },
  { name:"Jaisalmer", posts:31, gradient:"linear-gradient(150deg,#4a2e00,#B8860B)" },
  { name:"Udaipur", posts:28, gradient:"linear-gradient(150deg,#350020,#A05A82)" },
  { name:"Andaman", posts:15, gradient:"linear-gradient(150deg,#003040,#2E8BA8)" },
];

const ALL_FOOD_TYPES = [
  { id:"jain",      label:"Jain",        emoji:"🟡", color:"#B5762A", desc:"No root vegetables, separate prep" },
  { id:"pure_veg",  label:"Pure Veg",    emoji:"🟢", color:"#2D6A4F", desc:"Strictly vegetarian, no egg" },
  { id:"vegan",     label:"Vegan",       emoji:"🟣", color:"#6B4C9A", desc:"No animal products" },
  { id:"veg_egg",   label:"Veg + Egg",   emoji:"🟤", color:"#7A5C3A", desc:"Vegetarian including eggs" },
  { id:"halal",     label:"Halal",       emoji:"🔵", color:"#2E6B7A", desc:"Halal certified" },
  { id:"gluten",    label:"Gluten-Free", emoji:"⚪", color:"#5C6878", desc:"No wheat, barley, rye" },
  { id:"sattvic",   label:"Sattvic",     emoji:"🔴", color:"#8B2335", desc:"No onion, garlic, or meat" },
  { id:"kosher",    label:"Kosher",      emoji:"✡️", color:"#4A6A8A", desc:"Kosher certified" },
  { id:"buddhist",  label:"Buddhist Veg",emoji:"☸️", color:"#7A6A2A", desc:"No meat, often no egg" },
  { id:"everything",label:"Everything",  emoji:"🌐", color:"#6B7280", desc:"No restrictions" },
];

const RESTAURANTS = [
  { id:1, name:"Sharma Ji Ka Dhaba", location:"Manali", types:["jain","pure_veg"], verified:true, rating:4.8, reviews:234, tags:["No onion garlic","Separate kitchen","Jain thali"], distance:"0.3 km", lastVerified:"2 days ago", gradient:"linear-gradient(150deg,#1a3d6b,#4A7FB5)" },
  { id:2, name:"Oasis Restaurant", location:"Pushkar", types:["vegan","pure_veg"], verified:false, rating:4.6, reviews:189, tags:["100% Vegan","Organic","No dairy"], distance:"1.2 km", lastVerified:"5 days ago", gradient:"linear-gradient(150deg,#1a3d1a,#4A8C5C)" },
  { id:3, name:"Little Buddha Café", location:"Rishikesh", types:["vegan","gluten","buddhist"], verified:true, rating:4.9, reviews:412, tags:["Fully vegan","Gluten-free menu","Rooftop seating"], distance:"0.8 km", lastVerified:"1 day ago", gradient:"linear-gradient(150deg,#2a0060,#7B5DBF)" },
  { id:4, name:"Sai Kripa Restaurant", location:"Coorg", types:["pure_veg","sattvic"], verified:true, rating:4.5, reviews:156, tags:["South Indian","Sattvic menu","Thali specials"], distance:"2.1 km", lastVerified:"3 days ago", gradient:"linear-gradient(150deg,#0a2010,#3A7A52)" },
  { id:5, name:"Natraj Dining Hall", location:"Jaisalmer", types:["jain","pure_veg","sattvic"], verified:true, rating:4.7, reviews:298, tags:["Jain thali","No root veg","Rajasthani"], distance:"0.5 km", lastVerified:"4 days ago", gradient:"linear-gradient(150deg,#4a2e00,#B8860B)" },
  { id:6, name:"Green Bowl Café", location:"Goa", types:["vegan","gluten"], verified:false, rating:4.4, reviews:103, tags:["Plant-based","Açaí bowls","Fresh juices"], distance:"1.5 km", lastVerified:"6 days ago", gradient:"linear-gradient(150deg,#6b2e00,#C9956A)" },
  { id:7, name:"Al-Raheem Kitchen", location:"Hyderabad", types:["halal","everything"], verified:true, rating:4.7, reviews:521, tags:["Halal certified","Biryani","Family dining"], distance:"0.9 km", lastVerified:"1 day ago", gradient:"linear-gradient(150deg,#003040,#2E8BA8)" },
  { id:8, name:"Ananda Satvik Kitchen", location:"Varanasi", types:["sattvic","pure_veg","jain"], verified:true, rating:4.8, reviews:167, tags:["No onion/garlic","Sattvic thali","Ayurvedic"], distance:"0.6 km", lastVerified:"3 days ago", gradient:"linear-gradient(150deg,#350020,#A05A82)" },
];

const PODS = [
  { id:1, destination:"Spiti Valley", dates:"Oct 10–17", duration:"7 days", budget:"₹12,000", spots:2, host:"Aryan M.", score:92, style:"Adventure", verified:true, description:"Epic Spiti circuit — Kaza, Key Monastery, Chandratal Lake. Serious trekkers only.", gradient:"linear-gradient(150deg,#1a1a35,#6B68C4)", groupFoods:["jain","pure_veg"] },
  { id:2, destination:"Goa Beach Trip", dates:"Nov 1–5", duration:"4 days", budget:"₹8,000", spots:3, host:"Sneha V.", score:95, style:"Friends", verified:true, description:"North Goa beaches, sunset vibes, great food. Chill group, mixed food preferences welcome.", gradient:"linear-gradient(150deg,#6b2e00,#C9956A)", groupFoods:["vegan","everything","pure_veg"] },
  { id:3, destination:"Andaman Islands", dates:"Dec 20–28", duration:"8 days", budget:"₹18,000", spots:1, host:"Dev P.", score:83, style:"Adventure", verified:false, description:"Havelock, Neil Island, scuba diving. One calm ocean lover needed.", gradient:"linear-gradient(150deg,#003040,#2E8BA8)", groupFoods:["everything","halal"] },
  { id:4, destination:"Udaipur Heritage", dates:"Oct 25–29", duration:"4 days", budget:"₹9,500", spots:2, host:"Priya S.", score:87, style:"Cultural", verified:true, description:"Lakes, palaces, bazaars, sunset boat rides. Jain food available throughout.", gradient:"linear-gradient(150deg,#350020,#A05A82)", groupFoods:["jain","sattvic"] },
];

const GUIDES = [
  { id:1, name:"Vikram Singh", location:"Jaisalmer", speciality:"Desert & Heritage", languages:["Hindi","English"], rating:4.9, reviews:312, price:"₹1,200/day", score:94, verified:true, tags:["Desert safari","Fort tours","Camel trek"], gradient:"linear-gradient(150deg,#4a2e00,#B8860B)" },
  { id:2, name:"Meera Nair", location:"Munnar", speciality:"Nature & Tea Estates", languages:["Malayalam","English","Tamil"], rating:4.8, reviews:189, price:"₹900/day", score:91, verified:true, tags:["Tea estate walks","Bird watching","Waterfalls"], gradient:"linear-gradient(150deg,#0a2010,#3A7A52)" },
  { id:3, name:"Arjun Thapa", location:"Manali", speciality:"Trekking & Adventure", languages:["Hindi","English","Nepali"], rating:4.7, reviews:245, price:"₹1,500/day", score:88, verified:true, tags:["High altitude treks","Camping","Snow routes"], gradient:"linear-gradient(150deg,#1a3d6b,#4A7FB5)" },
  { id:4, name:"Fatima Khan", location:"Agra", speciality:"History & Mughal Heritage", languages:["Hindi","English","Urdu"], rating:4.9, reviews:421, price:"₹800/day", score:96, verified:true, tags:["Taj Mahal","Mughal history","Photography spots"], gradient:"linear-gradient(150deg,#350020,#A05A82)" },
];

const FAMILY_MEMBERS = [
  { id:1, name:"Maa", relation:"Mother", avatar:"MA", location:"Manali", lastSeen:"10 min ago", status:"active", trip:"Manali Trip", checkins:3 },
  { id:2, name:"Papa", relation:"Father", avatar:"PA", location:"Delhi", lastSeen:"2 hrs ago", status:"home", trip:null, checkins:0 },
];

const CAT_COLORS = { Food:"#2D6A4F", Safety:"#9B2335", Transport:"#B5762A", Stay:"#2E6B7A", Weather:"#6B4C9A", Crowd:"#8B2335" };
const LANGUAGES = ["English","हिंदी","தமிழ்","বাংলা","मराठी","العربية"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getFI = (id) => ALL_FOOD_TYPES.find(f => f.id === id) || ALL_FOOD_TYPES[0];

const Divider = ({ t }) => <div style={{ height:1, background:`linear-gradient(90deg, transparent, ${t.border}, transparent)`, margin:"4px 0" }} />;

const FoodBadge = ({ id, small, t }) => {
  const f = getFI(id);
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:f.color+"18", border:`1px solid ${f.color}30`, borderRadius:4, padding:small?"2px 8px":"3px 11px", fontSize:small?10:11, fontWeight:600, color:f.color, fontFamily:FB, whiteSpace:"nowrap", letterSpacing:0.3 }}>{f.emoji} {f.label}</span>;
};

const TrustBadge = ({ score, t }) => {
  const color = score>=80 ? t.success : score>=60 ? t.accent : t.warning;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:color+"18", border:`1px solid ${color}30`, borderRadius:4, padding:"2px 9px", fontSize:11, fontWeight:700, color, fontFamily:FB }}>✦ {score}</span>;
};

const SectionTitle = ({ children, t }) => (
  <div style={{ fontSize:10, fontWeight:700, color:t.muted, letterSpacing:2.5, textTransform:"uppercase", fontFamily:FD, marginBottom:12 }}>{children}</div>
);

const Card = ({ children, t, style={} }) => (
  <div style={{ background:t.card, borderRadius:16, padding:16, border:`1px solid ${t.border}`, marginBottom:14, ...style }}>{children}</div>
);

const Btn = ({ children, onClick, full, outline, color, t, disabled, small }) => {
  const bg = outline ? "transparent" : (color || t.accent);
  const fg = outline ? (color || t.accent) : "#fff";
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:full?"100%":"auto", padding:small?"7px 16px":"12px 20px", borderRadius:8, border:`1.5px solid ${outline ? (color||t.accent) : "transparent"}`, background:disabled?t.muted:bg, color:disabled?"#fff":fg, fontSize:small?12:14, fontWeight:700, fontFamily:FB, cursor:disabled?"not-allowed":"pointer", letterSpacing:0.5, transition:"all 0.2s", opacity:disabled?0.7:1 }}>
      {children}
    </button>
  );
};

const InputF = ({ label, value, onChange, placeholder, type="text", t }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ fontSize:9, fontWeight:700, color:t.muted, letterSpacing:2.5, textTransform:"uppercase", fontFamily:FD, marginBottom:6 }}>{label}</div>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width:"100%", padding:"11px 14px", borderRadius:8, border:`1px solid ${t.border}`, background:t.bg, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" }}
      onFocus={e=>e.target.style.borderColor=t.accent} onBlur={e=>e.target.style.borderColor=t.border} />
  </div>
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
    {selected.length>0 && <div style={{ marginTop:10, padding:"8px 12px", background:t.accent+"10", borderRadius:8, fontSize:12, color:t.accent, fontFamily:FB, borderLeft:`3px solid ${t.accent}` }}>Filtering for: {selected.map(id=>getFI(id).label).join(" + ")}</div>}
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
        <div style={{ fontSize:9, fontWeight:700, color:t.muted, letterSpacing:2.5, textTransform:"uppercase", fontFamily:FD }}>Group Members</div>
        <Btn onClick={add} outline t={t} small>+ Add Person</Btn>
      </div>
      {members.map((m,i) => (
        <div key={i} style={{ background:t.tag, borderRadius:10, padding:12, marginBottom:10, border:`1px solid ${t.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
            <input value={m.name} onChange={e=>update(i,"name",e.target.value)} style={{ background:"transparent", border:"none", fontSize:14, fontWeight:700, color:t.text, fontFamily:FH, outline:"none", width:"70%" }} />
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
      {allFoods.length>0 && <div style={{ padding:"10px 14px", background:t.accent+"10", borderRadius:8, borderLeft:`3px solid ${t.accent}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:t.accent, fontFamily:FH, marginBottom:6 }}>Group needs — must support all:</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>{allFoods.map(id=><FoodBadge key={id} id={id} small t={t} />)}</div>
      </div>}
    </div>
  );
};

const SkeletonCard = ({ t }) => (
  <div style={{ background:t.card, borderRadius:16, padding:18, marginBottom:12, border:`1px solid ${t.border}` }}>
    {[75,100,55,80].map((w,i)=><div key={i} style={{ height:11, background:t.border, borderRadius:4, width:`${w}%`, marginBottom:9, animation:"shimmer 1.5s infinite" }} />)}
  </div>
);

// ─── EXPLORE ─────────────────────────────────────────────────────────────────
function ExploreScreen({ t }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [helpful, setHelpful] = useState({});
  useEffect(()=>{ setTimeout(()=>{ setPosts(FEED_POSTS); setLoading(false); },1100); },[]);
  const filtered = posts.filter(p => search===""||p.location.toLowerCase().includes(search.toLowerCase())||p.content.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ position:"relative", marginBottom:20 }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15, opacity:0.4 }}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search any destination..."
          style={{ width:"100%", padding:"12px 16px 12px 42px", borderRadius:10, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box" }} />
      </div>

      <SectionTitle t={t}>Live Destinations</SectionTitle>
      <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:6, marginBottom:24, scrollbarWidth:"none" }}>
        {DESTINATIONS.map(d=>(
          <div key={d.name} style={{ flexShrink:0, width:106, height:146, borderRadius:12, background:d.gradient, position:"relative", cursor:"pointer", overflow:"hidden", transition:"transform 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04) translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"10px 10px 12px", background:"linear-gradient(transparent,rgba(0,0,0,0.72))" }}>
              <div style={{ color:"#fff", fontSize:13, fontWeight:700, fontFamily:FH }}>{d.name}</div>
              <div style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontFamily:FB, marginTop:1 }}>● {d.posts} live</div>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle t={t}>Live Updates</SectionTitle>
      {loading ? [1,2,3].map(i=><SkeletonCard key={i} t={t}/>) : filtered.map((post,idx)=>(
        <div key={post.id} style={{ background:t.card, borderRadius:16, padding:18, marginBottom:12, border:`1px solid ${t.border}`, animation:`fadeUp 0.4s ease ${idx*0.09}s both`, cursor:"pointer", transition:"box-shadow 0.2s, transform 0.2s" }}
          onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 6px 28px ${t.accent}18`; e.currentTarget.style.transform="translateY(-1px)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.secondary})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:800, fontFamily:FH, flexShrink:0 }}>{post.avatar}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:t.text, fontFamily:FH }}>{post.user}{post.verified&&" ✓"}</div>
                <div style={{ fontSize:11, color:t.muted, fontFamily:FB }}>📍 {post.location} · {post.time}</div>
              </div>
            </div>
            <TrustBadge score={post.score} t={t} />
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, fontWeight:700, color:CAT_COLORS[post.category], background:CAT_COLORS[post.category]+"15", padding:"3px 10px", borderRadius:4, fontFamily:FB }}>{post.category}</span>
            <span style={{ fontSize:11, color:t.muted, background:t.tag, padding:"3px 10px", borderRadius:4, fontFamily:FB }}>Expires in {post.expiry}</span>
          </div>
          <p style={{ fontSize:14, color:t.text, lineHeight:1.7, margin:"0 0 12px", fontFamily:FB }}>{post.content}</p>
          <Divider t={t} />
          <div style={{ display:"flex", gap:10, marginTop:10 }}>
            <button onClick={()=>setHelpful(h=>({...h,[post.id]:!h[post.id]}))}
              style={{ display:"flex", alignItems:"center", gap:5, background:helpful[post.id]?t.accent+"15":t.tag, border:`1px solid ${helpful[post.id]?t.accent:t.border}`, borderRadius:5, padding:"5px 13px", cursor:"pointer", color:helpful[post.id]?t.accent:t.muted, fontSize:12, fontWeight:600, fontFamily:FB, transition:"all 0.2s" }}>
              👍 {post.helpful+(helpful[post.id]?1:0)} Helpful
            </button>
            <button style={{ background:"transparent", border:"none", color:t.muted, fontSize:12, cursor:"pointer", fontFamily:FB }}>Reply</button>
          </div>
        </div>
      ))}
      <button style={{ position:"fixed", bottom:92, right:20, width:52, height:52, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.secondary})`, border:"none", color:"#fff", fontSize:24, cursor:"pointer", boxShadow:`0 4px 20px ${t.accent}50`, display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>+</button>
    </div>
  );
}

// ─── PLAN ─────────────────────────────────────────────────────────────────────
function PlanScreen({ t }) {
  const [form, setForm] = useState({ destination:"", days:"4", groupType:"Friends", budget:"10000", interests:[], foods:[], groupMode:false, members:[{name:"Person 1",foods:[]}] });
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState(null);

  const groupTypes = [{id:"Solo",icon:"🧍"},{id:"Couple",icon:"👫"},{id:"Family",icon:"👨‍👩‍👧"},{id:"Friends",icon:"👯"}];
  const interests = ["Adventure","Nature","Food","Culture","Spiritual","Photography","Shopping","Wellness"];
  const toggleI = (i) => setForm(f=>({...f,interests:f.interests.includes(i)?f.interests.filter(x=>x!==i):[...f.interests,i]}));
  const getActiveFoods = () => form.groupMode ? [...new Set(form.members.flatMap(m=>m.foods))] : form.foods;

  const generate = async () => {
    if (!form.destination){setError("Please enter a destination");return;}
    setLoading(true);setItinerary(null);setError(null);
    await new Promise(r=>setTimeout(r,2000));
    const aF = getActiveFoods();
    const perDay = Math.floor(parseInt(form.budget)/parseInt(form.days));
    const foodRecs = { jain:["Jain Bhavan","Purity Kitchen","Shree Ram Jain Bhojanalay"], pure_veg:["Satvik Dhaba","Shuddh Shakahari","Pure Veg Corner"], vegan:["Green Bowl Café","The Vegan Table","Plant Plate"], halal:["Al-Raheem Kitchen","Bismillah Foods","Halal Corner"], everything:["Local Dhaba","Mountain Café","Traveller's Table"], gluten:["GF Kitchen","Pure Plate","Clean Bowl"], sattvic:["Satvik Ashram Kitchen","Divine Foods","Pure Soul Café"], everything:["Local Dhaba","Mountain Café","Traveller's Table"] };
    const foods = foodRecs[aF[0]||"everything"] || foodRecs["everything"];
    const acts = { Adventure:[["Sunrise Trek","Panoramic mountain hike"],["Valley Exploration","Hidden trails and streams"],["Summit Push","Reach the top before golden hour"]], Nature:[["Dawn Nature Walk","Forests, meadows, birdsong"],["Waterfall Hike","Hidden falls in the hills"],["Wildlife Spotting","Fauna, flora, open skies"]], Food:[["Market Food Walk","Street food, spice stalls, local flavour"],["Cooking Class","Regional recipes from local families"],["Restaurant Crawl","Best spots curated for your diet"]], Culture:[["Temple & Heritage Tour","Ancient architecture and history"],["Museum Visit","Regional art and culture"],["Folk Performance","Traditional music and dance"]], Spiritual:[["Sunrise Meditation","Guided practice by the river"],["Ashram Visit","Discourse and inner reflection"],["Evening Aarti","Sacred prayer ceremony at dusk"]], Photography:[["Golden Hour Shoot","The destination at its cinematic best"],["Street Walk","People, markets, texture, light"],["Night Sky","Stars, long exposures, silence"]], Shopping:[["Local Bazaar","Handcrafts, textiles, antiques"],["Artisan Workshop","Watch masters at work"],["Night Market","Street stalls and local goods"]], Wellness:[["Morning Yoga","Guided session in nature"],["Ayurvedic Spa","Traditional healing therapies"],["Sound Bath","Meditation and inner calm"]] };
    const a = acts[form.interests[0]||"Nature"]||acts["Nature"];
    const dayTitles = ["Arrival & First Light","Deep Exploration","Local Immersion","Hidden Gems","Adventure Day","Leisure & Reflection","Farewell"];
    const days = Array.from({length:Math.min(parseInt(form.days),5)},(_,i)=>({ day:i+1, title:dayTitles[i]||`Day ${i+1}`,
      morning:{activity:i===0?`Arrive in ${form.destination} & Settle In`:a[i%a.length][0], description:i===0?"Check in, freshen up, explore the neighbourhood":a[i%a.length][1], cost:`₹${Math.floor(perDay*0.3)}`, food:foods[0]},
      afternoon:{activity:i===0?`${form.destination} First Walk`:a[(i+1)%a.length][0], description:i===0?"Stroll through main market and landmarks":a[(i+1)%a.length][1], cost:`₹${Math.floor(perDay*0.4)}`, food:foods[1]},
      evening:{activity:i===parseInt(form.days)-1?"Pack & Farewell":`Sunset at ${form.destination}`, description:i===parseInt(form.days)-1?"Pack up, reflect, early rest":"Watch the sun go down with a warm drink", cost:`₹${Math.floor(perDay*0.3)}`, food:foods[2]||foods[0]}
    }));
    const tips = [
      `Book accommodation in ${form.destination} at least 2 weeks ahead in peak season`,
      aF.includes("jain")?"Call ahead to confirm Jain preparation — most good restaurants accommodate with advance notice":"Ask locals for hidden gems — the best spots are never on Google Maps",
      form.groupType==="Solo"?"Join local traveller WhatsApp groups for safety and impromptu companions":"Tripova's Budget Tracker splits all expenses automatically — zero awkwardness",
      aF.length>1?`For your mixed group, look for restaurants with multi-section menus — many hill stations cater to all types`:"Carry backup snacks from a local grocery — especially useful in remote areas",
    ];
    setItinerary({destination:form.destination,totalCost:`₹${form.budget}`,activeFoods:aF,days,tips});
    setLoading(false);
  };

  return (
    <div style={{ padding:"0 16px 110px" }}>
      <Card t={t}>
        <div style={{ fontSize:18, fontWeight:700, color:t.text, marginBottom:18, fontFamily:FH }}>✦ Build My Trip</div>
        <InputF label="Destination" value={form.destination} onChange={e=>setForm(f=>({...f,destination:e.target.value}))} placeholder="Manali, Goa, Spiti, Udaipur..." t={t} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:0 }}>
          <InputF label="Days" value={form.days} onChange={e=>setForm(f=>({...f,days:e.target.value}))} type="number" t={t} />
          <InputF label="Budget (₹)" value={form.budget} onChange={e=>setForm(f=>({...f,budget:e.target.value}))} type="number" t={t} />
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9, fontWeight:700, color:t.muted, letterSpacing:2.5, textTransform:"uppercase", fontFamily:FD, marginBottom:8 }}>Group Type</div>
          <div style={{ display:"flex", gap:8 }}>
            {groupTypes.map(g=><button key={g.id} onClick={()=>setForm(f=>({...f,groupType:g.id}))} style={{ flex:1, padding:"9px 6px", borderRadius:8, border:`1.5px solid ${form.groupType===g.id?t.accent:t.border}`, background:form.groupType===g.id?t.accent+"12":t.tag, color:form.groupType===g.id?t.accent:t.muted, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FB, display:"flex", flexDirection:"column", alignItems:"center", gap:3, transition:"all 0.18s" }}><span style={{fontSize:18}}>{g.icon}</span>{g.id}</button>)}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9, fontWeight:700, color:t.muted, letterSpacing:2.5, textTransform:"uppercase", fontFamily:FD, marginBottom:8 }}>Interests</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {interests.map(i=>{ const a=form.interests.includes(i); return <button key={i} onClick={()=>toggleI(i)} style={{ padding:"6px 14px", borderRadius:6, border:`1.5px solid ${a?t.accent:t.border}`, background:a?t.accent+"12":t.tag, color:a?t.accent:t.muted, fontSize:12, fontWeight:a?700:400, cursor:"pointer", fontFamily:FB, transition:"all 0.18s" }}>{i}</button>; })}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", background:t.tag, borderRadius:8, padding:3, marginBottom:12 }}>
            {[{id:false,label:"My preferences"},{id:true,label:"Different per person"}].map(opt=><button key={String(opt.id)} onClick={()=>setForm(f=>({...f,groupMode:opt.id}))} style={{ flex:1, padding:"8px", borderRadius:6, border:"none", background:form.groupMode===opt.id?t.card:"transparent", color:form.groupMode===opt.id?t.text:t.muted, fontWeight:form.groupMode===opt.id?700:400, cursor:"pointer", fontSize:12, fontFamily:FB, transition:"all 0.2s" }}>{opt.label}</button>)}
          </div>
          {!form.groupMode ? <MultiSelectFood selected={form.foods} onChange={foods=>setForm(f=>({...f,foods}))} t={t} hint="Select all that apply — mix and match freely" /> : <GroupFoodBuilder members={form.members} onChange={members=>setForm(f=>({...f,members}))} t={t} />}
        </div>
        {error && <div style={{ background:t.danger+"12", border:`1px solid ${t.danger}25`, borderRadius:8, padding:"10px 14px", color:t.danger, fontSize:13, marginBottom:12, fontFamily:FB }}>{error}</div>}
        <Btn onClick={generate} disabled={loading} full t={t}>{loading?"Crafting your journey...":"✦ Build My Trip"}</Btn>
      </Card>

      {loading && <div style={{ textAlign:"center", padding:"50px 20px" }}>
        <div style={{ fontSize:34, animation:"spin 2s linear infinite", display:"inline-block", marginBottom:14, color:t.accent }}>✦</div>
        <div style={{ color:t.muted, fontSize:14, fontFamily:FB, fontStyle:"italic" }}>Crafting your perfect journey...</div>
      </div>}

      {itinerary && <div style={{ animation:"fadeUp 0.5s ease both" }}>
        <div style={{ background:`linear-gradient(135deg,${t.accent}15,${t.secondary}10)`, borderRadius:16, padding:18, marginBottom:14, border:`1px solid ${t.accent}20` }}>
          <div style={{ fontSize:20, fontWeight:700, color:t.text, fontFamily:FH }}>📍 {itinerary.destination}</div>
          <div style={{ fontSize:13, color:t.muted, fontFamily:FB, marginTop:4 }}>Estimated total: <span style={{ color:t.accent, fontWeight:700 }}>{itinerary.totalCost}</span></div>
          {itinerary.activeFoods.length>0 && <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>{itinerary.activeFoods.map(id=><FoodBadge key={id} id={id} small t={t} />)}</div>}
        </div>
        {itinerary.days.map(day=>(
          <Card key={day.day} t={t}>
            <div style={{ fontSize:13, fontWeight:700, color:t.accent, marginBottom:14, fontFamily:FH }}>Day {day.day} — {day.title}</div>
            {["morning","afternoon","evening"].map(time=>day[time]&&<div key={time} style={{ marginBottom:12, paddingLeft:14, borderLeft:`2px solid ${t.border}` }}>
              <div style={{ fontSize:9, fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:2, fontFamily:FD }}>{time}</div>
              <div style={{ fontSize:14, fontWeight:700, color:t.text, fontFamily:FH, marginTop:2 }}>{day[time].activity}</div>
              <div style={{ fontSize:13, color:t.muted, fontFamily:FB, marginTop:2 }}>{day[time].description}</div>
              <div style={{ display:"flex", gap:12, marginTop:5 }}>
                <span style={{ fontSize:11, color:t.success, fontFamily:FB, fontWeight:600 }}>💰 {day[time].cost}</span>
                <span style={{ fontSize:11, color:t.secondary, fontFamily:FB, fontWeight:600 }}>🍽 {day[time].food}</span>
              </div>
            </div>)}
          </Card>
        ))}
        <Card t={t}>
          <div style={{ fontSize:14, fontWeight:700, color:t.text, marginBottom:12, fontFamily:FH }}>💡 Pro Tips</div>
          {itinerary.tips.map((tip,i)=><div key={i} style={{ fontSize:13, color:t.muted, marginBottom:9, paddingLeft:12, borderLeft:`2px solid ${t.secondary}`, fontFamily:FB, lineHeight:1.6 }}>{tip}</div>)}
        </Card>
      </div>}
    </div>
  );
}

// ─── PUREFIND ─────────────────────────────────────────────────────────────────
function PureFindScreen({ t }) {
  const [filters, setFilters] = useState([]);
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const toggleF = (id) => setFilters(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id]);
  const filtered = RESTAURANTS.filter(r=>{
    const ms = search===""||r.name.toLowerCase().includes(search.toLowerCase())||r.location.toLowerCase().includes(search.toLowerCase());
    const mf = filters.length===0||filters.every(f=>r.types.includes(f));
    return ms && mf;
  });

  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ background:`linear-gradient(135deg,${t.accent}10,${t.secondary}08)`, borderRadius:12, padding:"13px 16px", marginBottom:16, border:`1px solid ${t.accent}15` }}>
        <div style={{ fontSize:14, color:t.accent, fontWeight:700, fontFamily:FH }}>🌿 Find food you can actually eat</div>
        <div style={{ fontSize:12, color:t.muted, fontFamily:FB, marginTop:2, fontStyle:"italic" }}>Community-verified. Updated in real time.</div>
      </div>

      <div style={{ position:"relative", marginBottom:14 }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15, opacity:0.4 }}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search restaurant or city..."
          style={{ width:"100%", padding:"12px 16px 12px 42px", borderRadius:10, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box" }} />
      </div>

      {/* AI Menu Scanner — Phase 2 Feature 14 */}
      <div style={{ background:t.card, borderRadius:12, padding:"12px 16px", marginBottom:16, border:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:t.text, fontFamily:FH }}>📷 AI Menu Scanner</div>
          <div style={{ fontSize:11, color:t.muted, fontFamily:FB, fontStyle:"italic" }}>Photograph any menu — AI highlights safe items</div>
        </div>
        <button onClick={()=>{ setScanning(true); setTimeout(()=>setScanning(false),2500); }}
          style={{ padding:"8px 16px", borderRadius:7, border:`1.5px solid ${t.accent}`, background:t.accent+"12", color:t.accent, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FB }}>
          {scanning?"Scanning...":"Scan Menu"}
        </button>
      </div>
      {scanning && <div style={{ background:t.accent+"10", borderRadius:12, padding:"12px 16px", marginBottom:14, border:`1px solid ${t.accent}20`, fontFamily:FB, fontSize:13, color:t.accent, fontStyle:"italic" }}>🔍 AI scanning menu... identifying Jain ✓ and Vegan ✓ items...</div>}

      <SectionTitle t={t}>Filter by Food Type — Select Multiple</SectionTitle>
      <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
        {ALL_FOOD_TYPES.filter(f=>f.id!=="everything").map(f=>{ const active=filters.includes(f.id); return <button key={f.id} onClick={()=>toggleF(f.id)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:6, border:`1.5px solid ${active?f.color:t.border}`, background:active?f.color+"15":t.tag, color:active?f.color:t.muted, fontSize:12, fontWeight:active?700:400, cursor:"pointer", fontFamily:FB, transition:"all 0.18s" }}>{f.emoji} {f.label} {active&&"✓"}</button>; })}
      </div>
      {filters.length>1 && <div style={{ padding:"8px 12px", background:t.accent+"10", borderRadius:8, fontSize:12, color:t.accent, fontFamily:FB, marginBottom:12, borderLeft:`3px solid ${t.accent}`, fontStyle:"italic" }}>Showing places that support {filters.map(id=>getFI(id).label).join(" + ")} — ideal for mixed groups</div>}
      {filters.length>0 && <button onClick={()=>setFilters([])} style={{ fontSize:12, color:t.muted, background:"transparent", border:"none", cursor:"pointer", fontFamily:FB, marginBottom:10 }}>✕ Clear filters</button>}

      <div style={{ fontSize:12, color:t.muted, fontFamily:FB, marginBottom:14, fontStyle:"italic" }}>{filtered.length} places found</div>

      {filtered.length===0 && <div style={{ textAlign:"center", padding:"50px 20px" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🍽</div>
        <div style={{ fontSize:16, fontWeight:700, color:t.text, fontFamily:FH, marginBottom:6 }}>No places found</div>
        <div style={{ fontSize:13, color:t.muted, fontFamily:FB, fontStyle:"italic" }}>Try removing a filter or searching a different city</div>
      </div>}

      {filtered.map((r,idx)=>(
        <div key={r.id} style={{ background:t.card, borderRadius:16, overflow:"hidden", marginBottom:14, border:`1px solid ${t.border}`, animation:`fadeUp 0.4s ease ${idx*0.07}s both`, cursor:"pointer", transition:"box-shadow 0.2s, transform 0.2s" }}
          onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 6px 24px ${t.accent}18`; e.currentTarget.style.transform="translateY(-1px)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}>
          <div style={{ height:78, background:r.gradient, position:"relative" }}>
            {r.verified && <div style={{ position:"absolute", top:10, right:10, background:t.gold, borderRadius:4, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#fff", fontFamily:FB }}>✦ Jain-Safe Verified</div>}
          </div>
          <div style={{ padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div><div style={{ fontSize:15, fontWeight:700, color:t.text, fontFamily:FH }}>{r.name}</div><div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>📍 {r.location} · {r.distance}</div></div>
              <div style={{ textAlign:"right" }}><div style={{ fontSize:14, fontWeight:700, color:t.warning, fontFamily:FB }}>★ {r.rating}</div><div style={{ fontSize:11, color:t.muted, fontFamily:FB }}>{r.reviews} reviews</div></div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>{r.types.map(id=><FoodBadge key={id} id={id} small t={t} />)}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>{r.tags.map(tag=><span key={tag} style={{ fontSize:11, color:t.muted, background:t.tag, padding:"3px 10px", borderRadius:4, fontFamily:FB }}>{tag}</span>)}</div>
            <div style={{ fontSize:11, color:t.muted, fontFamily:FB, fontStyle:"italic" }}>✓ Verified {r.lastVerified} by community</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PODS ─────────────────────────────────────────────────────────────────────
function PodsScreen({ t }) {
  const [tab, setTab] = useState("find");
  const [joined, setJoined] = useState({});
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ display:"flex", background:t.tag, borderRadius:10, padding:3, marginBottom:20 }}>
        {["find","mine"].map(tb=><button key={tb} onClick={()=>setTab(tb)} style={{ flex:1, padding:"9px", borderRadius:8, border:"none", background:tab===tb?t.card:"transparent", color:tab===tb?t.text:t.muted, fontWeight:tab===tb?700:400, cursor:"pointer", fontSize:13, fontFamily:FB, transition:"all 0.2s" }}>{tb==="find"?"Find a Pod":"My Pods"}</button>)}
      </div>
      {tab==="find" && PODS.map((pod,idx)=>(
        <div key={pod.id} style={{ background:t.card, borderRadius:16, overflow:"hidden", marginBottom:14, border:`1px solid ${t.border}`, animation:`fadeUp 0.4s ease ${idx*0.08}s both` }}>
          <div style={{ height:78, background:pod.gradient, position:"relative" }}>
            <div style={{ position:"absolute", top:10, left:12, background:"rgba(0,0,0,0.45)", borderRadius:4, padding:"3px 10px", fontSize:11, color:"#fff", fontFamily:FB }}>{pod.style}</div>
            <div style={{ position:"absolute", top:10, right:12, background:pod.spots<=1?"#9B233540":"#2D6A4F40", borderRadius:4, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#fff", fontFamily:FB, border:`1px solid ${pod.spots<=1?"#9B2335":"#2D6A4F"}60` }}>{pod.spots} spot{pod.spots>1?"s":""} left</div>
          </div>
          <div style={{ padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div><div style={{ fontSize:16, fontWeight:700, color:t.text, fontFamily:FH }}>{pod.destination}</div><div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>{pod.dates} · {pod.duration}</div></div>
              <div style={{ fontSize:15, fontWeight:700, color:t.accent, fontFamily:FH }}>{pod.budget}<span style={{ fontSize:11, color:t.muted, fontWeight:400 }}>/person</span></div>
            </div>
            <p style={{ fontSize:13, color:t.muted, lineHeight:1.6, margin:"0 0 12px", fontFamily:FB, fontStyle:"italic" }}>{pod.description}</p>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:t.muted, fontFamily:FD, textTransform:"uppercase", letterSpacing:2, marginBottom:6 }}>Group Eats</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{pod.groupFoods.map(id=><FoodBadge key={id} id={id} small t={t} />)}</div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.secondary})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700 }}>{pod.host.split(" ").map(w=>w[0]).join("")}</div>
                <div><div style={{ fontSize:12, color:t.text, fontWeight:700, fontFamily:FH }}>{pod.host}{pod.verified&&" ✓"}</div><TrustBadge score={pod.score} t={t} /></div>
              </div>
              <button onClick={()=>setJoined(j=>({...j,[pod.id]:!j[pod.id]}))} style={{ padding:"8px 18px", borderRadius:7, border:`1.5px solid ${joined[pod.id]?t.success:t.accent}`, background:joined[pod.id]?t.success+"15":t.accent+"10", color:joined[pod.id]?t.success:t.accent, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FB, transition:"all 0.2s" }}>{joined[pod.id]?"✓ Requested":"Request to Join"}</button>
            </div>
          </div>
        </div>
      ))}
      {tab==="mine" && <div style={{ textAlign:"center", padding:"70px 20px" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🎒</div>
        <div style={{ fontSize:18, fontWeight:700, color:t.text, fontFamily:FH, marginBottom:8 }}>No pods yet</div>
        <div style={{ fontSize:14, color:t.muted, fontFamily:FB, fontStyle:"italic", marginBottom:24 }}>Be the first to create one for your next destination</div>
        <Btn onClick={()=>setTab("find")} t={t}>Browse Pods</Btn>
      </div>}
      <button style={{ position:"fixed", bottom:92, right:20, width:52, height:52, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.secondary})`, border:"none", color:"#fff", fontSize:24, cursor:"pointer", boxShadow:`0 4px 20px ${t.accent}50`, display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>+</button>
    </div>
  );
}

// ─── GUIDES — Phase 2 Feature 10 ─────────────────────────────────────────────
function GuidesScreen({ t }) {
  const [booked, setBooked] = useState({});
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ background:`linear-gradient(135deg,${t.gold}12,${t.accent}08)`, borderRadius:12, padding:"13px 16px", marginBottom:20, border:`1px solid ${t.gold}20` }}>
        <div style={{ fontSize:14, color:t.gold, fontWeight:700, fontFamily:FH }}>🧭 Local Guide Marketplace</div>
        <div style={{ fontSize:12, color:t.muted, fontFamily:FB, fontStyle:"italic", marginTop:2 }}>Verified guides. Real experiences. Fair prices.</div>
      </div>
      {GUIDES.map((g,idx)=>(
        <div key={g.id} style={{ background:t.card, borderRadius:16, overflow:"hidden", marginBottom:14, border:`1px solid ${t.border}`, animation:`fadeUp 0.4s ease ${idx*0.08}s both` }}>
          <div style={{ height:70, background:g.gradient, position:"relative" }}>
            {g.verified && <div style={{ position:"absolute", top:10, right:10, background:t.gold, borderRadius:4, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#fff", fontFamily:FB }}>✦ Verified Guide</div>}
          </div>
          <div style={{ padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:t.text, fontFamily:FH }}>{g.name}</div>
                <div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>📍 {g.location} · {g.speciality}</div>
                <div style={{ fontSize:11, color:t.muted, fontFamily:FB, marginTop:3 }}>🗣 {g.languages.join(", ")}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:14, fontWeight:700, color:t.warning, fontFamily:FB }}>★ {g.rating}</div>
                <div style={{ fontSize:11, color:t.muted, fontFamily:FB }}>{g.reviews} reviews</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {g.tags.map(tag=><span key={tag} style={{ fontSize:11, color:t.muted, background:t.tag, padding:"3px 10px", borderRadius:4, fontFamily:FB }}>{tag}</span>)}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <TrustBadge score={g.score} t={t} />
                <div style={{ fontSize:13, fontWeight:700, color:t.accent, fontFamily:FH, marginTop:6 }}>{g.price}</div>
              </div>
              <button onClick={()=>setBooked(b=>({...b,[g.id]:!b[g.id]}))} style={{ padding:"9px 18px", borderRadius:7, border:`1.5px solid ${booked[g.id]?t.success:t.accent}`, background:booked[g.id]?t.success+"15":t.accent+"10", color:booked[g.id]?t.success:t.accent, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FB }}>{booked[g.id]?"✓ Booked":"Book Guide"}</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FAMILY CIRCLE — Phase 2 Feature 8 ───────────────────────────────────────
function FamilyScreen({ t }) {
  const [checkin, setCheckin] = useState(false);
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ background:`linear-gradient(135deg,${t.success}10,${t.teal}08)`, borderRadius:12, padding:"13px 16px", marginBottom:20, border:`1px solid ${t.success}15` }}>
        <div style={{ fontSize:14, color:t.success, fontWeight:700, fontFamily:FH }}>👨‍👩‍👧 Family Circle</div>
        <div style={{ fontSize:12, color:t.muted, fontFamily:FB, fontStyle:"italic", marginTop:2 }}>Share your journey. Keep loved ones at ease.</div>
      </div>

      <SectionTitle t={t}>Your Check-In</SectionTitle>
      <Card t={t}>
        <div style={{ fontSize:13, fontWeight:700, color:t.text, fontFamily:FH, marginBottom:12 }}>Share your current status</div>
        <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
          {["I've arrived safely","All is well","On the move","Need to be reached"].map(status=>(
            <button key={status} style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${t.border}`, background:t.tag, color:t.muted, fontSize:12, fontFamily:FB, cursor:"pointer" }}>{status}</button>
          ))}
        </div>
        <button onClick={()=>setCheckin(true)} style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${t.success},${t.teal})`, color:"#fff", fontSize:14, fontWeight:700, fontFamily:FB, cursor:"pointer" }}>
          {checkin?"✓ Checked In — Family Notified":"Send Check-In to Family"}
        </button>
        {checkin && <div style={{ marginTop:10, fontSize:12, color:t.success, fontFamily:FB, fontStyle:"italic", textAlign:"center" }}>Your family has been notified ✓</div>}
      </Card>

      <SectionTitle t={t}>Family Members</SectionTitle>
      {FAMILY_MEMBERS.map(m=>(
        <Card key={m.id} t={t}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.secondary})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, fontWeight:700, fontFamily:FH }}>{m.avatar}</div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:t.text, fontFamily:FH }}>{m.name}</div>
                <div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>{m.relation}</div>
                <div style={{ fontSize:11, color:m.status==="active"?t.success:t.muted, fontFamily:FB, marginTop:2 }}>
                  {m.status==="active"?`📍 ${m.location} · ${m.lastSeen}`:`🏠 At home · ${m.lastSeen}`}
                </div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              {m.trip && <div style={{ fontSize:11, color:t.accent, fontFamily:FB, fontWeight:600 }}>{m.trip}</div>}
              {m.checkins>0 && <div style={{ fontSize:11, color:t.muted, fontFamily:FB }}>{m.checkins} check-ins</div>}
            </div>
          </div>
          {m.status==="active" && <div style={{ marginTop:12, padding:"8px 12px", background:t.success+"10", borderRadius:8, fontSize:12, color:t.success, fontFamily:FB, borderLeft:`3px solid ${t.success}` }}>Live trip updates being shared ✓</div>}
        </Card>
      ))}

      <Card t={t}>
        <div style={{ fontSize:13, fontWeight:700, color:t.text, fontFamily:FH, marginBottom:4 }}>+ Invite Family Member</div>
        <div style={{ fontSize:12, color:t.muted, fontFamily:FB, fontStyle:"italic", marginBottom:12 }}>They'll receive a link to view your trips passively</div>
        <Btn outline t={t} full>Send Invite Link</Btn>
      </Card>
    </div>
  );
}

// ─── BUDGET TRACKER — Phase 2 Feature 9 ──────────────────────────────────────
function BudgetScreen({ t }) {
  const [expenses, setExpenses] = useState([
    { id:1, desc:"Hotel check-in", amount:2400, category:"Stay", paidBy:"You", split:["You","Rahul","Priya"] },
    { id:2, desc:"Lunch at Sharma Dhaba", amount:540, category:"Food", paidBy:"Rahul", split:["You","Rahul","Priya"] },
    { id:3, desc:"Taxi to viewpoint", amount:600, category:"Transport", paidBy:"Priya", split:["You","Rahul","Priya"] },
  ]);
  const [adding, setAdding] = useState(false);
  const [newExp, setNewExp] = useState({ desc:"", amount:"", category:"Food", paidBy:"You" });
  const categories = ["Food","Stay","Transport","Activities","Shopping","Other"];
  const total = expenses.reduce((s,e)=>s+e.amount,0);
  const perPerson = Math.round(total/3);
  const addExpense = () => {
    if (!newExp.desc||!newExp.amount) return;
    setExpenses(e=>[...e,{ id:Date.now(), desc:newExp.desc, amount:parseInt(newExp.amount), category:newExp.category, paidBy:newExp.paidBy, split:["You","Rahul","Priya"] }]);
    setNewExp({desc:"",amount:"",category:"Food",paidBy:"You"});
    setAdding(false);
  };

  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ background:`linear-gradient(135deg,${t.accent}12,${t.secondary}08)`, borderRadius:12, padding:"13px 16px", marginBottom:20, border:`1px solid ${t.accent}15` }}>
        <div style={{ fontSize:14, color:t.accent, fontWeight:700, fontFamily:FH }}>💰 Budget Tracker</div>
        <div style={{ fontSize:12, color:t.muted, fontFamily:FB, fontStyle:"italic", marginTop:2 }}>Split expenses. Zero awkwardness.</div>
      </div>

      <Card t={t} style={{ background:`linear-gradient(135deg,${t.accent}10,${t.secondary}08)`, border:`1px solid ${t.accent}20` }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" }}>
          {[{label:"Total Spent",val:`₹${total.toLocaleString()}`,color:t.text},{label:"Per Person",val:`₹${perPerson.toLocaleString()}`,color:t.accent},{label:"Expenses",val:expenses.length,color:t.secondary}].map(s=>(
            <div key={s.label}><div style={{ fontSize:20, fontWeight:700, color:s.color, fontFamily:FH }}>{s.val}</div><div style={{ fontSize:10, color:t.muted, fontFamily:FD, textTransform:"uppercase", letterSpacing:1.5 }}>{s.label}</div></div>
          ))}
        </div>
      </Card>

      <SectionTitle t={t}>Expenses</SectionTitle>
      {expenses.map(e=>(
        <div key={e.id} style={{ background:t.card, borderRadius:12, padding:"12px 14px", marginBottom:10, border:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:t.text, fontFamily:FH }}>{e.desc}</div>
            <div style={{ fontSize:11, color:t.muted, fontFamily:FB, marginTop:2 }}>{e.category} · Paid by {e.paidBy} · Split {e.split.length} ways</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:15, fontWeight:700, color:t.accent, fontFamily:FH }}>₹{e.amount}</div>
            <div style={{ fontSize:11, color:t.muted, fontFamily:FB }}>₹{Math.round(e.amount/e.split.length)}/person</div>
          </div>
        </div>
      ))}

      {adding ? (
        <Card t={t}>
          <InputF label="Description" value={newExp.desc} onChange={e=>setNewExp(n=>({...n,desc:e.target.value}))} placeholder="What was this for?" t={t} />
          <InputF label="Amount (₹)" value={newExp.amount} onChange={e=>setNewExp(n=>({...n,amount:e.target.value}))} type="number" placeholder="0" t={t} />
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:9, fontWeight:700, color:t.muted, letterSpacing:2.5, textTransform:"uppercase", fontFamily:FD, marginBottom:7 }}>Category</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {categories.map(c=><button key={c} onClick={()=>setNewExp(n=>({...n,category:c}))} style={{ padding:"5px 12px", borderRadius:5, border:`1.5px solid ${newExp.category===c?t.accent:t.border}`, background:newExp.category===c?t.accent+"12":t.tag, color:newExp.category===c?t.accent:t.muted, fontSize:12, fontWeight:newExp.category===c?700:400, cursor:"pointer", fontFamily:FB }}>{c}</button>)}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={addExpense} t={t} full>Add Expense</Btn>
            <Btn onClick={()=>setAdding(false)} outline t={t}>Cancel</Btn>
          </div>
        </Card>
      ) : (
        <button onClick={()=>setAdding(true)} style={{ width:"100%", padding:"12px", borderRadius:10, border:`1.5px dashed ${t.border}`, background:"transparent", color:t.muted, fontSize:13, fontFamily:FB, cursor:"pointer", marginBottom:16 }}>+ Add Expense</button>
      )}

      <SectionTitle t={t}>Settle Up</SectionTitle>
      <Card t={t}>
        {[{from:"Rahul",to:"You",amount:150},{from:"Priya",to:"Rahul",amount:80}].map((s,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${t.border}` }}>
            <span style={{ fontSize:13, color:t.text, fontFamily:FB }}><strong>{s.from}</strong> owes <strong>{s.to}</strong></span>
            <span style={{ fontSize:14, fontWeight:700, color:t.success, fontFamily:FH }}>₹{s.amount}</span>
          </div>
        ))}
        <div style={{ marginTop:14 }}><Btn full outline color={t.success} t={t}>Export Summary PDF</Btn></div>
      </Card>
    </div>
  );
}

// ─── OFFLINE MAPS — Phase 2 Feature 7 ────────────────────────────────────────
function OfflineMapsScreen({ t }) {
  const [downloaded, setDownloaded] = useState({"Spiti Valley":true});
  const [downloading, setDownloading] = useState({});
  const maps = [
    { name:"Spiti Valley", size:"48 MB", trails:23, note:"High altitude — download recommended", warning:true },
    { name:"Ladakh Circuit", size:"62 MB", trails:31, note:"No connectivity in many areas", warning:true },
    { name:"Andaman Islands", size:"28 MB", trails:12, note:"Remote beach areas", warning:false },
    { name:"Manali Region", size:"34 MB", trails:18, note:"Rohtang Pass area", warning:false },
  ];
  const startDownload = (name) => {
    setDownloading(d=>({...d,[name]:true}));
    setTimeout(()=>{ setDownloaded(d=>({...d,[name]:true})); setDownloading(d=>({...d,[name]:false})); },2500);
  };
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ background:`linear-gradient(135deg,${t.teal}12,${t.accent}08)`, borderRadius:12, padding:"13px 16px", marginBottom:20, border:`1px solid ${t.teal}20` }}>
        <div style={{ fontSize:14, color:t.teal, fontWeight:700, fontFamily:FH }}>🗺 Offline Maps</div>
        <div style={{ fontSize:12, color:t.muted, fontFamily:FB, fontStyle:"italic", marginTop:2 }}>Navigate without internet. Essential for remote India.</div>
      </div>
      {maps.map((m,idx)=>(
        <Card key={m.name} t={t}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:t.text, fontFamily:FH }}>{m.name}</div>
              <div style={{ fontSize:12, color:t.muted, fontFamily:FB, marginTop:2 }}>{m.size} · {m.trails} trails mapped</div>
              {m.warning && <div style={{ fontSize:11, color:t.warning, fontFamily:FB, marginTop:4, fontStyle:"italic" }}>⚠ {m.note}</div>}
            </div>
            {downloaded[m.name] ? (
              <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:600, color:t.success, fontFamily:FB }}>✓ Downloaded</span>
            ) : downloading[m.name] ? (
              <span style={{ fontSize:12, color:t.accent, fontFamily:FB, fontStyle:"italic" }}>Downloading...</span>
            ) : (
              <button onClick={()=>startDownload(m.name)} style={{ padding:"7px 14px", borderRadius:6, border:`1.5px solid ${t.accent}`, background:t.accent+"12", color:t.accent, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FB }}>Download</button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── PROFILE + SETTINGS ───────────────────────────────────────────────────────
function ProfileScreen({ t, lang, setLang }) {
  const [myFoods, setMyFoods] = useState(["jain","pure_veg"]);
  const stats = [{label:"Trips",value:"12"},{label:"Countries",value:"3"},{label:"Pods",value:"7"},{label:"Reviews",value:"34"}];
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <Card t={t} style={{ overflow:"hidden", padding:0 }}>
        <div style={{ height:78, background:`linear-gradient(135deg,${t.accent},${t.secondary})` }} />
        <div style={{ padding:"0 16px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:12, marginTop:-28 }}>
            <div style={{ width:66, height:66, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.secondary})`, border:`3px solid ${t.card}`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:20, fontWeight:700, fontFamily:FH }}>AK</div>
            <Btn outline t={t} small>Edit Profile</Btn>
          </div>
          <div style={{ fontSize:20, fontWeight:700, color:t.text, fontFamily:FH }}>Aakash Kumar</div>
          <div style={{ fontSize:12, color:t.muted, fontFamily:FB, marginBottom:12, fontStyle:"italic" }}>@aakash.travels</div>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:16 }}>
            <TrustBadge score={88} t={t} />
            <span style={{ fontSize:11, fontWeight:600, color:t.success, background:t.success+"12", border:`1px solid ${t.success}25`, borderRadius:4, padding:"2px 9px", fontFamily:FB }}>✓ Aadhaar Verified</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {stats.map(s=><div key={s.label} style={{ textAlign:"center", padding:"10px 0", background:t.bg, borderRadius:8 }}><div style={{ fontSize:20, fontWeight:700, color:t.accent, fontFamily:FH }}>{s.value}</div><div style={{ fontSize:9, color:t.muted, fontFamily:FD, textTransform:"uppercase", letterSpacing:1.5 }}>{s.label}</div></div>)}
          </div>
        </div>
      </Card>

      <Card t={t}>
        <div style={{ fontSize:14, fontWeight:700, color:t.text, marginBottom:12, fontFamily:FH }}>🌿 My Food Preferences</div>
        <MultiSelectFood selected={myFoods} onChange={setMyFoods} t={t} hint="Auto-applied in PureFind and Trip Builder" />
      </Card>

      <Card t={t}>
        <div style={{ fontSize:14, fontWeight:700, color:t.text, marginBottom:14, fontFamily:FH }}>✦ TrustScore Breakdown</div>
        {[{label:"Identity Verified",score:30,max:30,color:t.success},{label:"Reviews from Trips",score:27,max:30,color:t.accent},{label:"Response Rate",score:18,max:20,color:t.secondary},{label:"Community Standing",score:13,max:20,color:t.warning}].map(item=>(
          <div key={item.label} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:13, color:t.text, fontFamily:FB }}>{item.label}</span>
              <span style={{ fontSize:11, color:t.muted, fontFamily:FB }}>{item.score}/{item.max}</span>
            </div>
            <div style={{ height:5, background:t.border, borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${(item.score/item.max)*100}%`, background:item.color, borderRadius:3 }} />
            </div>
          </div>
        ))}
        <div style={{ marginTop:12, padding:"9px 13px", background:t.success+"10", borderRadius:8, border:`1px solid ${t.success}18` }}>
          <div style={{ fontSize:12, color:t.success, fontWeight:700, fontFamily:FB }}>✓ Solo Women Safe badge earned</div>
        </div>
      </Card>

      {/* Language Selector — Phase 2 Feature 12 */}
      <Card t={t}>
        <div style={{ fontSize:14, fontWeight:700, color:t.text, marginBottom:12, fontFamily:FH }}>🌐 Language</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
          {LANGUAGES.map(l=><button key={l} onClick={()=>setLang(l)} style={{ padding:"6px 14px", borderRadius:6, border:`1.5px solid ${lang===l?t.accent:t.border}`, background:lang===l?t.accent+"12":t.tag, color:lang===l?t.accent:t.muted, fontSize:13, fontWeight:lang===l?700:400, cursor:"pointer", fontFamily:FB }}>{l}</button>)}
        </div>
      </Card>

      <Card t={t}>
        <div style={{ fontSize:14, fontWeight:700, color:t.text, marginBottom:12, fontFamily:FH }}>🌍 Coming Soon — Global</div>
        {["Multi-currency & Stripe payments","Nepal, Sri Lanka, Thailand, Dubai","Kosher & Buddhist Veg expanded","Offline maps v2 — Southeast Asia","Arabic, Swahili, Thai localisation"].map(item=>(
          <div key={item} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${t.border}` }}>
            <span style={{ fontSize:13, color:t.muted, fontFamily:FB, fontStyle:"italic" }}>{item}</span>
            <button style={{ padding:"4px 12px", borderRadius:5, border:`1px solid ${t.border}`, background:"transparent", color:t.muted, fontSize:11, cursor:"pointer", fontFamily:FB, flexShrink:0, marginLeft:8 }}>Notify Me</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("explore");
  const [lang, setLang] = useState("English");
  const t = dark ? DARK : LIGHT;

  const tabs = [
    { id:"explore",  icon:"◈", label:"Explore" },
    { id:"plan",     icon:"◎", label:"Plan" },
    { id:"purefind", icon:"✿", label:"PureFind" },
    { id:"pods",     icon:"◉", label:"Pods" },
    { id:"more",     icon:"⊞", label:"More" },
  ];

  const MORE_TABS = [
    { id:"guides",  icon:"🧭", label:"Guides",        desc:"Book verified local guides" },
    { id:"family",  icon:"👨‍👩‍👧", label:"Family Circle", desc:"Share your journey with family" },
    { id:"budget",  icon:"💰", label:"Budget Tracker", desc:"Split expenses with your group" },
    { id:"maps",    icon:"🗺",  label:"Offline Maps",   desc:"Navigate without internet" },
    { id:"profile", icon:"◍",  label:"Profile",        desc:"Your account and preferences" },
  ];

  const titles = { explore:"Explore", plan:"Plan Trip", purefind:"PureFind", pods:"TripPods", more:"More", guides:"Local Guides", family:"Family Circle", budget:"Budget Tracker", maps:"Offline Maps", profile:"Profile" };

  return (
    <div style={{ minHeight:"100vh", background:t.bg, transition:"background 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { display:none; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:t.bg+"EE", backdropFilter:"blur(14px)", borderBottom:`1px solid ${t.border}`, padding:"12px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", maxWidth:430, margin:"0 auto" }}>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:t.accent, fontFamily:FD, letterSpacing:1 }}>TRIPOVA</div>
            <div style={{ fontSize:9, color:t.muted, fontFamily:FD, letterSpacing:3, textTransform:"uppercase" }}>{titles[tab]}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, color:t.muted, fontFamily:FB, fontStyle:"italic" }}>{lang}</span>
            <button onClick={()=>setDark(d=>!d)} style={{ width:44, height:25, borderRadius:13, border:"none", background:dark?t.accent:t.border, cursor:"pointer", position:"relative", transition:"background 0.3s" }}>
              <div style={{ width:19, height:19, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:dark?22:3, transition:"left 0.3s", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>{dark?"🌙":"☀️"}</div>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:430, margin:"0 auto", paddingTop:20 }}>
        {tab==="explore"  && <ExploreScreen t={t} />}
        {tab==="plan"     && <PlanScreen t={t} />}
        {tab==="purefind" && <PureFindScreen t={t} />}
        {tab==="pods"     && <PodsScreen t={t} />}
        {tab==="guides"   && <GuidesScreen t={t} />}
        {tab==="family"   && <FamilyScreen t={t} />}
        {tab==="budget"   && <BudgetScreen t={t} />}
        {tab==="maps"     && <OfflineMapsScreen t={t} />}
        {tab==="profile"  && <ProfileScreen t={t} lang={lang} setLang={setLang} />}

        {tab==="more" && (
          <div style={{ padding:"0 16px 110px" }}>
            <div style={{ fontSize:13, color:t.muted, fontFamily:FB, fontStyle:"italic", marginBottom:20 }}>Phase 2 features — all live and ready to use.</div>
            {MORE_TABS.map((item,idx)=>(
              <div key={item.id} onClick={()=>setTab(item.id)} style={{ background:t.card, borderRadius:14, padding:"16px 18px", marginBottom:10, border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", animation:`fadeUp 0.3s ease ${idx*0.07}s both`, transition:"box-shadow 0.2s, transform 0.2s" }}
                onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 4px 20px ${t.accent}15`; e.currentTarget.style.transform="translateY(-1px)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:`linear-gradient(135deg,${t.accent}15,${t.secondary}10)`, border:`1px solid ${t.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:t.text, fontFamily:FH }}>{item.label}</div>
                    <div style={{ fontSize:12, color:t.muted, fontFamily:FB, fontStyle:"italic", marginTop:2 }}>{item.desc}</div>
                  </div>
                </div>
                <span style={{ color:t.muted, fontSize:16 }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50, background:t.card+"F2", backdropFilter:"blur(18px)", borderTop:`1px solid ${t.border}` }}>
        <div style={{ display:"flex", maxWidth:430, margin:"0 auto", padding:"8px 0 14px" }}>
          {tabs.map(tb=>(
            <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"transparent", border:"none", cursor:"pointer", padding:"4px 0", transition:"transform 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.12)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              <div style={{ fontSize:17, color:tab===tb.id?t.accent:t.muted, transition:"color 0.2s" }}>{tb.icon}</div>
              <div style={{ fontSize:9, color:tab===tb.id?t.accent:t.muted, fontWeight:tab===tb.id?700:400, fontFamily:FD, letterSpacing:0.5, transition:"color 0.2s" }}>{tb.label}</div>
              {tab===tb.id && <div style={{ width:4, height:4, borderRadius:"50%", background:t.accent }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
