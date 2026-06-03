// TRIPOVA — App shell: masthead, frosted nav, destination routing, theme + language.
const { useState: useStateA } = React;

const SCREEN_TITLES = {
  home:"Home", discover:"Discover", purefind:"PureFind", pods:"TripPods", profile:"Profile",
  plan:"Trip Builder", guides:"Local Guides", family:"Family Circle", budget:"Budget Tracker", maps:"Offline Maps",
  dest:"Destination",
};
// Pages that overlay the main tabs (show a back button)
const SUBPAGES = ["plan","guides","family","budget","maps"];

// ── Left navigation drawer ───────────────────────────────────────────────────
function SideDrawer({ open, onClose, t, active, goTab, goSub, openDest, dark, setDark }) {
  const primary = [
    { id:"home", icon:"House", label:"Home" },
    { id:"discover", icon:"Compass", label:"Discover" },
    { id:"purefind", icon:"Salad", label:"PureFind" },
    { id:"pods", icon:"Users", label:"TripPods" },
    { id:"profile", icon:"User", label:"Profile" },
  ];
  const manage = [
    { id:"plan", icon:"Sparkles", label:"AI Trip Builder" },
    { id:"guides", icon:"Map", label:"Local Guides" },
    { id:"family", icon:"Users", label:"Family Circle" },
    { id:"budget", icon:"Wallet", label:"Budget Tracker" },
    { id:"maps", icon:"MapPinned", label:"Offline Maps" },
  ];
  const saved = DESTINATIONS.filter(d=>d.save||d.follow).concat(DESTINATIONS).slice(0,3);
  const Row = ({ icon, label, on, sel }) => (
    <button onClick={on} style={{ display:"flex", alignItems:"center", gap:13, width:"100%", padding:"11px 12px", borderRadius:11, border:"none", background:sel?t.accent+"14":"transparent", color:sel?t.accent:t.text, cursor:"pointer", fontFamily:FB, fontSize:14.5, fontWeight:sel?700:500, textAlign:"left", transition:"background 0.15s" }}>
      <Icon name={icon} size={19} color={sel?t.accent:t.muted} stroke={sel?2.3:2} /> {label}
    </button>
  );
  const Eyebrow = ({ children }) => <div style={{ fontSize:10, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD, padding:"4px 12px", marginTop:6 }}>{children}</div>;
  return (
    <div style={{ position:"fixed", top:0, bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, zIndex:200, pointerEvents:open?"auto":"none" }}>
      {/* scrim */}
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(13,19,32,0.5)", backdropFilter:open?"blur(2px)":"none", opacity:open?1:0, transition:"opacity 0.28s" }} />
      {/* panel */}
      <div style={{ position:"absolute", top:0, left:0, bottom:0, width:300, maxWidth:"82%", background:t.bg, borderRight:`1px solid ${t.border}`, boxShadow:"8px 0 40px rgba(13,19,32,0.28)", transform:open?"translateX(0)":"translateX(-104%)", transition:"transform 0.32s cubic-bezier(0.4,0,0.2,1)", display:"flex", flexDirection:"column", overflowY:"auto" }}>
        {/* Profile summary */}
        <div style={{ padding:"22px 18px 18px", background:`linear-gradient(135deg,${t.accent},${t.secondary})`, position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute", top:14, right:14, width:32, height:32, borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.18)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="X" size={17} color="#fff" /></button>
          <div style={{ width:54, height:54, borderRadius:"50%", background:"rgba(255,255,255,0.92)", display:"flex", alignItems:"center", justifyContent:"center", color:t.accent, fontSize:19, fontWeight:800, fontFamily:FB, marginBottom:11 }}>AK</div>
          <div style={{ fontSize:20, color:"#fff", fontFamily:FH }}>Aakash Kumar</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.82)", fontFamily:FB, marginBottom:11 }}>@aakash.travels</div>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"rgba(255,255,255,0.92)", borderRadius:6, padding:"3px 9px", fontSize:11, fontWeight:800, color:t.accent, fontFamily:FB }}><Icon name="ShieldCheck" size={12} color={t.success} /> TrustScore 88</span>
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"rgba(255,255,255,0.2)", borderRadius:6, padding:"3px 9px", fontSize:11, fontWeight:700, color:"#fff", fontFamily:FB }}><Icon name="BadgeCheck" size={12} color="#fff" /> Aadhaar</span>
          </div>
        </div>

        <div style={{ padding:"10px 8px 6px", flex:1 }}>
          {primary.map(p=><Row key={p.id} icon={p.icon} label={p.label} sel={active===p.id} on={()=>{ goTab(p.id); onClose(); }} />)}
          <div style={{ height:1, background:t.border, margin:"8px 12px" }} />
          <Eyebrow>Travel Management</Eyebrow>
          {manage.map(m=><Row key={m.id} icon={m.icon} label={m.label} sel={active===m.id} on={()=>{ goSub(m.id); onClose(); }} />)}
          <div style={{ height:1, background:t.border, margin:"8px 12px" }} />
          <Eyebrow>Saved Destinations</Eyebrow>
          {saved.map((d,i)=>(
            <button key={d.id+"-"+i} onClick={()=>{ openDest(d.id); onClose(); }} style={{ display:"flex", alignItems:"center", gap:11, width:"100%", padding:"9px 12px", borderRadius:11, border:"none", background:"transparent", cursor:"pointer", textAlign:"left" }}>
              <div style={{ width:34, height:34, borderRadius:9, background:d.gradient, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, color:t.text, fontFamily:FB, fontWeight:600 }}>{d.name}</div>
                <div style={{ fontSize:11, color:t.muted, fontFamily:FB }}>{d.country}</div>
              </div>
              <Icon name="ChevronRight" size={16} color={t.muted} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 16px 18px", borderTop:`1px solid ${t.border}` }}>
          <button onClick={()=>setDark(v=>!v)} style={{ display:"flex", alignItems:"center", gap:11, width:"100%", padding:"11px 12px", borderRadius:11, border:"none", background:"transparent", color:t.text, cursor:"pointer", fontFamily:FB, fontSize:14, fontWeight:500 }}>
            <Icon name={dark?"Sun":"Moon"} size={18} color={t.muted} /> {dark?"Light mode":"Dark mode"}
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:11, width:"100%", padding:"11px 12px", borderRadius:11, border:"none", background:"transparent", color:t.text, cursor:"pointer", fontFamily:FB, fontSize:14, fontWeight:500 }}>
            <Icon name="Settings" size={18} color={t.muted} /> Settings &amp; Privacy
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:11, width:"100%", padding:"11px 12px", borderRadius:11, border:"none", background:"transparent", color:t.text, cursor:"pointer", fontFamily:FB, fontSize:14, fontWeight:500 }}>
            <Icon name="LifeBuoy" size={18} color={t.muted} /> Help &amp; Support
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [dark, setDark] = useStateA(false);
  const [tab, setTab] = useStateA("home");
  const [sub, setSub] = useStateA(null);     // plan/guides/family/budget/maps
  const [dest, setDest] = useStateA(null);    // destination hub id
  const [lang, setLang] = useStateA("English");
  const [langOpen, setLangOpen] = useStateA(false);
  const [drawerOpen, setDrawerOpen] = useStateA(false);
  const t = dark ? DARK : LIGHT;
  window.__TR = TRANSLATIONS[lang] || {};
  const LANG_CODE = { "English":"EN", "हिंदी":"हिं", "தமிழ்":"த", "বাংলা":"বাং", "मराठी":"मरा", "العربية":"ع" };

  const active = dest ? "dest" : (sub || tab);
  const isOverlay = !!dest || SUBPAGES.includes(active);

  const openDest = (id) => { setDest(id); window.scrollTo(0,0); };
  const back = () => { if (dest) setDest(null); else setSub(null); window.scrollTo(0,0); };
  const goTab = (id) => { setTab(id); setSub(null); setDest(null); window.scrollTo(0,0); };

  const navItems = [
    { id:"home", icon:"House", label:"Home" },
    { id:"discover", icon:"Compass", label:"Discover" },
    { id:"purefind", icon:"Salad", label:"PureFind" },
    { id:"pods", icon:"Users", label:"Pods" },
    { id:"profile", icon:"User", label:"Profile" },
  ];

  const renderScreen = () => {
    if (dest) return <DestinationHub t={t} destId={dest} openDest={openDest} openPods={()=>{setDest(null);goTab("pods");}} openPureFind={()=>{setDest(null);goTab("purefind");}} />;
    switch(active) {
      case "home": return <HomeScreen t={t} openDest={openDest} />;
      case "discover": return <DiscoverScreen t={t} openDest={openDest} />;
      case "purefind": return <PureFindScreen t={t} />;
      case "pods": return <PodsScreen t={t} />;
      case "profile": return <ProfileScreen t={t} lang={lang} setLang={setLang} go={(id)=>{ setSub(id); window.scrollTo(0,0); }} />;
      case "plan": return <PlanScreen t={t} />;
      case "guides": return <GuidesScreen t={t} />;
      case "family": return <FamilyScreen t={t} />;
      case "budget": return <BudgetScreen t={t} />;
      case "maps": return <OfflineMapsScreen t={t} />;
      default: return null;
    }
  };

  return (
    <div style={{ maxWidth:430, margin:"0 auto", minHeight:"100vh", background:t.bg, position:"relative", transition:"background 0.3s", boxShadow:"0 0 60px rgba(0,0,0,0.10)" }}>
      <SideDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} t={t} active={active} dark={dark} setDark={setDark}
        goTab={goTab} goSub={(id)=>{ setSub(id); setDest(null); window.scrollTo(0,0); }} openDest={openDest} />

      {/* Masthead header */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:t.bg+"F2", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", borderBottom:`1px solid ${t.border}`, padding:"14px 16px 12px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {isOverlay
              ? <button onClick={back} style={{ background:"transparent", border:"none", color:t.accent, cursor:"pointer", padding:0, display:"flex" }}><Icon name="ChevronLeft" size={22} color={t.accent} /></button>
              : <button onClick={()=>setDrawerOpen(true)} aria-label="Menu" style={{ background:"transparent", border:"none", color:t.text, cursor:"pointer", padding:0, display:"flex" }}><Icon name="Menu" size={22} color={t.text} /></button>}
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:t.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="Compass" size={17} color={t.goldFill} /></div>
              <div>
                <div style={{ fontSize:19, fontWeight:800, color:t.accent, fontFamily:FD, letterSpacing:2.5 }}>TRIPOVA</div>
                <div style={{ fontSize:9.5, color:t.gold, fontFamily:FB, fontWeight:700, letterSpacing:0.6, marginTop:-1, display:"flex", alignItems:"center", gap:4 }}><Icon name="Users" size={10} color={t.gold} /> POWERED BY TRAVELLERS</div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ position:"relative" }}>
              <button onClick={()=>setLangOpen(o=>!o)} style={{ display:"flex", alignItems:"center", gap:5, height:34, padding:"0 11px", borderRadius:17, border:`1px solid ${t.border}`, background:t.card, color:t.text, cursor:"pointer", fontFamily:FB, fontSize:12, fontWeight:600 }}>
                <Icon name="Globe" size={15} color={t.secondary} />
                {LANG_CODE[lang] || "EN"}
                <Icon name="ChevronDown" size={13} color={t.muted} />
              </button>
              {langOpen && <>
                <div onClick={()=>setLangOpen(false)} style={{ position:"fixed", inset:0, zIndex:90 }} />
                <div style={{ position:"absolute", top:42, right:0, background:t.card, border:`1px solid ${t.border}`, borderRadius:12, boxShadow:"0 8px 28px rgba(13,19,32,0.20)", padding:6, zIndex:100, width:150 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD, padding:"6px 10px 4px" }}>{T("Language")}</div>
                  {LANGUAGES.map(l=>(
                    <button key={l} onClick={()=>{ setLang(l); setLangOpen(false); }} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", padding:"8px 10px", borderRadius:8, border:"none", background:lang===l?t.tag:"transparent", color:lang===l?t.accent:t.text, cursor:"pointer", fontFamily:FB, fontSize:13.5, fontWeight:lang===l?700:500 }}>
                      {l} {lang===l && <Icon name="Check" size={14} color={t.accent} />}
                    </button>
                  ))}
                </div>
              </>}
            </div>
            <button onClick={()=>setDark(d=>!d)} style={{ width:34, height:34, borderRadius:"50%", border:`1px solid ${t.border}`, background:t.card, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}><Icon name={dark?"Sun":"Moon"} size={16} color={t.text} /></button>
          </div>
        </div>
        {/* current-screen eyebrow (hidden on destination hub — it has its own hero) */}
        {active!=="dest" && <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
          <span style={{ fontSize:10, color:t.muted, fontFamily:FD, letterSpacing:2, textTransform:"uppercase", fontWeight:700, whiteSpace:"nowrap" }}>{T(SCREEN_TITLES[active])}</span>
          <span style={{ flex:1, height:1, background:t.border }} />
        </div>}
      </div>

      {/* Screen */}
      <div style={{ paddingTop:active==="dest"?0:18, minHeight:"calc(100vh - 140px)" }}>{renderScreen()}</div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:t.card+"F2", backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", borderTop:`1px solid ${t.border}`, padding:"8px 0 12px", display:"flex", justifyContent:"space-around", zIndex:60 }}>
        {navItems.map(item=>{
          const isActive = tab===item.id && !sub && !dest;
          return (
            <button key={item.id} onClick={()=>goTab(item.id)} style={{ background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"4px 10px", transition:"all 0.18s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              <Icon name={item.icon} size={21} color={isActive?t.accent:t.muted} stroke={isActive?2.4:2} />
              <span style={{ fontSize:10, color:isActive?t.accent:t.muted, fontFamily:FB, fontWeight:isActive?700:500, letterSpacing:0.2 }}>{T(item.label)}</span>
              <span style={{ width:5, height:5, borderRadius:"50%", background:isActive?t.goldFill:"transparent", transition:"background 0.2s" }} />
            </button>
          );
        })}
      </div>

      {/* Floating action button — Home & Pods only */}
      {(active==="home" || active==="pods") && (
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, height:0, pointerEvents:"none", zIndex:65 }}>
          <button aria-label="Create" style={{ position:"absolute", right:18, bottom:84, width:54, height:54, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.secondary})`, border:"none", cursor:"pointer", boxShadow:`0 6px 18px ${t.accent}55`, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"auto", transition:"transform 0.18s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.06)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            <Icon name="Plus" size={24} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
