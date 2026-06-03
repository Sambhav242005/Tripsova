// TRIPOVA — Explore, TripPod (tabs), Ask Travellers, AI Assistant, Referrals, Premium.
// Globals: Icon, Card, Btn, Avatar, DestTile, SectionTitle, TrustBadge, CompatBadge,
// AuthorLine, VerifyMarks, PremiumBadge, VisionTag, CommBadge, FoodBadge, PoweredBy...
const { useState: useStateF, useEffect: useEffectF, useRef: useRefF } = React;

// ════ EXPLORE ════════════════════════════════════════════════════════════════
function ExploreScreen({ t, openDest, openPureFind, full }) {
  const [q, setQ] = useStateF("");
  const matches = DESTINATIONS.filter(d=>q===""||d.name.toLowerCase().includes(q.toLowerCase())||d.country.toLowerCase().includes(q.toLowerCase()));
  const tools = [
    { id:"purefind", icon:"Salad", label:"PureFind", desc:"Verified eats", on:openPureFind, mvp:true },
    { id:"guides", icon:"Map", label:"Local Guides", desc:"Trusted experts", on:()=>openPureFind("guides"), mvp:true },
    { id:"hotels", icon:"BedDouble", label:"Hotels", desc:"Traveller-rated", on:()=>{}, mvp:false },
    { id:"experiences", icon:"Compass", label:"Experiences", desc:"Things to do", on:()=>{}, mvp:false },
  ];
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ position:"relative", marginBottom:18 }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", display:"flex" }}><Icon name="Search" size={17} color={t.muted} /></span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={T("Search destinations, food, guides…")}
          style={{ width:"100%", padding:"13px 16px 13px 42px", borderRadius:12, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box" }} />
      </div>

      {/* Tools */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11, marginBottom:24 }}>
        {tools.filter(x=>full||x.mvp).map(tool=>(
          <button key={tool.id} onClick={tool.on} style={{ display:"flex", alignItems:"center", gap:11, padding:"14px 13px", borderRadius:14, border:`1px solid ${t.border}`, background:t.card, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 3px rgba(13,19,32,0.04)", position:"relative" }}>
            <div style={{ width:40, height:40, borderRadius:11, background:t.accent+"12", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={tool.icon} size={20} color={t.accent} /></div>
            <div style={{ flex:1 }}><div style={{ fontSize:14.5, fontWeight:700, color:t.text, fontFamily:FB }}>{T(tool.label)}</div><div style={{ fontSize:11.5, color:t.muted, fontFamily:FB }}>{tool.desc}</div></div>
            {!tool.mvp && <span style={{ position:"absolute", top:8, right:8 }}><VisionTag t={t} /></span>}
          </button>
        ))}
      </div>

      <SectionTitle t={t}>{q?`${matches.length} ${T("destinations")}`:T("Trending Destinations")}</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
        {matches.map(d=>(
          <div key={d.id} onClick={()=>openDest(d.id)} style={{ borderRadius:16, background:d.gradient, height:150, position:"relative", cursor:"pointer", overflow:"hidden", boxShadow:"0 2px 10px rgba(13,19,32,0.10)" }}>
            <div style={{ position:"absolute", top:9, right:9, background:"rgba(255,255,255,0.92)", borderRadius:6, padding:"2px 7px", fontSize:10.5, fontWeight:800, color:"#1B263B", fontFamily:FB, display:"flex", alignItems:"center", gap:3 }}><Icon name="ShieldCheck" size={10} color="#3E7D5A" /> {d.trust}</div>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"20px 12px 11px", background:"linear-gradient(transparent,rgba(0,0,0,0.78))" }}>
              <div style={{ color:"#fff", fontSize:17, fontFamily:FH }}>{d.name}</div>
              <div style={{ color:"rgba(255,255,255,0.8)", fontSize:10.5, fontFamily:FB, marginTop:1 }}>{d.country} · {d.updates} updates</div>
            </div>
          </div>
        ))}
      </div>

      {!q && full && <>
        <SectionTitle t={t}>Hotels Travellers Love</SectionTitle>
        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8, marginBottom:24, scrollbarWidth:"none" }}>
          {HOTELS.map(h=>(
            <div key={h.id} onClick={()=>openDest(h.destId)} style={{ flexShrink:0, width:200, background:t.card, borderRadius:14, border:`1px solid ${t.border}`, overflow:"hidden", cursor:"pointer", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ height:96, background:h.gradient }} />
              <div style={{ padding:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ fontSize:14.5, fontFamily:FH, color:t.heading }}>{h.name}</div>
                  <div style={{ fontSize:12.5, fontWeight:700, color:t.warning, fontFamily:FB, display:"flex", alignItems:"center", gap:2, flexShrink:0 }}><Icon name="Star" size={11} color={t.warning} /> {h.rating}</div>
                </div>
                <div style={{ fontSize:11.5, color:t.muted, fontFamily:FB, marginBottom:8 }}>{h.location}</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>{h.traits.map(tr=><CommBadge key={tr} label={tr} t={t} />)}</div>
                <div style={{ fontSize:14, fontWeight:700, color:t.accent, fontFamily:FH }}>{h.price}<span style={{ fontSize:11, color:t.muted, fontWeight:400 }}>/night</span></div>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle t={t}>Experiences</SectionTitle>
        <div style={{ marginBottom:24 }}>
          {EXPERIENCES.map(e=>(
            <div key={e.id} onClick={()=>openDest(e.destId)} style={{ display:"flex", gap:12, background:t.card, borderRadius:14, border:`1px solid ${t.border}`, padding:12, marginBottom:10, cursor:"pointer", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ width:60, height:60, borderRadius:12, background:e.gradient, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14.5, fontFamily:FH, color:t.heading }}>{e.name}</div>
                <div style={{ fontSize:12, color:t.muted, fontFamily:FB, marginBottom:5 }}>{e.duration} · hosted by {e.host}</div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13.5, fontWeight:700, color:t.accent, fontFamily:FH }}>{e.price}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:t.warning, fontFamily:FB, display:"flex", alignItems:"center", gap:2 }}><Icon name="Star" size={11} color={t.warning} /> {e.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>}

      {!q && <>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:13 }}>
          <span style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD }}>{full?"Traveller Collections":"Top Local Guides"}</span>
          <PoweredBy t={t} />
        </div>
        {full ? (
          <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8, scrollbarWidth:"none" }}>
            {COLLECTIONS.map(c=>(
              <div key={c.id} style={{ flexShrink:0, width:160, cursor:"pointer" }}>
                <div style={{ height:108, borderRadius:14, background:c.gradient, position:"relative", overflow:"hidden", boxShadow:"0 2px 10px rgba(13,19,32,0.10)" }}>
                  <div style={{ position:"absolute", bottom:8, left:10, display:"flex", alignItems:"center", gap:4, color:"#fff", fontSize:11, fontFamily:FB, fontWeight:600 }}><Icon name="Images" size={12} color="#fff" /> {c.count}</div>
                </div>
                <div style={{ fontSize:14.5, fontFamily:FH, color:t.heading, marginTop:8 }}>{c.title}</div>
                <div style={{ fontSize:11.5, color:t.muted, fontFamily:FB }}>by {c.by}</div>
              </div>
            ))}
          </div>
        ) : (
          GUIDES.slice(0,3).map(g=>(
            <div key={g.id} onClick={()=>openDest(g.destId)} style={{ background:t.card, borderRadius:14, border:`1px solid ${t.border}`, padding:12, marginBottom:10, display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ width:46, height:46, borderRadius:12, background:g.gradient, flexShrink:0 }} />
              <div style={{ flex:1 }}><div style={{ fontSize:15, fontFamily:FH, color:t.heading }}>{g.name}</div><div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>{g.location} · {g.speciality}</div></div>
              <TrustBadge score={g.score} t={t} />
            </div>
          ))
        )}
      </>}
    </div>
  );
}

// ════ TRIPPOD (tabbed) ═══════════════════════════════════════════════════════
function TripPodScreen({ t, full, pods }) {
  const allPods = pods;
  const baseTabs = [{ id:"find", label:"Find", icon:"Compass" }, { id:"safety", label:"Safety", icon:"ShieldCheck" }];
  const fullTabs = [{ id:"find", label:"Find", icon:"Compass" }, { id:"requests", label:"Requests", icon:"UserPlus" }, { id:"chats", label:"Chats", icon:"MessageCircle" }, { id:"events", label:"Events", icon:"CalendarDays" }, { id:"safety", label:"Safety", icon:"ShieldCheck" }];
  const tabs = full ? fullTabs : baseTabs;
  const [tab, setTab] = useStateF("find");
  const [joined, setJoined] = useStateF({});
  const myInterests = CURRENT_USER ? ["Photography","Food Exploration","Hiking"] : [];

  return (
    <div style={{ padding:"0 0 110px" }}>
      {/* tab strip */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", padding:"0 16px 14px", scrollbarWidth:"none" }}>
        {tabs.map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:20, border:`1px solid ${tab===tb.id?t.accent:t.border}`, background:tab===tb.id?t.accent:t.card, color:tab===tb.id?"#fff":t.muted, fontSize:13, fontWeight:700, fontFamily:FB, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.18s" }}>
            <Icon name={tb.icon} size={15} color={tab===tb.id?"#fff":t.muted} /> {tb.label}
          </button>
        ))}
      </div>

      <div style={{ padding:"0 16px" }}>
        {tab==="find" && allPods.map((pod,idx)=>(
          <div key={pod.id} style={{ background:t.card, borderRadius:18, overflow:"hidden", marginBottom:16, border:`1px solid ${t.border}`, boxShadow:"0 1px 3px rgba(13,19,32,0.04)", animation:`fadeUp 0.4s ease ${idx*0.06}s both` }}>
            <div style={{ height:88, background:pod.gradient, position:"relative" }}>
              <div style={{ position:"absolute", top:11, left:12, background:"rgba(0,0,0,0.42)", backdropFilter:"blur(4px)", borderRadius:7, padding:"4px 10px", fontSize:11, color:"#fff", fontFamily:FB, fontWeight:600 }}>{pod.style}</div>
              <div style={{ position:"absolute", top:11, right:12 }}><CompatBadge pct={pod.compatibility} t={t} /></div>
              <div style={{ position:"absolute", bottom:11, left:12, color:"#fff" }}>
                <div style={{ fontSize:19, fontFamily:FH }}>{pod.destination}</div>
                <div style={{ fontSize:11.5, fontFamily:FB, opacity:0.9 }}>{pod.dates} · {pod.budget}/person</div>
              </div>
            </div>
            <div style={{ padding:15 }}>
              <div style={{ display:"flex", gap:11, marginBottom:12 }}>
                <Avatar initials={pod.hostAvatar} size={42} t={t} />
                <div style={{ flex:1 }}>
                  <AuthorLine name={pod.host} t={t} size={14} />
                  <div style={{ fontSize:11.5, color:t.muted, fontFamily:FB, marginTop:2, display:"flex", alignItems:"center", gap:5 }}><TrustBadge score={pod.score} t={t} /> · {pod.podRating}★ · {pod.pastPods} trips</div>
                </div>
              </div>
              <p style={{ fontSize:13.5, color:t.text, lineHeight:1.55, margin:"0 0 11px", fontFamily:FB }}>“{pod.intro}”</p>
              <div style={{ marginBottom:13 }}>
                <div style={{ fontSize:10.5, fontWeight:700, color:t.muted, fontFamily:FD, textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Shared Interests</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{pod.interests.map(i=><InterestChip key={i} label={i} t={t} shared={myInterests.includes(i)} />)}</div>
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10.5, fontWeight:700, color:t.muted, fontFamily:FD, textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Group Eats</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{pod.groupFoods.map(id=><FoodBadge key={id} id={id} small t={t} />)}</div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:13, borderTop:`1px solid ${t.border}` }}>
                <div style={{ fontSize:11.5, color:pod.spots<=1?t.danger:t.success, fontFamily:FB, fontWeight:700 }}>{pod.spots} of {pod.size} spots left</div>
                <button onClick={()=>setJoined(j=>({...j,[pod.id]:!j[pod.id]}))} style={{ padding:"10px 20px", borderRadius:9, border:"none", background:joined[pod.id]?t.success:`linear-gradient(135deg,${t.accent},${t.secondary})`, color:"#fff", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:FB, display:"flex", alignItems:"center", gap:6 }}>{joined[pod.id]?<><Icon name="Check" size={15} color="#fff" /> Requested</>:"Request to Join"}</button>
              </div>
            </div>
          </div>
        ))}

        {tab==="requests" && <>
          {full && <div style={{ display:"inline-flex", marginBottom:14 }}><VisionTag t={t} label="Premium: priority matching" /></div>}
          {MATCH_REQUESTS.map(r=>(
            <div key={r.id} style={{ background:t.card, borderRadius:14, border:`1px solid ${t.border}`, padding:14, marginBottom:11, boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:10 }}>
                <Avatar initials={r.avatar} size={42} t={t} />
                <div style={{ flex:1 }}>
                  <AuthorLine name={r.name} t={t} size={14.5} />
                  <div style={{ fontSize:12, color:t.muted, fontFamily:FB, marginTop:1 }}>{r.dir==="incoming"?`wants to join · ${r.pod}`:`${r.pod}`}</div>
                </div>
                <CompatBadge pct={r.compatibility} t={t} />
              </div>
              {r.dir==="incoming" ? (
                <div style={{ display:"flex", gap:9 }}>
                  <button style={{ flex:1, padding:"9px", borderRadius:9, border:"none", background:t.accent, color:"#fff", fontSize:13, fontWeight:700, fontFamily:FB, cursor:"pointer" }}>Accept</button>
                  <button style={{ flex:1, padding:"9px", borderRadius:9, border:`1.5px solid ${t.border}`, background:"transparent", color:t.muted, fontSize:13, fontWeight:700, fontFamily:FB, cursor:"pointer" }}>Decline</button>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, color:t.warning, fontFamily:FB, fontWeight:700 }}><Icon name="Clock" size={14} color={t.warning} /> {r.status}</div>
              )}
            </div>
          ))}
        </>}

        {tab==="chats" && GROUP_CHATS.map(c=>(
          <div key={c.id} style={{ display:"flex", gap:12, background:t.card, borderRadius:14, border:`1px solid ${t.border}`, padding:13, marginBottom:11, cursor:"pointer", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
            <div style={{ width:48, height:48, borderRadius:14, background:c.gradient, flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                <div style={{ fontSize:15, fontFamily:FH, color:t.heading }}>{c.name}</div>
                <span style={{ fontSize:11, color:t.muted, fontFamily:FB, flexShrink:0 }}>{c.time}</span>
              </div>
              <div style={{ fontSize:11.5, color:t.muted, fontFamily:FB, marginBottom:3 }}>{c.members} members</div>
              <div style={{ fontSize:13, color:t.text, fontFamily:FB, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.last}</div>
            </div>
            {c.unread>0 && <div style={{ alignSelf:"center", minWidth:20, height:20, borderRadius:10, background:t.accent, color:"#fff", fontSize:11, fontWeight:800, fontFamily:FB, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 6px" }}>{c.unread}</div>}
          </div>
        ))}

        {tab==="events" && EVENTS.map(e=>(
          <div key={e.id} style={{ background:t.card, borderRadius:16, border:`1px solid ${t.border}`, overflow:"hidden", marginBottom:12, boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
            <div style={{ height:80, background:e.gradient }} />
            <div style={{ padding:14 }}>
              <div style={{ fontSize:16, fontFamily:FH, color:t.heading }}>{e.title}</div>
              <div style={{ fontSize:12.5, color:t.muted, fontFamily:FB, margin:"3px 0 10px", display:"flex", alignItems:"center", gap:5 }}><Icon name="MapPin" size={12} color={t.muted} /> {e.place} · {e.date}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12.5, color:t.secondary, fontFamily:FB, fontWeight:700 }}>{e.going} going</span>
                <button style={{ padding:"8px 18px", borderRadius:9, border:"none", background:t.accent, color:"#fff", fontSize:13, fontWeight:700, fontFamily:FB, cursor:"pointer" }}>Join</button>
              </div>
            </div>
          </div>
        ))}

        {tab==="safety" && <div>
          <div style={{ background:`linear-gradient(135deg,${t.success}14,${t.teal}0A)`, border:`1px solid ${t.success}25`, borderRadius:16, padding:16, marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <Icon name="ShieldCheck" size={22} color={t.success} />
              <div style={{ fontSize:16, fontFamily:FH, color:t.heading }}>Safety Verification</div>
            </div>
            <p style={{ fontSize:13.5, color:t.text, fontFamily:FB, lineHeight:1.5, margin:0 }}>Every TripPod companion is verified before you travel. Pods with all-verified members carry the green shield.</p>
          </div>
          {[
            { icon:"BadgeCheck", label:"ID-verified companions only", sub:"Toggle to hide unverified members", on:true },
            { icon:"MapPin", label:"Share live location with pod", sub:"Active during the trip window", on:true },
            { icon:"Users", label:"Emergency contact added to pod", sub:"Notified if you trigger SOS", on:false },
            { icon:"Star", label:"Post-trip safety rating", sub:"Rate companions privately after each trip", on:true },
          ].map(s=>(
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px", borderRadius:14, border:`1px solid ${t.border}`, background:t.card, marginBottom:10 }}>
              <Icon name={s.icon} size={19} color={t.secondary} />
              <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, color:t.text, fontFamily:FB }}>{s.label}</div><div style={{ fontSize:11.5, color:t.muted, fontFamily:FB }}>{s.sub}</div></div>
              <div style={{ width:40, height:24, borderRadius:12, background:s.on?t.success:t.border, position:"relative", transition:"background 0.2s" }}><div style={{ position:"absolute", top:2, left:s.on?18:2, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} /></div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}

// ════ ASK TRAVELLERS ═════════════════════════════════════════════════════════
function AskScreen({ t }) {
  const [q, setQ] = useStateF("");
  const [open, setOpen] = useStateF(null);
  const [votes, setVotes] = useStateF({});
  const list = QUESTIONS.filter(x=>q===""||x.q.toLowerCase().includes(q.toLowerCase())||x.tags.some(tg=>tg.toLowerCase().includes(q.toLowerCase())));
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:24, color:t.heading, fontFamily:FH, lineHeight:1.1 }}>Ask Travellers</div>
        <PoweredBy t={t} style={{ marginTop:8 }} />
      </div>
      <div style={{ position:"relative", marginBottom:14 }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", display:"flex" }}><Icon name="Search" size={17} color={t.muted} /></span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search questions or ask your own…" style={{ width:"100%", padding:"12px 16px 12px 42px", borderRadius:12, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box" }} />
      </div>
      <button style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"12px", borderRadius:12, border:"none", background:t.accent, color:"#fff", fontSize:14, fontWeight:700, fontFamily:FB, cursor:"pointer", marginBottom:20 }}><Icon name="PenLine" size={16} color="#fff" /> Ask a question</button>

      {list.map(item=>{
        const up = votes[item.id]?1:0;
        return (
        <div key={item.id} style={{ background:t.card, borderRadius:16, border:`1px solid ${t.border}`, padding:15, marginBottom:12, boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:9 }}>{item.tags.map(tg=><span key={tg} style={{ fontSize:11, fontWeight:600, color:t.secondary, background:t.secondary+"14", padding:"2px 9px", borderRadius:6, fontFamily:FB }}>{tg}</span>)}</div>
          <div style={{ fontSize:17, fontFamily:FH, color:t.heading, lineHeight:1.25, marginBottom:8 }}>{item.q}</div>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
            <Avatar initials={item.avatar} size={22} t={t} />
            <span style={{ fontSize:12, color:t.muted, fontFamily:FB }}>{item.by} · {item.time} ago</span>
          </div>
          {open===item.id && <div style={{ background:t.tag, borderRadius:12, padding:13, marginBottom:12, animation:"fadeUp 0.3s ease both" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}><Icon name="Award" size={14} color={t.gold} /><span style={{ fontSize:11, fontWeight:700, color:t.gold, fontFamily:FB, textTransform:"uppercase", letterSpacing:0.5 }}>Top answer</span></div>
            <p style={{ fontSize:14, color:t.text, fontFamily:FB, lineHeight:1.55, margin:0 }}>{item.top}</p>
          </div>}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>setVotes(v=>({...v,[item.id]:!v[item.id]}))} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:`1px solid ${votes[item.id]?t.accent:t.border}`, background:votes[item.id]?t.accent+"14":t.tag, color:votes[item.id]?t.accent:t.muted, fontSize:12.5, fontWeight:700, fontFamily:FB, cursor:"pointer" }}><Icon name="ArrowUp" size={14} color={votes[item.id]?t.accent:t.muted} /> {item.upvotes+up}</button>
            <button onClick={()=>setOpen(o=>o===item.id?null:item.id)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:"none", background:t.tag, color:t.muted, fontSize:12.5, fontWeight:700, fontFamily:FB, cursor:"pointer" }}><Icon name="MessageCircle" size={14} color={t.muted} /> {item.answers} answers</button>
          </div>
        </div>
      );})}
    </div>
  );
}

// ════ AI TRAVEL ASSISTANT ════════════════════════════════════════════════════
function AssistantScreen({ t }) {
  const suggestions = ["Plan my Goa trip","Budget for Vietnam?","Best Jain food in Bangkok?","Is Bali safe this week?"];
  const answers = {
    "Plan my Goa trip":"A great 4-day Goa plan: Day 1 — settle in Assagao, sunset at Anjuna. Day 2 — café-hop (Bluebell, Artjuna) + Vagator. Day 3 — Old Goa churches + spice farm. Day 4 — beach day at Morjim. Want me to add a day-by-day itinerary to your trips?",
    "Budget for Vietnam?":"For 10 days in Vietnam, mid-range: ₹55,000–₹75,000 incl. flights. Daily on-ground ≈ ₹2,500 (stays, street food, transport). Hoi An & Da Nang are cheaper than Hanoi. Shall I build a detailed budget?",
    "Best Jain food in Bangkok?":"Look for the 'เจ' (J) sign — it marks pure-veg/Jain-friendly food. Rai-Ru and May Veggie Home are traveller-favourites. I can shortlist 5 community-verified spots in PureFind.",
    "Is Bali safe this week?":"Bali's community TrustScore is 91/100 — rated “Safe this week”. 23 travellers are exploring now; recent posts mention afternoon rain in Ubud. Mornings are clear and great for rice terraces.",
  };
  const [msgs, setMsgs] = useStateF([{ from:"ai", text:"Hi Aakash! I'm your Tripova travel assistant, trained on real traveller posts. Where shall we go?" }]);
  const [input, setInput] = useStateF("");
  const endRef = useRefF();
  useEffectF(()=>{ if(endRef.current) endRef.current.scrollIntoView ? null : null; },[msgs]);
  const send = (text) => {
    const q = text || input; if (!q.trim()) return;
    const reply = answers[q] || "Great question! Based on traveller reports, I'd recommend checking the destination hub for live updates and PureFind for food. Want me to draft an itinerary?";
    setMsgs(m=>[...m, { from:"me", text:q }, { from:"ai", text:reply }]);
    setInput("");
  };
  return (
    <div style={{ padding:"0 0 110px", display:"flex", flexDirection:"column", minHeight:"calc(100vh - 150px)" }}>
      <div style={{ flex:1, padding:"0 16px" }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.from==="me"?"flex-end":"flex-start", marginBottom:12 }}>
            {m.from==="ai" && <div style={{ width:30, height:30, borderRadius:9, background:t.accent, display:"flex", alignItems:"center", justifyContent:"center", marginRight:8, flexShrink:0, alignSelf:"flex-end" }}><Icon name="Sparkles" size={15} color={t.goldFill} /></div>}
            <div style={{ maxWidth:"78%", padding:"11px 14px", borderRadius:m.from==="me"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.from==="me"?t.accent:t.card, color:m.from==="me"?"#fff":t.text, border:m.from==="me"?"none":`1px solid ${t.border}`, fontSize:14, fontFamily:FB, lineHeight:1.5 }}>{m.text}</div>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:14 }}>
          {suggestions.map(s=><button key={s} onClick={()=>send(s)} style={{ padding:"8px 13px", borderRadius:20, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:12.5, fontWeight:600, fontFamily:FB, cursor:"pointer" }}>{s}</button>)}
        </div>
      </div>
      <div style={{ position:"sticky", bottom:78, padding:"12px 16px 0", background:`linear-gradient(transparent, ${t.bg} 24%)` }}>
        <div style={{ display:"flex", gap:9, alignItems:"center", background:t.card, border:`1px solid ${t.border}`, borderRadius:24, padding:"5px 5px 5px 16px" }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask anything about your trip…" style={{ flex:1, border:"none", background:"transparent", outline:"none", fontSize:14, fontFamily:FB, color:t.text }} />
          <button onClick={()=>send()} style={{ width:38, height:38, borderRadius:"50%", border:"none", background:t.accent, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="ArrowUp" size={18} color="#fff" /></button>
        </div>
      </div>
    </div>
  );
}

// ════ REFERRALS ══════════════════════════════════════════════════════════════
function ReferralsScreen({ t }) {
  const [copied, setCopied] = useStateF(false);
  const leaders = [{ n:"Sneha V.", c:42, a:"SV" },{ n:"Aryan M.", c:31, a:"AM" },{ n:"You", c:6, a:"AK", me:true },{ n:"Dev P.", c:5, a:"DP" }];
  const milestones = [{ n:1, r:"1 month Premium", done:true },{ n:3, r:"Offline Travel Pack", done:true },{ n:5, r:"Exclusive badge", done:true },{ n:10, r:"6 months Premium", done:false }];
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ background:`linear-gradient(135deg,${t.accent},${t.secondary})`, borderRadius:20, padding:20, marginBottom:18, color:"#fff", textAlign:"center" }}>
        <Icon name="Gift" size={30} color={t.goldFill} />
        <div style={{ fontSize:22, fontFamily:FH, marginTop:8 }}>Invite friends, both get Premium</div>
        <div style={{ fontSize:13, opacity:0.9, fontFamily:FB, marginTop:4 }}>You've invited {CURRENT_USER.referrals} travellers so far</div>
        <div onClick={()=>{ setCopied(true); setTimeout(()=>setCopied(false),1500); }} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"12px 16px", marginTop:16, cursor:"pointer" }}>
          <span style={{ fontSize:16, fontWeight:800, fontFamily:FB, letterSpacing:1 }}>AAKASH-TRIP</span>
          <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, fontWeight:700, fontFamily:FB }}><Icon name={copied?"Check":"Copy"} size={15} color="#fff" /> {copied?"Copied":"Copy"}</span>
        </div>
      </div>

      <SectionTitle t={t}>Referral Milestones</SectionTitle>
      <div style={{ marginBottom:22 }}>
        {milestones.map(m=>(
          <div key={m.n} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:14, border:`1px solid ${t.border}`, background:t.card, marginBottom:10 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:m.done?t.success+"18":t.tag, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={m.done?"Check":"Lock"} size={17} color={m.done?t.success:t.muted} /></div>
            <div style={{ flex:1 }}><div style={{ fontSize:14.5, fontWeight:700, color:t.text, fontFamily:FB }}>{m.r}</div><div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>{m.n} referral{m.n>1?"s":""}</div></div>
            {m.done && <span style={{ fontSize:11.5, fontWeight:700, color:t.success, fontFamily:FB }}>Unlocked</span>}
          </div>
        ))}
      </div>

      <SectionTitle t={t}>Referral Leaderboard</SectionTitle>
      <div style={{ background:t.card, borderRadius:16, border:`1px solid ${t.border}`, padding:"4px 14px", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
        {leaders.map((l,i)=>(
          <div key={l.n} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:i<leaders.length-1?`1px solid ${t.border}`:"none" }}>
            <span style={{ fontSize:14, fontWeight:800, color:i===0?t.gold:t.muted, fontFamily:FH, width:18 }}>{i+1}</span>
            <Avatar initials={l.a} size={34} t={t} />
            <span style={{ flex:1, fontSize:14.5, fontWeight:l.me?800:600, color:l.me?t.accent:t.text, fontFamily:FB }}>{l.n}</span>
            <span style={{ fontSize:13, fontWeight:700, color:t.secondary, fontFamily:FB }}>{l.c} invites</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════ PREMIUM ════════════════════════════════════════════════════════════════
function PremiumScreen({ t }) {
  const benefits = [
    { icon:"Sparkles", label:"Unlimited AI Itineraries", sub:"Free plan: 1 active itinerary" },
    { icon:"Camera", label:"AI Menu Scanner", sub:"Ingredient analysis & allergy warnings" },
    { icon:"Salad", label:"Advanced PureFind", sub:"Translation, food guides, restaurant TrustScore" },
    { icon:"ShieldCheck", label:"Verified-Only Matching", sub:"Priority + premium visibility in TripPods" },
    { icon:"Download", label:"Offline Travel Pack", sub:"Maps, guides, documents, emergency info" },
    { icon:"Crown", label:"Premium Badge", sub:"Stand out across the community" },
  ];
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ background:`linear-gradient(135deg,${t.gold},${t.goldFill})`, borderRadius:20, padding:22, marginBottom:18, color:"#fff", textAlign:"center" }}>
        <Icon name="Crown" size={32} color="#fff" />
        <div style={{ fontSize:24, fontFamily:FH, marginTop:8 }}>Tripova Premium</div>
        <div style={{ fontSize:13.5, opacity:0.95, fontFamily:FB, marginTop:4 }}>Everything you need to travel smarter, together.</div>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:5, marginTop:14 }}>
          <span style={{ fontSize:34, fontWeight:800, fontFamily:FH }}>₹299</span><span style={{ fontSize:14, opacity:0.9, fontFamily:FB }}>/month</span>
        </div>
      </div>
      {benefits.map(b=>(
        <div key={b.label} style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 14px", borderRadius:14, border:`1px solid ${t.border}`, background:t.card, marginBottom:10, boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
          <div style={{ width:42, height:42, borderRadius:12, background:t.gold+"16", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={b.icon} size={20} color={t.gold} /></div>
          <div style={{ flex:1 }}><div style={{ fontSize:14.5, fontWeight:700, color:t.text, fontFamily:FB }}>{b.label}</div><div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>{b.sub}</div></div>
          <Icon name="Check" size={18} color={t.success} />
        </div>
      ))}
      <button style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", background:`linear-gradient(135deg,${t.gold},${t.goldFill})`, color:"#fff", fontSize:15, fontWeight:800, fontFamily:FB, cursor:"pointer", marginTop:8, boxShadow:`0 6px 20px ${t.gold}45` }}>Start 7-day free trial</button>
    </div>
  );
}

Object.assign(window, { ExploreScreen, TripPodScreen, AskScreen, AssistantScreen, ReferralsScreen, PremiumScreen });
