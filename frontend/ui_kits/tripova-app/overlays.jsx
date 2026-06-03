// TRIPOVA — overlays: Create sheet (functional), Notifications, Emergency SOS.
// Globals: Icon, Btn, Avatar, FoodBadge, CURRENT_USER, NOTIFICATIONS...
const { useState: useStateO, useRef: useRefO } = React;

// Generic bottom sheet shell
function Sheet({ open, onClose, t, children, height="auto", title }) {
  return (
    <div style={{ position:"fixed", top:0, bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, zIndex:300, pointerEvents:open?"auto":"none" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(13,19,32,0.55)", opacity:open?1:0, transition:"opacity 0.28s" }} />
      <div style={{ position:"absolute", left:0, right:0, bottom:0, background:t.bg, borderRadius:"22px 22px 0 0", borderTop:`1px solid ${t.border}`, boxShadow:"0 -8px 40px rgba(13,19,32,0.3)", transform:open?"translateY(0)":"translateY(110%)", transition:"transform 0.34s cubic-bezier(0.4,0,0.2,1)", maxHeight:"90%", overflowY:"auto", paddingBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 4px" }}><div style={{ width:38, height:4, borderRadius:2, background:t.border }} /></div>
        {title && <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 18px 12px" }}>
          <span style={{ fontSize:20, fontFamily:FH, color:t.heading }}>{title}</span>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:"50%", border:"none", background:t.tag, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="X" size={17} color={t.muted} /></button>
        </div>}
        {children}
      </div>
    </div>
  );
}

// ── CREATE — works for real, stores locally ─────────────────────────────────
function CreateSheet({ open, onClose, t, onCreatePost, onCreatePod }) {
  const [mode, setMode] = useStateO(null); // null | post | photos | trip | pod
  const [text, setText] = useStateO("");
  const [place, setPlace] = useStateO("");
  const [cat, setCat] = useStateO("Food");
  const [photos, setPhotos] = useStateO([]);
  const [podDest, setPodDest] = useStateO("");
  const [podDates, setPodDates] = useStateO("");
  const [podBudget, setPodBudget] = useStateO("");
  const [done, setDone] = useStateO(false);
  const fileRef = useRefO();

  const reset = () => { setMode(null); setText(""); setPlace(""); setCat("Food"); setPhotos([]); setPodDest(""); setPodDates(""); setPodBudget(""); setDone(false); };
  const close = () => { reset(); onClose(); };

  const onFiles = (e) => {
    const files = [...(e.target.files||[])].slice(0,4);
    Promise.all(files.map(f=>new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); }))).then(urls=>setPhotos(p=>[...p,...urls].slice(0,4)));
  };

  const submitPost = () => {
    if (!text.trim()) return;
    onCreatePost({ id:Date.now(), user:CURRENT_USER.name, avatar:CURRENT_USER.avatar, score:CURRENT_USER.trust, location:place||"Somewhere", category:cat, time:"just now", expiry:"6 days", content:text, helpful:0, comments:0, verified:true, photos, mine:true });
    setDone(true); setTimeout(close, 1300);
  };
  const submitPod = () => {
    if (!podDest.trim()) return;
    onCreatePod({ id:Date.now(), destination:podDest, dates:podDates||"Flexible", duration:"—", budget:podBudget?("₹"+podBudget):"₹—", spots:4, size:5, host:CURRENT_USER.name, hostAvatar:CURRENT_USER.avatar, score:CURRENT_USER.trust, podRating:5.0, pastPods:7, style:"New", verified:true, compatibility:100, intro:text||"Just created this pod — say hi and let's plan together!", voice:"Add a voice intro", interests:["Photography","Food Exploration"], groupFoods:CURRENT_USER.foods, gradient:"linear-gradient(150deg,#1B263B,#5E7C99)", mine:true });
    setDone(true); setTimeout(close, 1300);
  };

  const Opt = ({ icon, label, desc, on }) => (
    <button onClick={on} style={{ display:"flex", alignItems:"center", gap:13, width:"100%", padding:"15px 16px", borderRadius:14, border:`1px solid ${t.border}`, background:t.card, cursor:"pointer", textAlign:"left", marginBottom:11 }}>
      <div style={{ width:44, height:44, borderRadius:12, background:t.accent+"14", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={icon} size={21} color={t.accent} /></div>
      <div style={{ flex:1 }}><div style={{ fontSize:15.5, fontWeight:700, color:t.text, fontFamily:FB }}>{label}</div><div style={{ fontSize:12.5, color:t.muted, fontFamily:FB }}>{desc}</div></div>
      <Icon name="ChevronRight" size={18} color={t.muted} />
    </button>
  );
  const Field = ({ label, children }) => <div style={{ marginBottom:14 }}><div style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD, marginBottom:7 }}>{label}</div>{children}</div>;
  const inputStyle = { width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${t.border}`, background:t.tag, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box" };

  const titles = { post:"Create Post", photos:"Upload Photos", trip:"Start a Trip", pod:"Create TripPod" };
  return (
    <Sheet open={open} onClose={close} t={t} title={done?null:(mode?titles[mode]:"Create")}>
      <div style={{ padding:"0 18px" }}>
        {done ? (
          <div style={{ textAlign:"center", padding:"30px 10px 20px" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:t.success+"18", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}><Icon name="Check" size={32} color={t.success} /></div>
            <div style={{ fontSize:20, fontFamily:FH, color:t.heading, marginBottom:6 }}>Shared with the community</div>
            <div style={{ fontSize:13.5, color:t.muted, fontFamily:FB }}>Your contribution is now live on Tripova.</div>
          </div>
        ) : !mode ? (
          <>
            <Opt icon="PenLine" label="Create Post" desc="Share a tip, update or discovery" on={()=>setMode("post")} />
            <Opt icon="ImagePlus" label="Upload Photos" desc="Add photos from your travels" on={()=>setMode("photos")} />
            <Opt icon="Map" label="Start a Trip" desc="Log a new journey on your profile" on={()=>setMode("trip")} />
            <Opt icon="Users" label="Create TripPod" desc="Find companions for your next trip" on={()=>setMode("pod")} />
          </>
        ) : mode==="post" || mode==="photos" ? (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <Avatar initials={CURRENT_USER.avatar} size={40} t={t} />
              <div style={{ fontSize:15, fontWeight:700, color:t.text, fontFamily:FB }}>{CURRENT_USER.name}</div>
            </div>
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Share something useful for fellow travellers…" rows={4} style={{ ...inputStyle, resize:"none", marginBottom:14, lineHeight:1.5 }} />
            <input type="file" accept="image/*" multiple ref={fileRef} onChange={onFiles} style={{ display:"none" }} />
            {photos.length>0 && <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
              {photos.map((p,i)=><div key={i} style={{ position:"relative" }}><img src={p} alt="" style={{ width:72, height:72, borderRadius:10, objectFit:"cover" }} /><button onClick={()=>setPhotos(ph=>ph.filter((_,x)=>x!==i))} style={{ position:"absolute", top:-6, right:-6, width:20, height:20, borderRadius:"50%", border:"none", background:t.danger, color:"#fff", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button></div>)}
            </div>}
            <button onClick={()=>fileRef.current&&fileRef.current.click()} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"11px", borderRadius:10, border:`1px dashed ${t.border}`, background:"transparent", color:t.muted, fontSize:13, fontFamily:FB, cursor:"pointer", marginBottom:14, justifyContent:"center" }}><Icon name="ImagePlus" size={16} color={t.secondary} /> {photos.length?"Add more photos":"Add photos"}</button>
            <Field label="Location"><input value={place} onChange={e=>setPlace(e.target.value)} placeholder="e.g. Kaza, Spiti" style={inputStyle} /></Field>
            <Field label="Category"><div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>{Object.keys(CAT_COLORS).map(c=><button key={c} onClick={()=>setCat(c)} style={{ padding:"6px 13px", borderRadius:8, border:`1.5px solid ${cat===c?CAT_COLORS[c]:t.border}`, background:cat===c?CAT_COLORS[c]+"15":t.tag, color:cat===c?CAT_COLORS[c]:t.muted, fontSize:12.5, fontWeight:cat===c?700:500, cursor:"pointer", fontFamily:FB }}>{c}</button>)}</div></Field>
            <Btn onClick={submitPost} full t={t} disabled={!text.trim()}>Share with community</Btn>
          </>
        ) : mode==="trip" ? (
          <>
            <Field label="Destination"><input value={podDest} onChange={e=>setPodDest(e.target.value)} placeholder="Where are you going?" style={inputStyle} /></Field>
            <Field label="Dates"><input value={podDates} onChange={e=>setPodDates(e.target.value)} placeholder="e.g. 12–18 July" style={inputStyle} /></Field>
            <Field label="A note (optional)"><textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="What's the plan?" style={{ ...inputStyle, resize:"none", lineHeight:1.5 }} /></Field>
            <Btn onClick={submitPod} full t={t} disabled={!podDest.trim()}>Start trip & open a pod</Btn>
          </>
        ) : (
          <>
            <Field label="Destination"><input value={podDest} onChange={e=>setPodDest(e.target.value)} placeholder="e.g. Spiti Valley" style={inputStyle} /></Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Dates"><input value={podDates} onChange={e=>setPodDates(e.target.value)} placeholder="Oct 10–17" style={inputStyle} /></Field>
              <Field label="Budget ₹"><input value={podBudget} onChange={e=>setPodBudget(e.target.value)} type="number" placeholder="12000" style={inputStyle} /></Field>
            </div>
            <Field label="Intro to companions"><textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Tell potential companions about the trip and who you're looking for…" style={{ ...inputStyle, resize:"none", lineHeight:1.5 }} /></Field>
            <Btn onClick={submitPod} full t={t} disabled={!podDest.trim()}>Create TripPod</Btn>
          </>
        )}
      </div>
    </Sheet>
  );
}

// ── NOTIFICATIONS panel ─────────────────────────────────────────────────────
function NotificationsSheet({ open, onClose, t }) {
  return (
    <Sheet open={open} onClose={onClose} t={t} title="Notifications">
      <div style={{ padding:"0 14px" }}>
        {NOTIFICATIONS.map(n=>(
          <div key={n.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 8px", borderBottom:`1px solid ${t.border}`, background:n.unread?t.accent+"08":"transparent", borderRadius:10 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:t[n.color]+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={n.icon} size={18} color={t[n.color]} /></div>
            <div style={{ flex:1, fontSize:13.5, color:t.text, fontFamily:FB, lineHeight:1.4 }}>{n.text}</div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
              <span style={{ fontSize:11, color:t.muted, fontFamily:FB }}>{n.time}</span>
              {n.unread && <span style={{ width:8, height:8, borderRadius:"50%", background:t.secondary }} />}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

// ── EMERGENCY SOS ───────────────────────────────────────────────────────────
function EmergencySheet({ open, onClose, t }) {
  const [sharing, setSharing] = useStateO(false);
  const items = [
    { icon:"Hospital", label:"Nearby Hospitals", sub:"Apollo, 1.2 km · 3 more within 5 km" },
    { icon:"Phone", label:"Emergency Numbers", sub:"Police 100 · Ambulance 102 · Tourist 1363" },
    { icon:"Landmark", label:"Embassy Information", sub:"Your registered embassy & consulate" },
  ];
  return (
    <Sheet open={open} onClose={onClose} t={t} title="Emergency">
      <div style={{ padding:"0 18px" }}>
        <button onClick={()=>setSharing(true)} style={{ width:"100%", padding:"18px", borderRadius:16, border:"none", background:`linear-gradient(135deg,${t.danger},#7E2A22)`, color:"#fff", fontSize:18, fontWeight:800, fontFamily:FB, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:14, boxShadow:`0 6px 20px ${t.danger}55` }}>
          <Icon name="Siren" size={24} color="#fff" /> Emergency SOS
        </button>
        <button onClick={()=>setSharing(s=>!s)} style={{ width:"100%", padding:"13px", borderRadius:12, border:`1.5px solid ${sharing?t.success:t.border}`, background:sharing?t.success+"15":t.card, color:sharing?t.success:t.text, fontSize:14, fontWeight:700, fontFamily:FB, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:18 }}>
          <Icon name="MapPin" size={17} color={sharing?t.success:t.secondary} /> {sharing?"Live location sharing ON":"One-Tap Location Sharing"}
        </button>
        {items.map(i=>(
          <div key={i.label} style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 14px", borderRadius:14, border:`1px solid ${t.border}`, background:t.card, marginBottom:10 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:t.danger+"12", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={i.icon} size={19} color={t.danger} /></div>
            <div style={{ flex:1 }}><div style={{ fontSize:14.5, fontWeight:700, color:t.text, fontFamily:FB }}>{i.label}</div><div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>{i.sub}</div></div>
            <Icon name="ChevronRight" size={17} color={t.muted} />
          </div>
        ))}
      </div>
    </Sheet>
  );
}

Object.assign(window, { Sheet, CreateSheet, NotificationsSheet, EmergencySheet });
