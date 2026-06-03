// TRIPOVA — shared primitives. Babel-loaded. Globals: FD, FH, FB.

// Lucide line-icon wrapper (matches the brand sheet's thin-stroke icons).
// lucide.icons[Name] = ["svg", attrs, [[childTag, childAttrs], ...]]
const Icon = ({ name, size=20, color="currentColor", stroke=2, style={} }) => {
  const lib = (window.lucide && (lucide.icons || lucide)) || {};
  const node = lib[name];
  let svg = "";
  if (Array.isArray(node)) {
    const [, attrs, children] = node;
    const a = { ...attrs, width:size, height:size, stroke:color, "stroke-width":stroke };
    const aStr = Object.entries(a).map(([k,v])=>`${k}="${v}"`).join(" ");
    const cStr = (children||[]).map(([tag,cattrs])=>`<${tag} ${Object.entries(cattrs).map(([k,v])=>`${k}="${v}"`).join(" ")} />`).join("");
    svg = `<svg ${aStr}>${cStr}</svg>`;
  }
  return <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", color, ...style }} dangerouslySetInnerHTML={{ __html: svg }} />;
};

const Divider = ({ t }) => (
  <div style={{ height:1, background:t.border, margin:"4px 0" }} />
);

// Minimal section break — a slim centered rule with a gold dot.
const Fleuron = ({ t }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 4px" }}>
    <div style={{ flex:1, height:1, background:t.border }} />
    <span style={{ width:5, height:5, borderRadius:"50%", background:t.goldFill, flexShrink:0 }} />
    <div style={{ flex:1, height:1, background:t.border }} />
  </div>
);

// Clean section header: Manrope uppercase tracked label + optional action link.
const SectionTitle = ({ children, t, action, onAction }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:13 }}>
    <span style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD }}>{children}</span>
    {action && <button onClick={onAction} style={{ background:"transparent", border:"none", color:t.secondary, fontSize:12, fontWeight:600, fontFamily:FB, cursor:"pointer", letterSpacing:0.2 }}>{action}</button>}
  </div>
);

const Card = ({ children, t, style={} }) => (
  <div style={{ background:t.card, borderRadius:16, padding:16, border:`1px solid ${t.border}`, marginBottom:14, boxShadow:"0 1px 3px rgba(27,38,59,0.04)", ...style }}>{children}</div>
);

const Btn = ({ children, onClick, full, outline, color, t, disabled, small }) => {
  const bg = outline ? "transparent" : (color || t.accent);
  const fg = outline ? (color || t.accent) : "#fff";
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:full?"100%":"auto", padding:small?"8px 16px":"12px 20px", borderRadius:8, border:`1.5px solid ${outline ? (color||t.border) : "transparent"}`, background:disabled?t.muted:bg, color:disabled?"#fff":fg, fontSize:small?13:14, fontWeight:700, fontFamily:FB, cursor:disabled?"not-allowed":"pointer", letterSpacing:0.2, transition:"all 0.2s", opacity:disabled?0.7:1 }}>
      {children}
    </button>
  );
};

const InputF = ({ label, value, onChange, placeholder, type="text", t }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ fontSize:11, fontWeight:700, color:t.muted, letterSpacing:1.5, textTransform:"uppercase", fontFamily:FD, marginBottom:6 }}>{label}</div>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${t.border}`, background:t.tag, color:t.text, fontSize:14, fontFamily:FB, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" }}
      onFocus={e=>e.target.style.borderColor=t.secondary} onBlur={e=>e.target.style.borderColor=t.border} />
  </div>
);

const SkeletonCard = ({ t }) => (
  <div style={{ background:t.card, borderRadius:16, padding:18, marginBottom:12, border:`1px solid ${t.border}` }}>
    {[75,100,55,80].map((w,i)=><div key={i} style={{ height:11, background:t.tag, borderRadius:5, width:`${w}%`, marginBottom:9, animation:"shimmer 1.5s infinite" }} />)}
  </div>
);

Object.assign(window, { Icon, Divider, Fleuron, SectionTitle, Card, Btn, InputF, SkeletonCard });
