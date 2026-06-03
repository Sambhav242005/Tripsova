// TRIPOVA — Phase 2 screens: Guides, Family, Budget, OfflineMaps, Profile.
const { useState: useStateP } = React;

// ─── GUIDES ──────────────────────────────────────────────────────────────────
function GuidesScreen({ t }) {
  const [booked, setBooked] = useStateP({});
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ background:`linear-gradient(135deg,${t.gold}12,${t.accent}08)`, borderRadius:12, padding:"13px 16px", marginBottom:20, border:`1px solid ${t.gold}20` }}>
        <div style={{ fontSize:14, color:t.gold, fontWeight:700, fontFamily:FH }}>🧭 Local Guide Marketplace</div>
        <div style={{ fontSize:12, color:t.muted, fontFamily:FB, fontStyle:"italic", marginTop:2 }}>Verified guides. Real experiences. Fair prices.</div>
      </div>
      {GUIDES.map((g,idx)=>(
        <div key={g.id} style={{ background:t.card, borderRadius:16, overflow:"hidden", marginBottom:14, border:`1px solid ${t.border}`, animation:`fadeUp 0.4s ease ${idx*0.08}s both` }}>
          <div style={{ height:70, background:g.gradient, position:"relative" }}>
            {g.verified && <div style={{ position:"absolute", top:10, right:10 }}><Hallmark label="Verified Guide" t={t} light /></div>}
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

// ─── FAMILY CIRCLE ───────────────────────────────────────────────────────────
function FamilyScreen({ t }) {
  const [checkin, setCheckin] = useStateP(false);
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

// ─── BUDGET TRACKER ──────────────────────────────────────────────────────────
function BudgetScreen({ t }) {
  const [expenses, setExpenses] = useStateP([
    { id:1, desc:"Hotel check-in", amount:2400, category:"Stay", paidBy:"You", split:["You","Rahul","Priya"] },
    { id:2, desc:"Lunch at Sharma Dhaba", amount:540, category:"Food", paidBy:"Rahul", split:["You","Rahul","Priya"] },
    { id:3, desc:"Taxi to viewpoint", amount:600, category:"Transport", paidBy:"Priya", split:["You","Rahul","Priya"] },
  ]);
  const [adding, setAdding] = useStateP(false);
  const [newExp, setNewExp] = useStateP({ desc:"", amount:"", category:"Food", paidBy:"You" });
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

// ─── OFFLINE MAPS ────────────────────────────────────────────────────────────
function OfflineMapsScreen({ t }) {
  const [downloaded, setDownloaded] = useStateP({"Spiti Valley":true});
  const [downloading, setDownloading] = useStateP({});
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
      {maps.map((m)=>(
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

// ─── PROFILE + SETTINGS ──────────────────────────────────────────────────────
function ProfileScreen({ t, lang, setLang, go }) {
  const [myFoods, setMyFoods] = useStateP(["jain","pure_veg"]);
  const stats = [{label:"Trips",value:"12"},{label:"Countries",value:"3"},{label:"Pods",value:"7"},{label:"Reviews",value:"34"}];
  const manage = [
    { id:"plan", icon:"Sparkles", label:"AI Trip Builder" },
    { id:"guides", icon:"Map", label:"Local Guides" },
    { id:"family", icon:"Users", label:"Family Circle" },
    { id:"budget", icon:"Wallet", label:"Budget Tracker" },
    { id:"maps", icon:"MapPinned", label:"Offline Maps" },
  ];
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
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:t.success, background:t.success+"12", border:`1px solid ${t.success}25`, borderRadius:6, padding:"3px 9px", fontFamily:FB }}><Icon name="BadgeCheck" size={12} color={t.success} /> Aadhaar Verified</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {stats.map(s=><div key={s.label} style={{ textAlign:"center", padding:"10px 0", background:t.bg, borderRadius:8 }}><div style={{ fontSize:20, fontWeight:700, color:t.accent, fontFamily:FH }}>{s.value}</div><div style={{ fontSize:9, color:t.muted, fontFamily:FD, textTransform:"uppercase", letterSpacing:1.5 }}>{s.label}</div></div>)}
          </div>
        </div>
      </Card>

      <div style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD, margin:"4px 2px 12px" }}>Travel Management</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {manage.map(m=>(
          <button key={m.id} onClick={()=>go&&go(m.id)} style={{ background:t.card, borderRadius:14, border:`1px solid ${t.border}`, padding:"14px 13px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", boxShadow:"0 1px 3px rgba(13,19,32,0.04)", textAlign:"left" }}>
            <div style={{ width:38, height:38, borderRadius:11, background:t.tag, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={m.icon} size={18} color={t.accent} /></div>
            <span style={{ fontSize:13, fontWeight:600, color:t.text, fontFamily:FB }}>{m.label}</span>
          </button>
        ))}
      </div>

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

Object.assign(window, { GuidesScreen, FamilyScreen, BudgetScreen, OfflineMapsScreen, ProfileScreen });
