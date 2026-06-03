// TRIPOVA — core screens: Explore, Plan, PureFind, Pods. Babel-loaded.
const { useState, useEffect } = React;

// ─── EXPLORE ─────────────────────────────────────────────────────────────────
function ExploreScreen({ t }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [helpful, setHelpful] = useState({});
  useEffect(()=>{ const id=setTimeout(()=>{ setPosts(FEED_POSTS); setLoading(false); },1100); return ()=>clearTimeout(id); },[]);
  const filtered = posts.filter(p => search===""||p.location.toLowerCase().includes(search.toLowerCase())||p.content.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ position:"relative", marginBottom:20 }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", display:"flex" }}><Icon name="Search" size={17} color={t.muted} /></span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={T("Search any destination...")}
          style={{ width:"100%", padding:"12px 16px 12px 42px", borderRadius:10, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box" }} />
      </div>

      <SectionTitle t={t}>{T("Live Destinations")}</SectionTitle>
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

      <Fleuron t={t} />

      <SectionTitle t={t}>{T("Live Updates")}</SectionTitle>
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
              <Icon name="ThumbsUp" size={13} color={helpful[post.id]?t.accent:t.muted} /> {post.helpful+(helpful[post.id]?1:0)} {T("Helpful")}
            </button>
            <button style={{ background:"transparent", border:"none", color:t.muted, fontSize:12, cursor:"pointer", fontFamily:FB }}>{T("Reply")}</button>
          </div>
        </div>
      ))}
      
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
    const foodRecs = { jain:["Jain Bhavan","Purity Kitchen","Shree Ram Jain Bhojanalay"], pure_veg:["Satvik Dhaba","Shuddh Shakahari","Pure Veg Corner"], vegan:["Green Bowl Café","The Vegan Table","Plant Plate"], halal:["Al-Raheem Kitchen","Bismillah Foods","Halal Corner"], gluten:["GF Kitchen","Pure Plate","Clean Bowl"], sattvic:["Satvik Ashram Kitchen","Divine Foods","Pure Soul Café"], everything:["Local Dhaba","Mountain Café","Traveller's Table"] };
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
  const [expanded, setExpanded] = useState(null);
  const toggleF = (id) => setFilters(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id]);
  const filtered = RESTAURANTS.filter(r=>{
    const ms = search===""||r.name.toLowerCase().includes(search.toLowerCase())||r.location.toLowerCase().includes(search.toLowerCase());
    const mf = filters.length===0||filters.every(f=>r.types.includes(f));
    return ms && mf;
  });

  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:24, color:t.heading, fontFamily:FH, lineHeight:1.1 }}>Find food you can<br/>actually eat.</div>
        <PoweredBy t={t} style={{ marginTop:8 }} />
      </div>

      <div style={{ position:"relative", marginBottom:14 }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", display:"flex" }}><Icon name="Search" size={17} color={t.muted} /></span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={T("Search restaurant or city...")}
          style={{ width:"100%", padding:"12px 16px 12px 42px", borderRadius:12, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box" }} />
      </div>

      <div style={{ background:t.card, borderRadius:14, padding:"13px 16px", marginBottom:18, border:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:t.accent+"14", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="Camera" size={19} color={t.accent} /></div>
          <div>
            <div style={{ fontSize:15, color:t.heading, fontFamily:FH }}>AI Menu Scanner</div>
            <div style={{ fontSize:11.5, color:t.muted, fontFamily:FB }}>Photograph any menu — AI highlights safe items</div>
          </div>
        </div>
        <button onClick={()=>{ setScanning(true); setTimeout(()=>setScanning(false),2500); }}
          style={{ padding:"9px 16px", borderRadius:8, border:"none", background:t.accent, color:"#fff", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:FB, flexShrink:0 }}>
          {scanning?"Scanning…":"Scan"}
        </button>
      </div>
      {scanning && <div style={{ background:t.accent+"10", borderRadius:12, padding:"12px 16px", marginBottom:14, border:`1px solid ${t.accent}20`, fontFamily:FB, fontSize:13, color:t.accent, display:"flex", alignItems:"center", gap:8 }}><Icon name="Loader" size={15} color={t.accent} /> Identifying Jain & Vegan items, allergens, and translations…</div>}

      <SectionTitle t={t}>Dietary Filters · Select Multiple</SectionTitle>
      <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
        {ALL_FOOD_TYPES.filter(f=>f.id!=="everything").map(f=>{ const active=filters.includes(f.id); return <button key={f.id} onClick={()=>toggleF(f.id)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:8, border:`1.5px solid ${active?f.color:t.border}`, background:active?f.color+"15":t.tag, color:active?f.color:t.muted, fontSize:12, fontWeight:active?700:500, cursor:"pointer", fontFamily:FB, transition:"all 0.18s" }}>{f.emoji} {f.label} {active&&<Icon name="Check" size={12} color={f.color} />}</button>; })}
      </div>
      {filters.length>1 && <div style={{ padding:"10px 13px", background:t.tag, borderRadius:10, fontSize:12.5, color:t.text, fontFamily:FB, marginBottom:12, display:"flex", alignItems:"center", gap:7 }}><Icon name="Users" size={14} color={t.secondary} /> Showing places that support <strong style={{ color:t.accent }}>{filters.map(id=>getFI(id).label).join(" + ")}</strong> — ideal for mixed groups</div>}
      {filters.length>0 && <button onClick={()=>setFilters([])} style={{ fontSize:12, color:t.muted, background:"transparent", border:"none", cursor:"pointer", fontFamily:FB, marginBottom:10 }}>✕ Clear filters</button>}

      <div style={{ fontSize:12, color:t.muted, fontFamily:FB, marginBottom:14 }}>{filtered.length} community-verified places</div>

      {filtered.length===0 && <div style={{ textAlign:"center", padding:"40px 24px" }}>
        <div style={{ width:60, height:60, borderRadius:18, background:t.tag, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}><Icon name="Salad" size={28} color={t.secondary} /></div>
        <div style={{ fontSize:18, color:t.heading, fontFamily:FH, marginBottom:6 }}>The best food discoveries usually begin with curiosity.</div>
        <div style={{ fontSize:13.5, color:t.muted, fontFamily:FB }}>Try removing a filter or searching a different city.</div>
      </div>}

      {filtered.map((r,idx)=>(
        <div key={r.id} style={{ background:t.card, borderRadius:16, overflow:"hidden", marginBottom:14, border:`1px solid ${t.border}`, boxShadow:"0 1px 3px rgba(13,19,32,0.04)", animation:`fadeUp 0.4s ease ${idx*0.06}s both` }}>
          <div style={{ height:90, background:r.gradient, position:"relative" }}>
            <div style={{ position:"absolute", bottom:10, left:12, display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(r.verifiedBy).slice(0,2).map(([fid,c])=>(
                <span key={fid} style={{ display:"inline-flex", alignItems:"center", gap:4, background:"rgba(255,255,255,0.94)", borderRadius:7, padding:"4px 9px", fontSize:11, fontWeight:700, color:getFI(fid).color, fontFamily:FB }}><Icon name="BadgeCheck" size={12} color={getFI(fid).color} /> {getFI(fid).label} · {c}</span>
              ))}
            </div>
          </div>
          <div style={{ padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div><div style={{ fontSize:16, color:t.heading, fontFamily:FH }}>{r.name}</div><div style={{ fontSize:12, color:t.muted, fontFamily:FB, display:"flex", alignItems:"center", gap:4 }}><Icon name="MapPin" size={11} color={t.muted} /> {r.location} · {r.distance}</div></div>
              <div style={{ textAlign:"right" }}><div style={{ fontSize:14, fontWeight:700, color:t.warning, fontFamily:FB, display:"flex", alignItems:"center", gap:3, justifyContent:"flex-end" }}><Icon name="Star" size={12} color={t.warning} /> {r.rating}</div><div style={{ fontSize:11, color:t.muted, fontFamily:FB }}>{r.reviews} reviews</div></div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>{r.tags.map(tag=><span key={tag} style={{ fontSize:11, color:t.muted, background:t.tag, padding:"3px 10px", borderRadius:6, fontFamily:FB }}>{tag}</span>)}</div>
            {/* Natural premium enhancement — value first, no paywall */}
            {expanded===r.id ? (
              <div style={{ background:t.gold+"10", border:`1px solid ${t.gold}35`, borderRadius:12, padding:13, animation:"fadeUp 0.3s ease both" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}><Icon name="Sparkles" size={15} color={t.gold} /><span style={{ fontSize:13, fontWeight:700, color:t.gold, fontFamily:FB }}>Premium enhancements for this menu</span></div>
                {["Ingredient analysis — flags hidden onion, garlic & dairy","Allergy warnings tailored to your profile","One-tap menu translation to English"].map(x=>(
                  <div key={x} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:t.text, fontFamily:FB, marginBottom:6 }}><Icon name="Check" size={13} color={t.gold} /> {x}</div>
                ))}
                <button style={{ marginTop:6, width:"100%", padding:"10px", borderRadius:9, border:"none", background:`linear-gradient(135deg,${t.gold},${t.goldFill})`, color:"#fff", fontSize:13, fontWeight:700, fontFamily:FB, cursor:"pointer" }}>Try Premium free for 7 days</button>
              </div>
            ) : (
              <button onClick={()=>setExpanded(r.id)} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"10px 13px", borderRadius:10, border:`1px dashed ${t.gold}55`, background:t.gold+"0A", color:t.text, fontSize:12.5, fontFamily:FB, cursor:"pointer", textAlign:"left" }}>
                <Icon name="Sparkles" size={15} color={t.gold} /> <span>Want ingredient analysis & menu translation?</span> <Icon name="ChevronRight" size={15} color={t.muted} style={{ marginLeft:"auto" }} />
              </button>
            )}
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
  const myInterests = ["Photography","Food Exploration","Hiking"];
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ display:"flex", background:t.tag, borderRadius:12, padding:3, marginBottom:20 }}>
        {["find","mine"].map(tb=><button key={tb} onClick={()=>setTab(tb)} style={{ flex:1, padding:"10px", borderRadius:9, border:"none", background:tab===tb?t.card:"transparent", color:tab===tb?t.accent:t.muted, fontWeight:tab===tb?700:500, cursor:"pointer", fontSize:13, fontFamily:FB, transition:"all 0.2s", boxShadow:tab===tb?"0 1px 3px rgba(13,19,32,0.08)":"none" }}>{tb==="find"?"Find a Pod":"My Pods"}</button>)}
      </div>
      {tab==="find" && PODS.map((pod,idx)=>(
        <div key={pod.id} style={{ background:t.card, borderRadius:18, overflow:"hidden", marginBottom:16, border:`1px solid ${t.border}`, boxShadow:"0 1px 3px rgba(13,19,32,0.04)", animation:`fadeUp 0.4s ease ${idx*0.08}s both` }}>
          <div style={{ height:90, background:pod.gradient, position:"relative" }}>
            <div style={{ position:"absolute", top:11, left:12, background:"rgba(0,0,0,0.42)", backdropFilter:"blur(4px)", borderRadius:7, padding:"4px 10px", fontSize:11, color:"#fff", fontFamily:FB, fontWeight:600 }}>{pod.style}</div>
            <div style={{ position:"absolute", top:11, right:12 }}><CompatBadge pct={pod.compatibility} t={t} /></div>
            <div style={{ position:"absolute", bottom:11, left:12, color:"#fff" }}>
              <div style={{ fontSize:19, fontFamily:FH }}>{pod.destination}</div>
              <div style={{ fontSize:11.5, fontFamily:FB, opacity:0.9 }}>{pod.dates} · {pod.duration}</div>
            </div>
          </div>
          <div style={{ padding:15 }}>
            {/* Host intro — human first */}
            <div style={{ display:"flex", gap:11, marginBottom:12 }}>
              <Avatar initials={pod.hostAvatar} size={42} t={t} />
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                  <span style={{ fontSize:14, color:t.heading, fontFamily:FH }}>{pod.host}</span>
                  {pod.verified && <Icon name="BadgeCheck" size={14} color={t.secondary} />}
                  <TrustBadge score={pod.score} t={t} />
                </div>
                <div style={{ fontSize:11.5, color:t.muted, fontFamily:FB, marginTop:1, display:"flex", alignItems:"center", gap:5 }}>
                  <Icon name="Star" size={11} color={t.warning} /> {pod.podRating} pod rating · {pod.pastPods} trips hosted
                </div>
              </div>
            </div>
            <p style={{ fontSize:13.5, color:t.text, lineHeight:1.55, margin:"0 0 11px", fontFamily:FB }}>“{pod.intro}”</p>
            <button style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"7px 13px", borderRadius:20, border:`1px solid ${t.border}`, background:t.tag, color:t.text, fontSize:12, fontWeight:600, fontFamily:FB, cursor:"pointer", marginBottom:13 }}><Icon name="Play" size={12} color={t.accent} /> {pod.voice}</button>

            {/* Shared interests */}
            <div style={{ marginBottom:13 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:t.muted, fontFamily:FD, textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Shared Interests</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{pod.interests.map(i=><InterestChip key={i} label={i} t={t} shared={myInterests.includes(i)} />)}</div>
            </div>

            {/* Group eats */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:t.muted, fontFamily:FD, textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Group Eats</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{pod.groupFoods.map(id=><FoodBadge key={id} id={id} small t={t} />)}</div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:13, borderTop:`1px solid ${t.border}` }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:t.accent, fontFamily:FH }}>{pod.budget}<span style={{ fontSize:11, color:t.muted, fontWeight:400 }}>/person</span></div>
                <div style={{ fontSize:11.5, color:pod.spots<=1?t.danger:t.success, fontFamily:FB, fontWeight:700 }}>{pod.spots} of {pod.size} spots left</div>
              </div>
              <button onClick={()=>setJoined(j=>({...j,[pod.id]:!j[pod.id]}))} style={{ padding:"10px 20px", borderRadius:9, border:"none", background:joined[pod.id]?t.success:`linear-gradient(135deg,${t.accent},${t.secondary})`, color:"#fff", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:FB, transition:"all 0.2s", display:"flex", alignItems:"center", gap:6 }}>{joined[pod.id]?<><Icon name="Check" size={15} color="#fff" /> Requested</>:"Request to Join"}</button>
            </div>
          </div>
        </div>
      ))}
      {tab==="mine" && <div style={{ textAlign:"center", padding:"60px 28px" }}>
        <div style={{ width:64, height:64, borderRadius:20, background:t.tag, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}><Icon name="Users" size={30} color={t.secondary} /></div>
        <div style={{ fontSize:20, color:t.heading, fontFamily:FH, marginBottom:8, lineHeight:1.25 }}>Every great trip starts with one traveller saying hello.</div>
        <div style={{ fontSize:14, color:t.muted, fontFamily:FB, marginBottom:24, lineHeight:1.5 }}>Join a pod above, or create your own and let companions come to you.</div>
        <Btn onClick={()=>setTab("find")} t={t}>Browse Pods</Btn>
      </div>}
    </div>
  );
}

Object.assign(window, { ExploreScreen, PlanScreen, PureFindScreen, PodsScreen });
