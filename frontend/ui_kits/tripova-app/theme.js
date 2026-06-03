// TRIPOVA — theme tokens. Brand-sheet direction:
// Midnight Navy + Dusty Blue + Champagne Gold + Off-White + Pearl + Graphite.
// Fonts: DM Serif Display (display headings) + Manrope (body / UI / labels).
// "Explore more. Live stories." — Refined. Trustworthy. Inspiring.

const FD = "'Manrope', sans-serif";       // UI, labels, logo, eyebrows (tracked)
const FH = "'DM Serif Display', serif";   // display headings, names, banner titles
const FB = "'Manrope', sans-serif";       // body, descriptions

const LIGHT = {
  bg: "#FAF9F6",        // off white
  bg2: "#F1F0EC",       // pearl-tinted section
  card: "#FFFFFF",
  accent: "#1B263B",    // midnight navy — primary, headings, structure
  secondary: "#6C8BA7", // dusty blue — secondary accents, icons
  gold: "#B58F4F",      // champagne gold (text-legible) — highlights, stars, verified
  goldFill: "#D4B483",  // champagne gold (fills/swatches)
  text: "#262B33",      // graphite ink
  heading: "#1B263B",   // navy headings
  muted: "#8A93A0",     // cool grey
  border: "#E7E8EB",    // pearl border
  success: "#3E7D5A",
  warning: "#C0934A",
  danger: "#B5483D",
  overlay: "rgba(27,38,59,0.04)",
  tag: "#F1F3F5",       // cool chip/input fill
  teal: "#5B8AA6",
};
const DARK = {
  bg: "#0D1320",        // premium deep navy-black (Linear / Things 3 inspired)
  bg2: "#111A2B",       // raised section
  card: "#131B2E",      // card surface
  accent: "#8FB0D4",    // soft sky-navy — primary in dark
  secondary: "#6C8BA7", // dusty blue
  gold: "#E0C088",      // warm champagne (brighter for dark)
  goldFill: "#D4B483",
  text: "#E9EDF4",      // near-white cool
  heading: "#F4F7FB",
  muted: "#8793A6",     // cool grey-blue
  border: "#22304A",    // subtle blue-tinted border
  success: "#5FBF93",
  warning: "#E0C088",
  danger: "#E58368",
  overlay: "rgba(143,176,212,0.05)",
  tag: "#19243A",       // blue-tinted chip fill
  teal: "#7FB0C9",
};

const ALL_FOOD_TYPES = [
  { id:"jain",      label:"Jain",        emoji:"🟡", color:"#C0934A", desc:"No root vegetables, separate prep" },
  { id:"pure_veg",  label:"Pure Veg",    emoji:"🟢", color:"#3E7D5A", desc:"Strictly vegetarian, no egg" },
  { id:"vegan",     label:"Vegan",       emoji:"🟣", color:"#7A6A9E", desc:"No animal products" },
  { id:"veg_egg",   label:"Veg + Egg",   emoji:"🟤", color:"#9A7E5E", desc:"Vegetarian including eggs" },
  { id:"halal",     label:"Halal",       emoji:"🔵", color:"#4A7A95", desc:"Halal certified" },
  { id:"gluten",    label:"Gluten-Free", emoji:"⚪", color:"#7C8794", desc:"No wheat, barley, rye" },
  { id:"sattvic",   label:"Sattvic",     emoji:"🔴", color:"#9E5048", desc:"No onion, garlic, or meat" },
  { id:"kosher",    label:"Kosher",      emoji:"✡️", color:"#4A6A8A", desc:"Kosher certified" },
  { id:"buddhist",  label:"Buddhist Veg",emoji:"☸️", color:"#8A7A4A", desc:"No meat, often no egg" },
  { id:"everything",label:"Everything",  emoji:"🌐", color:"#8A93A0", desc:"No restrictions" },
];

const CAT_COLORS = { Food:"#3E7D5A", Safety:"#B5483D", Transport:"#C0934A", Stay:"#4A7A95", Weather:"#7A6A9E", Crowd:"#9E5048" };
const LANGUAGES = ["English","हिंदी","தமிழ்","বাংলা"];

// Shared interest taxonomy for TripPods & profiles
const INTERESTS = ["Photography","Food Exploration","Hiking","Backpacking","Luxury Travel","Culture","Adventure","Wellness","Nature","Nightlife"];

// TrustScore tier helper
const trustTier = (s) => s>=90 ? "Exemplary" : s>=80 ? "Highly Trusted" : s>=60 ? "Trusted" : "Building Trust";

// Verification levels — shown as badges beside usernames everywhere.
const VERIFY_LEVELS = {
  email:    { icon:"Mail",        label:"Email Verified",        color:"muted" },
  phone:    { icon:"Smartphone",  label:"Phone Verified",        color:"secondary" },
  digilocker:{ icon:"ShieldCheck",label:"DigiLocker Verified",   color:"success" },
  govt:     { icon:"BadgeCheck",  label:"Government ID Verified", color:"accent" },
  frequent: { icon:"Plane",       label:"Frequent Traveller",    color:"teal" },
  premium:  { icon:"Crown",       label:"Premium Member",        color:"gold" },
};

// The signed-in demo user.
const CURRENT_USER = {
  name:"Aakash Kumar", handle:"@aakash.travels", avatar:"AK",
  trust:88, premium:true, profileType:"Creator",
  verifications:["email","phone","digilocker","frequent","premium"],
  followers:1240, following:312, countries:3, posts:48, trips:12, pods:7,
  foods:["jain","pure_veg"], referrals:6,
};

// Vision Preview Mode — which features are launch-ready (MVP) vs roadmap (Full Vision).
// Anything NOT listed in MVP is a "Full Vision" / coming-soon feature.
const MVP_FEATURES = ["home","explore","create","trippod","profile","purefind","guides","plan","search","trustscore","verification"];
const FULL_FEATURES = ["hotels","experiences","ask","assistant","emergency","collections","premium","offline","family","budget","maps","chats","events","requests","referrals","menuscanner","creator"];

const getFI = (id) => ALL_FOOD_TYPES.find(f => f.id === id) || ALL_FOOD_TYPES[0];

Object.assign(window, { FD, FH, FB, LIGHT, DARK, ALL_FOOD_TYPES, CAT_COLORS, LANGUAGES, INTERESTS, trustTier, VERIFY_LEVELS, CURRENT_USER, MVP_FEATURES, FULL_FEATURES, getFI });
