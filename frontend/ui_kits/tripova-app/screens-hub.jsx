// TRIPOVA — Home, Discover, and the Destination Hub (the product's center).
// Babel-loaded. Globals: Icon, Card, Btn, SectionTitle, TrustBadge, FoodBadge,
// CommunityVerified, CommBadge, PoweredBy, CompatBadge, InterestChip, getDest...
const { useState: useStateH } = React;

// ── shared tiny pieces ──────────────────────────────────────────────────────
function Avatar({ initials, size=38, t }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.secondary})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:size*0.34, fontWeight:800, fontFamily:FB, flexShrink:0 }}>{initials}</div>;
}

// ── Live community post card (used by Home & the Destination Hub) ────────────
function PostCard({ post, t, openDest, idx=0 }) {
  const [helped, setHelped] = useStateH(false);
  const catColor = CAT_COLORS[post.category] || t.secondary;
  return (
    <div onClick={()=>post.destId&&openDest&&openDest(post.destId)}
      style={{ background:t.card, borderRadius:16, padding:16, marginBottom:12, border:`1px solid ${t.border}`, boxShadow:"0 1px 3px rgba(13,19,32,0.04)", animation:`fadeUp 0.4s ease ${idx*0.08}s both`, cursor:openDest?"pointer":"default", transition:"box-shadow 0.2s, transform 0.2s" }}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 6px 20px ${t.accent}18`; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow="0 1px 3px rgba(13,19,32,0.04)"; e.currentTarget.style.transform="none"; }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:11 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center", minWidth:0 }}>
          <Avatar initials={post.avatar} size={38} t={t} />
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:14.5, fontWeight:700, color:t.heading, fontFamily:FH }}>{post.user}</span>
              {post.verified && <Icon name="BadgeCheck" size={14} color={t.secondary} />}
            </div>
            <div style={{ fontSize:11.5, color:t.muted, fontFamily:FB, display:"flex", alignItems:"center", gap:4, marginTop:1 }}>
              <Icon name="MapPin" size={11} color={t.muted} /> {post.location} · {post.time}
            </div>
          </div>
        </div>
        <div style={{ flexShrink:0 }}><TrustBadge score={post.score} t={t} /></div>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:11, flexWrap:"wrap" }}>
        <span style={{ fontSize:11, fontWeight:700, color:catColor, background:catColor+"16", border:`1px solid ${catColor}30`, padding:"3px 10px", borderRadius:6, fontFamily:FB }}>{post.category}</span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:t.muted, background:t.tag, padding:"3px 10px", borderRadius:6, fontFamily:FB }}><Icon name="Clock" size={11} color={t.muted} /> {T("Expires in")} {post.expiry}</span>
      </div>
      <p style={{ fontSize:13.5, color:t.text, lineHeight:1.6, margin:"0 0 13px", fontFamily:FB }}>{post.content}</p>
      <div style={{ height:1, background:t.border, margin:"0 0 11px" }} />
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={e=>{ e.stopPropagation(); setHelped(h=>!h); }}
          style={{ display:"flex", alignItems:"center", gap:6, background:helped?t.accent+"15":t.tag, border:`1px solid ${helped?t.accent:t.border}`, borderRadius:6, padding:"6px 13px", cursor:"pointer", color:helped?t.accent:t.muted, fontSize:12, fontWeight:600, fontFamily:FB, transition:"all 0.18s" }}>
          <Icon name="ThumbsUp" size={13} color={helped?t.accent:t.muted} /> {post.helpful+(helped?1:0)} {T("Helpful")}
        </button>
        <button onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", color:t.muted, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FB }}>
          <Icon name="MessageCircle" size={13} color={t.muted} /> {post.comments!=null?post.comments+" ":""}{T("Reply")}
        </button>
      </div>
    </div>
  );
}

function HomeScreen({ t, openDest, createdPosts=[], full }) {
  const feed = createdPosts.concat(FEED_POSTS);
  return (
    <div style={{ padding:"0 16px 110px" }}>
      {/* Live community counter */}
      <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:6, marginBottom:18, scrollbarWidth:"none" }}>
        {COMMUNITY_COUNTER.map((c,i)=>(
          <div key={i} style={{ flexShrink:0, minWidth:150, background:i===0?`linear-gradient(135deg,${t.accent},${t.secondary})`:t.card, border:i===0?"none":`1px solid ${t.border}`, borderRadius:14, padding:"13px 15px", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
              <Icon name={c.icon} size={15} color={i===0?t.goldFill:t.secondary} />
              {i===0 && <span style={{ width:7, height:7, borderRadius:"50%", background:"#5FBF93", display:"inline-block" }} />}
            </div>
            <div style={{ fontSize:22, fontFamily:FH, color:i===0?"#fff":t.heading, lineHeight:1 }}>{c.value}</div>
            <div style={{ fontSize:11, color:i===0?"rgba(255,255,255,0.85)":t.muted, fontFamily:FB, marginTop:3, lineHeight:1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Stories */}
      <div style={{ display:"flex", gap:14, overflowX:"auto", paddingBottom:6, marginBottom:22, scrollbarWidth:"none" }}>
        {STORIES.map(s=>(
          <button key={s.id} onClick={()=>!s.own&&openDest(s.destId)} style={{ background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0, padding:0 }}>
            <div style={{ width:62, height:62, borderRadius:"50%", padding:s.own?0:2.5, background:s.own?"transparent":(s.seen?t.border:`linear-gradient(135deg,${t.gold},${t.secondary})`) }}>
              <div style={{ width:"100%", height:"100%", borderRadius:"50%", border:`2px solid ${t.bg}`, position:"relative" }}>
                <Avatar initials={s.avatar} size={s.own?62:55} t={t} />
                {s.own && <div style={{ position:"absolute", bottom:-2, right:-2, width:20, height:20, borderRadius:"50%", background:t.accent, border:`2px solid ${t.bg}`, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="Plus" size={11} color="#fff" /></div>}
              </div>
            </div>
            <span style={{ fontSize:11, color:t.text, fontFamily:FB, fontWeight:500 }}>{s.own?"Your story":s.user}</span>
          </button>
        ))}
      </div>

      {/* Community activity */}
      <SectionTitle t={t}>{T("Community Activity")}</SectionTitle>
      <div style={{ background:t.card, borderRadius:16, border:`1px solid ${t.border}`, padding:"4px 14px", marginBottom:22, boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
        {COMMUNITY_ACTIVITY.map((a,i)=>(
          <div key={a.id} style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 0", borderBottom:i<COMMUNITY_ACTIVITY.length-1?`1px solid ${t.border}`:"none" }}>
            <div style={{ width:32, height:32, borderRadius:9, background:t[a.color]+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={a.icon} size={16} color={t[a.color]} /></div>
            <div style={{ flex:1, fontSize:13, color:t.text, fontFamily:FB, lineHeight:1.4 }}>{a.text}</div>
            <span style={{ fontSize:11, color:t.muted, fontFamily:FB, flexShrink:0 }}>{a.time}</span>
          </div>
        ))}
      </div>

      {/* Feed */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:13 }}>
        <span style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD }}>{T("Nearby Traveller Updates")}</span>
        <PoweredBy t={t} />
      </div>
      {feed.map((post,idx)=><PostCard key={post.id} post={post} t={t} openDest={openDest} idx={idx} />)}

      {/* Traveller stories */}
      <div style={{ marginTop:10, marginBottom:22 }}>
        <SectionTitle t={t}>{T("Traveller Stories")}</SectionTitle>
        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8, scrollbarWidth:"none" }}>
          {STORY_FEED.map(s=>(
            <div key={s.id} onClick={()=>openDest(s.destId)} style={{ flexShrink:0, width:250, background:t.card, borderRadius:16, border:`1px solid ${t.border}`, overflow:"hidden", cursor:"pointer", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ height:120, background:s.gradient, position:"relative" }}>
                <div style={{ position:"absolute", bottom:10, left:12, display:"flex", alignItems:"center", gap:7 }}>
                  <Avatar initials={s.avatar} size={26} t={t} />
                  <span style={{ color:"#fff", fontSize:12.5, fontWeight:700, fontFamily:FB }}>{s.user}</span>
                </div>
              </div>
              <div style={{ padding:13 }}>
                <div style={{ fontSize:11, color:t.secondary, fontFamily:FB, fontWeight:700, marginBottom:4, display:"flex", alignItems:"center", gap:4 }}><Icon name="MapPin" size={11} color={t.secondary} /> {s.place}</div>
                <div style={{ fontSize:16, fontFamily:FH, color:t.heading, lineHeight:1.2, marginBottom:5 }}>{s.title}</div>
                <div style={{ fontSize:13, color:t.muted, fontFamily:FB, lineHeight:1.45, marginBottom:9 }}>{s.excerpt}</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:t.danger, fontFamily:FB, fontWeight:600 }}><Icon name="Heart" size={13} color={t.danger} /> {s.likes}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended trips */}
      <div style={{ marginBottom:4 }}>
        <SectionTitle t={t}>{T("Recommended For You")}</SectionTitle>
        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8, scrollbarWidth:"none" }}>
          {DESTINATIONS.slice(0,5).map(d=><DestTile key={d.id} d={d} t={t} openDest={openDest} w={140} h={175} />)}
        </div>
      </div>
    </div>
  );
}

function DestTile({ d, t, openDest, w=150, h=190 }) {
  return (
    <div onClick={()=>openDest(d.id)} style={{ flexShrink:0, width:w, height:h, borderRadius:16, background:d.gradient, position:"relative", cursor:"pointer", overflow:"hidden", transition:"transform 0.2s", boxShadow:"0 2px 10px rgba(13,19,32,0.10)" }}
      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03) translateY(-2px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
      <div style={{ position:"absolute", top:10, right:10, background:"rgba(255,255,255,0.92)", borderRadius:7, padding:"3px 8px", fontSize:11, fontWeight:800, color:"#1B263B", fontFamily:FB, display:"flex", alignItems:"center", gap:3 }}><Icon name="ShieldCheck" size={11} color="#3E7D5A" /> {d.trust}</div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"22px 12px 12px", background:"linear-gradient(transparent,rgba(0,0,0,0.78))" }}>
        <div style={{ color:"#fff", fontSize:18, fontWeight:400, fontFamily:FH }}>{d.name}</div>
        <div style={{ color:"rgba(255,255,255,0.82)", fontSize:11, fontFamily:FB, marginTop:1, display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#5FBF93", display:"inline-block" }} /> {d.exploring} exploring now
        </div>
      </div>
    </div>
  );
}

// ── HOME ─────────────────────────────────────────────────────────────────────
// ── (legacy DiscoverScreen kept for reference; Explore lives in screens-features) ──
function DiscoverScreen({ t, openDest }) {
  const [q, setQ] = useStateH("");
  const matches = DESTINATIONS.filter(d=>q===""||d.name.toLowerCase().includes(q.toLowerCase())||d.country.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ padding:"0 16px 110px" }}>
      <div style={{ position:"relative", marginBottom:22 }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", display:"flex" }}><Icon name="Search" size={17} color={t.muted} /></span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search destinations — Bali, Spiti, Goa..."
          style={{ width:"100%", padding:"13px 16px 13px 42px", borderRadius:12, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box" }} />
      </div>

      <SectionTitle t={t}>{q?`${matches.length} destinations`:"Trending Destinations"}</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
        {matches.map(d=>(
          <div key={d.id} onClick={()=>openDest(d.id)} style={{ borderRadius:16, background:d.gradient, height:150, position:"relative", cursor:"pointer", overflow:"hidden", boxShadow:"0 2px 10px rgba(13,19,32,0.10)", transition:"transform 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            <div style={{ position:"absolute", top:9, right:9, background:"rgba(255,255,255,0.92)", borderRadius:6, padding:"2px 7px", fontSize:10.5, fontWeight:800, color:"#1B263B", fontFamily:FB, display:"flex", alignItems:"center", gap:3 }}><Icon name="ShieldCheck" size={10} color="#3E7D5A" /> {d.trust}</div>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"20px 12px 11px", background:"linear-gradient(transparent,rgba(0,0,0,0.78))" }}>
              <div style={{ color:"#fff", fontSize:17, fontFamily:FH }}>{d.name}</div>
              <div style={{ color:"rgba(255,255,255,0.8)", fontSize:10.5, fontFamily:FB, marginTop:1 }}>{d.country} · {d.updates} updates</div>
            </div>
          </div>
        ))}
      </div>

      {!q && <>
        <SectionTitle t={t}>Traveller Collections</SectionTitle>
        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8, marginBottom:24, scrollbarWidth:"none" }}>
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

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:13 }}>
          <span style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD }}>Top Local Guides</span>
          <PoweredBy t={t} />
        </div>
        {GUIDES.slice(0,3).map(g=>(
          <div key={g.id} onClick={()=>openDest(g.destId)} style={{ background:t.card, borderRadius:14, border:`1px solid ${t.border}`, padding:12, marginBottom:10, display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
            <div style={{ width:46, height:46, borderRadius:12, background:g.gradient, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontFamily:FH, color:t.heading }}>{g.name}</div>
              <div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>{g.location} · {g.speciality}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:700, color:t.warning, fontFamily:FB, display:"flex", alignItems:"center", gap:3, justifyContent:"flex-end" }}><Icon name="Star" size={12} color={t.warning} /> {g.rating}</div>
              <TrustBadge score={g.score} t={t} />
            </div>
          </div>
        ))}
      </>}
    </div>
  );
}

// ── DESTINATION HUB — the product hub ────────────────────────────────────────
function HubSection({ title, t, action, onAction, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:13 }}>
        <span style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD }}>{title}</span>
        {action && <button onClick={onAction} style={{ background:"transparent", border:"none", color:t.secondary, fontSize:12, fontWeight:700, fontFamily:FB, cursor:"pointer" }}>{action} ›</button>}
      </div>
      {children}
    </div>
  );
}

function DestinationHub({ t, destId, openPods, openPureFind, openDest }) {
  const d = getDest(destId);
  const [saved, setSaved] = useStateH(d.save);
  const [following, setFollowing] = useStateH(d.follow);
  const [ai, setAi] = useStateH(null);
  const dedupe = (arr) => { const seen=new Set(); return arr.filter(x=>{ if(seen.has(x.id)) return false; seen.add(x.id); return true; }); };
  const posts = dedupe(FEED_POSTS.filter(p=>p.destId===d.id).concat(FEED_POSTS)).slice(0,3);
  const rests = dedupe(RESTAURANTS.filter(r=>r.destId===d.id).concat(RESTAURANTS)).slice(0,3);
  const pods = dedupe(PODS.filter(p=>p.destId===d.id).concat(PODS)).slice(0,2);
  const guides = dedupe(GUIDES.filter(g=>g.destId===d.id).concat(GUIDES)).slice(0,2);
  const safetyColor = d.safetyLevel==="good" ? t.success : d.safetyLevel==="caution" ? t.warning : t.danger;
  const aiQs = [`Is ${d.name} safe this week?`, `Best vegetarian food in ${d.name}?`, `5-day ${d.name} itinerary?`];
  const aiAns = {
    [`Is ${d.name} safe this week?`]: `Community reports rate ${d.name} as "${d.safety}". ${d.exploring} travellers are exploring right now and ${d.updates} updates were posted this week — TrustScore ${d.trust}/100.`,
    [`Best vegetarian food in ${d.name}?`]: `Travellers most-verify ${rests[0]?.name||"local kitchens"} here. Open PureFind for the full community-verified list with dietary filters.`,
    [`5-day ${d.name} itinerary?`]: `A relaxed 5-day plan blends the highlights with hidden gems travellers love. Open Plan to generate a day-by-day itinerary matched to your food preferences.`,
  };

  return (
    <div style={{ padding:"0 0 110px" }}>
      {/* Hero */}
      <div style={{ height:280, background:d.gradient, position:"relative", marginTop:-18 }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(transparent 35%,rgba(0,0,0,0.82))" }} />
        <div style={{ position:"absolute", top:14, right:16, display:"flex", gap:8 }}>
          <button onClick={()=>setSaved(s=>!s)} style={{ width:38, height:38, borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.92)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name={saved?"Bookmark":"Bookmark"} size={17} color={saved?"#B58F4F":"#1B263B"} stroke={saved?2.6:2} /></button>
        </div>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 16px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.94)", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:800, color:"#1B263B", fontFamily:FB }}><Icon name="ShieldCheck" size={13} color="#3E7D5A" /> TrustScore {d.trust}</span>
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:safetyColor, borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700, color:"#fff", fontFamily:FB }}><Icon name="ShieldAlert" size={12} color="#fff" /> {d.safety}</span>
          </div>
          <div style={{ color:"#fff", fontSize:38, fontFamily:FH, lineHeight:1 }}>{d.name}</div>
          <div style={{ color:"rgba(255,255,255,0.85)", fontSize:13.5, fontFamily:FB, marginTop:4 }}>{d.country} · {d.tagline}</div>
          <div style={{ display:"flex", gap:9, marginTop:14 }}>
            <button onClick={()=>setFollowing(f=>!f)} style={{ flex:1, padding:"11px", borderRadius:10, border:"none", background:following?"rgba(255,255,255,0.92)":"#fff", color:"#1B263B", fontSize:14, fontWeight:700, fontFamily:FB, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><Icon name={following?"Check":"Plus"} size={16} color="#1B263B" /> {following?"Following":"Follow"}</button>
            <button onClick={()=>setSaved(s=>!s)} style={{ flex:1, padding:"11px", borderRadius:10, border:"1.5px solid rgba(255,255,255,0.7)", background:"transparent", color:"#fff", fontSize:14, fontWeight:700, fontFamily:FB, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><Icon name="Bookmark" size={16} color="#fff" /> {saved?"Saved":"Save"}</button>
          </div>
        </div>
      </div>

      <div style={{ padding:"18px 16px 0" }}>
        {/* Activity stats */}
        <div style={{ display:"flex", background:t.card, borderRadius:16, border:`1px solid ${t.border}`, padding:"14px 0", marginBottom:18, boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
          {[["Users",d.exploring,"exploring"],["Activity",d.updates,"this week"],["Compass",d.guides,"guides"]].map(([ic,n,l],i)=>(
            <div key={l} style={{ flex:1, textAlign:"center", borderRight:i<2?`1px solid ${t.border}`:"none" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><Icon name={ic} size={15} color={t.secondary} /><span style={{ fontSize:20, fontFamily:FH, color:t.heading }}>{n}</span></div>
              <div style={{ fontSize:10.5, color:t.muted, fontFamily:FB, marginTop:2, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Community badges */}
        <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:8 }}>
          {d.badges.map(b=><CommBadge key={b} label={b} t={t} />)}
        </div>
        <PoweredBy t={t} style={{ marginBottom:22 }} />

        {/* AI Assistant */}
        <HubSection title={`Ask about ${d.name}`} t={t}>
          <div style={{ background:`linear-gradient(135deg,${t.accent}12,${t.secondary}08)`, borderRadius:16, border:`1px solid ${t.accent}20`, padding:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:t.accent, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="Sparkles" size={16} color={t.goldFill} /></div>
              <div style={{ fontSize:14, fontFamily:FH, color:t.heading }}>Tripova AI · trained on traveller posts</div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {aiQs.map(q=><button key={q} onClick={()=>setAi(q)} style={{ padding:"7px 13px", borderRadius:20, border:`1px solid ${ai===q?t.accent:t.border}`, background:ai===q?t.accent+"15":t.card, color:ai===q?t.accent:t.text, fontSize:12.5, fontWeight:600, fontFamily:FB, cursor:"pointer", transition:"all 0.18s" }}>{q}</button>)}
            </div>
            {ai && <div style={{ marginTop:12, background:t.card, borderRadius:12, padding:"12px 14px", border:`1px solid ${t.border}`, fontSize:13.5, color:t.text, fontFamily:FB, lineHeight:1.6, animation:"fadeUp 0.3s ease both" }}>{aiAns[ai]}</div>}
          </div>
        </HubSection>

        {/* Live feed */}
        <HubSection title="Live Traveller Feed" t={t} action="See all">
          {posts.map((p,i)=><PostCard key={p.id+"-"+i} post={p} t={t} openDest={openDest} idx={i} />)}
        </HubSection>

        {/* PureFind results */}
        <HubSection title="PureFind · Verified Eats" t={t} action="Open PureFind" onAction={openPureFind}>
          {rests.map((r,i)=>(
            <div key={r.id+"-"+i} onClick={openPureFind} style={{ background:t.card, borderRadius:14, border:`1px solid ${t.border}`, padding:12, marginBottom:10, display:"flex", gap:12, cursor:"pointer", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ width:54, height:54, borderRadius:12, background:r.gradient, flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ fontSize:14.5, fontFamily:FH, color:t.heading }}>{r.name}</div>
                  <div style={{ fontSize:12.5, fontWeight:700, color:t.warning, fontFamily:FB, display:"flex", alignItems:"center", gap:3, flexShrink:0 }}><Icon name="Star" size={11} color={t.warning} /> {r.rating}</div>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:7 }}>
                  {Object.entries(r.verifiedBy).slice(0,2).map(([fid,c])=><CommunityVerified key={fid} foodId={fid} count={c} t={t} />)}
                </div>
              </div>
            </div>
          ))}
        </HubSection>

        {/* TripPods */}
        <HubSection title="TripPods Here" t={t} action="See all" onAction={openPods}>
          {pods.map((p,i)=>(
            <div key={p.id+"-"+i} onClick={openPods} style={{ background:t.card, borderRadius:14, border:`1px solid ${t.border}`, padding:14, marginBottom:10, cursor:"pointer", boxShadow:"0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:15, fontFamily:FH, color:t.heading }}>{p.destination}</div>
                  <div style={{ fontSize:12, color:t.muted, fontFamily:FB }}>{p.dates} · {p.budget}/person</div>
                </div>
                <CompatBadge pct={p.compatibility} t={t} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Avatar initials={p.hostAvatar} size={26} t={t} />
                <span style={{ fontSize:12.5, color:t.text, fontFamily:FB, fontWeight:600 }}>{p.host}</span>
                <TrustBadge score={p.score} t={t} />
                <span style={{ marginLeft:"auto", fontSize:11.5, color:p.spots<=1?t.danger:t.success, fontFamily:FB, fontWeight:700 }}>{p.spots} spot{p.spots>1?"s":""} left</span>
              </div>
            </div>
          ))}
        </HubSection>

        {/* Guides */}
        <HubSection title="Trusted Local Guides" t={t}>
          <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:6, scrollbarWidth:"none" }}>
            {guides.map((g,i)=>(
              <div key={g.id+"-"+i} style={{ flexShrink:0, width:170, background:t.card, borderRadius:14, border:`1px solid ${t.border}`, overflow:"hidden", boxShadow:"0 1px 3px rgba(13,19,32,0.04)", cursor:"pointer" }}>
                <div style={{ height:74, background:g.gradient }} />
                <div style={{ padding:12 }}>
                  <div style={{ fontSize:14.5, fontFamily:FH, color:t.heading }}>{g.name}</div>
                  <div style={{ fontSize:11.5, color:t.muted, fontFamily:FB, marginBottom:8 }}>{g.speciality}</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <TrustBadge score={g.score} t={t} />
                    <span style={{ fontSize:12.5, fontWeight:700, color:t.accent, fontFamily:FH }}>{g.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </HubSection>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, DiscoverScreen, DestinationHub, PostCard, Avatar, DestTile });
