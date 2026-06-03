// TRIPOVA — demo content. Plain JS globals. "Powered by Travellers."
// Rich enough that the platform feels alive on first open.

// ── Destinations: each is a full hub. id used for routing. ──────────────────
const DESTINATIONS = [
  { id:"bali", name:"Bali", country:"Indonesia", gradient:"linear-gradient(150deg,#1B3A47,#5E97A8)",
    trust:91, exploring:23, updates:104, guides:12, save:false, follow:false,
    safety:"Safe this week", safetyLevel:"good",
    tagline:"Temples, rice terraces and surf towns — endlessly explorable.",
    badges:["Safe for Solo Travellers","Great for Families","Backpacker Friendly"] },
  { id:"spiti", name:"Spiti Valley", country:"India", gradient:"linear-gradient(150deg,#1E2740,#5A6B96)",
    trust:88, exploring:14, updates:62, guides:6, save:true, follow:false,
    safety:"Roads open · carry layers", safetyLevel:"caution",
    tagline:"A cold desert mountain valley at the edge of the Himalayas.",
    badges:["Safe for Solo Travellers","Budget Friendly","High Altitude"] },
  { id:"goa", name:"Goa", country:"India", gradient:"linear-gradient(150deg,#5A4F3E,#C2A878)",
    trust:86, exploring:67, updates:188, guides:18, save:false, follow:true,
    safety:"Safe · busy season", safetyLevel:"good",
    tagline:"Beaches, cafés and susegad — the easiest place to begin.",
    badges:["Great for Families","Backpacker Friendly","Nightlife"] },
  { id:"rishikesh", name:"Rishikesh", country:"India", gradient:"linear-gradient(150deg,#243A33,#6E8C7E)",
    trust:90, exploring:41, updates:121, guides:9, save:false, follow:false,
    safety:"Safe · solo-women friendly", safetyLevel:"good",
    tagline:"Yoga capital on the Ganga — calm, spiritual, walkable.",
    badges:["Safe for Solo Travellers","Solo Female Friendly","Wellness"] },
  { id:"jaisalmer", name:"Jaisalmer", country:"India", gradient:"linear-gradient(150deg,#6B5A38,#D4B483)",
    trust:84, exploring:31, updates:77, guides:14, save:false, follow:false,
    safety:"Safe · extreme heat midday", safetyLevel:"caution",
    tagline:"The golden city — forts, dunes and desert camps.",
    badges:["Great for Families","Budget Friendly"] },
  { id:"andaman", name:"Andaman", country:"India", gradient:"linear-gradient(150deg,#1B3A47,#5E97A8)",
    trust:89, exploring:15, updates:48, guides:7, save:false, follow:false,
    safety:"Safe · check ferry weather", safetyLevel:"good",
    tagline:"Turquoise water and quiet islands for divers and dreamers.",
    badges:["Great for Families","Safe for Solo Travellers"] },
];
const getDest = (id) => DESTINATIONS.find(d=>d.id===id) || DESTINATIONS[0];

// ── Live community feed (posts) ─────────────────────────────────────────────
const FEED_POSTS = [
  { id:1, user:"Aryan M.", avatar:"AM", score:92, destId:"spiti", location:"Spiti", category:"Food", time:"2h ago", expiry:"5 days", content:"Incredible Jain thali at Sharma Ji Ka Dhaba near the Kaza market. ₹180, no onion garlic, spotless kitchen. A must for Jain travellers passing through.", helpful:34, comments:7, verified:true },
  { id:2, user:"Priya S.", avatar:"PS", score:87, destId:"rishikesh", location:"Rishikesh", category:"Safety", time:"5h ago", expiry:"4 days", content:"Solo women — Lakshman Jhula is safe at night. Many cafes open till 11pm. Avoid the ghats after midnight. Beatles Café too crowded weekends — try Little Buddha instead.", helpful:61, comments:14, verified:true },
  { id:3, user:"Rahul K.", avatar:"RK", score:78, destId:"spiti", location:"Spiti", category:"Transport", time:"1h ago", expiry:"6 days", content:"Alert — small landslide near Losar on Kaza road. Take alternate route via Gramphoo. Roads otherwise clear. 8°C right now, carry warm layers.", helpful:89, comments:23, verified:false },
  { id:4, user:"Sneha V.", avatar:"SV", score:95, destId:"goa", location:"Goa", category:"Stay", time:"3h ago", expiry:"4 days", content:"Hidden gem — Bluebell Homestay in Assagao. ₹1,200/night, pure veg kitchen, rooftop garden. Book directly to avoid OTA fees.", helpful:47, comments:9, verified:true },
  { id:5, user:"Dev P.", avatar:"DP", score:83, destId:"bali", location:"Bali", category:"Weather", time:"6h ago", expiry:"1 day", content:"Ubud rainy each afternoon this week but mornings are gorgeous. Tegallalang rice terraces best before 9am — beat the crowds and the heat.", helpful:28, comments:5, verified:true },
];

// ── Stories (Instagram-style rail) ──────────────────────────────────────────
const STORIES = [
  { id:1, user:"You", avatar:"AK", own:true },
  { id:2, user:"Sneha", avatar:"SV", seen:false, destId:"goa" },
  { id:3, user:"Aryan", avatar:"AM", seen:false, destId:"spiti" },
  { id:4, user:"Meera", avatar:"MN", seen:false, destId:"rishikesh" },
  { id:5, user:"Dev", avatar:"DP", seen:true, destId:"bali" },
  { id:6, user:"Priya", avatar:"PS", seen:true, destId:"rishikesh" },
];

// ── Community activity (recent platform events) ─────────────────────────────
const COMMUNITY_ACTIVITY = [
  { id:1, icon:"BadgeCheck", text:"Little Buddha Café was Vegan-verified by 4 more travellers", time:"12m", color:"success" },
  { id:2, icon:"Users", text:"Goa Beach Trip pod filled its last 2 spots", time:"38m", color:"secondary" },
  { id:3, icon:"ShieldCheck", text:"Priya S. reached an Exemplary TrustScore of 95", time:"1h", color:"gold" },
  { id:4, icon:"MapPin", text:"7 new safety updates posted from Spiti Valley", time:"2h", color:"accent" },
];

// ── Pinterest-style collections ─────────────────────────────────────────────
const COLLECTIONS = [
  { id:1, title:"Himalayan Escapes", count:24, by:"Aryan M.", gradient:"linear-gradient(150deg,#1E2740,#5A6B96)" },
  { id:2, title:"Veg-friendly Bali", count:31, by:"Sneha V.", gradient:"linear-gradient(150deg,#1B3A47,#5E97A8)" },
  { id:3, title:"Desert Nights, Rajasthan", count:18, by:"Vikram S.", gradient:"linear-gradient(150deg,#6B5A38,#D4B483)" },
  { id:4, title:"Slow Mornings, Rishikesh", count:22, by:"Meera N.", gradient:"linear-gradient(150deg,#243A33,#6E8C7E)" },
];

// ── Restaurants — community verification counts per food type ───────────────
const RESTAURANTS = [
  { id:1, name:"Sharma Ji Ka Dhaba", destId:"spiti", location:"Spiti", types:["jain","pure_veg"], verifiedBy:{jain:18,pure_veg:24}, rating:4.8, reviews:234, tags:["No onion garlic","Separate kitchen","Jain thali"], distance:"0.3 km", lastVerified:"2 days ago", gradient:"linear-gradient(150deg,#1B263B,#5E7C99)" },
  { id:2, name:"Oasis Restaurant", destId:"jaisalmer", location:"Pushkar", types:["vegan","pure_veg"], verifiedBy:{vegan:12,pure_veg:9}, rating:4.6, reviews:189, tags:["100% Vegan","Organic","No dairy"], distance:"1.2 km", lastVerified:"5 days ago", gradient:"linear-gradient(150deg,#243A33,#6E8C7E)" },
  { id:3, name:"Little Buddha Café", destId:"rishikesh", location:"Rishikesh", types:["vegan","gluten","buddhist"], verifiedBy:{vegan:32,gluten:11,buddhist:6}, rating:4.9, reviews:412, tags:["Fully vegan","Gluten-free menu","Rooftop seating"], distance:"0.8 km", lastVerified:"1 day ago", gradient:"linear-gradient(150deg,#2E2C44,#6E6E96)" },
  { id:4, name:"Sai Kripa Restaurant", destId:"goa", location:"Coorg", types:["pure_veg","sattvic"], verifiedBy:{pure_veg:14,sattvic:8}, rating:4.5, reviews:156, tags:["South Indian","Sattvic menu","Thali specials"], distance:"2.1 km", lastVerified:"3 days ago", gradient:"linear-gradient(150deg,#1E2E2C,#5E847E)" },
  { id:5, name:"Natraj Dining Hall", destId:"jaisalmer", location:"Jaisalmer", types:["jain","pure_veg","sattvic"], verifiedBy:{jain:21,pure_veg:17,sattvic:5}, rating:4.7, reviews:298, tags:["Jain thali","No root veg","Rajasthani"], distance:"0.5 km", lastVerified:"4 days ago", gradient:"linear-gradient(150deg,#6B5A38,#D4B483)" },
  { id:6, name:"Green Bowl Café", destId:"goa", location:"Goa", types:["vegan","gluten"], verifiedBy:{vegan:15,gluten:7}, rating:4.4, reviews:103, tags:["Plant-based","Açaí bowls","Fresh juices"], distance:"1.5 km", lastVerified:"6 days ago", gradient:"linear-gradient(150deg,#5A4F3E,#C2A878)" },
  { id:7, name:"Al-Raheem Kitchen", destId:"bali", location:"Hyderabad", types:["halal","everything"], verifiedBy:{halal:29}, rating:4.7, reviews:521, tags:["Halal certified","Biryani","Family dining"], distance:"0.9 km", lastVerified:"1 day ago", gradient:"linear-gradient(150deg,#1B3A47,#5E97A8)" },
  { id:8, name:"Ananda Satvik Kitchen", destId:"rishikesh", location:"Varanasi", types:["sattvic","pure_veg","jain"], verifiedBy:{sattvic:13,pure_veg:11,jain:9}, rating:4.8, reviews:167, tags:["No onion/garlic","Sattvic thali","Ayurvedic"], distance:"0.6 km", lastVerified:"3 days ago", gradient:"linear-gradient(150deg,#3A2E3A,#9A7E8E)" },
];

// ── TripPods — human, trust-rich companion groups ───────────────────────────
const PODS = [
  { id:1, destId:"spiti", destination:"Spiti Valley", dates:"Oct 10–17", duration:"7 days", budget:"₹12,000", spots:2, size:5,
    host:"Aryan M.", hostAvatar:"AM", score:92, podRating:4.9, pastPods:6, style:"Adventure", verified:true, compatibility:87,
    intro:"Hey! I've done this circuit twice. Looking for an easy-going crew who love early starts and big mountains.",
    voice:"0:18 voice intro", interests:["Photography","Hiking","Backpacking"],
    description:"Epic Spiti circuit — Kaza, Key Monastery, Chandratal Lake. Calm pace, lots of chai stops.",
    gradient:"linear-gradient(150deg,#1E2740,#5A6B96)", groupFoods:["jain","pure_veg"] },
  { id:2, destId:"goa", destination:"Goa Beach Trip", dates:"Nov 1–5", duration:"4 days", budget:"₹8,000", spots:3, size:6,
    host:"Sneha V.", hostAvatar:"SV", score:95, podRating:5.0, pastPods:11, style:"Friends", verified:true, compatibility:92,
    intro:"North Goa, sunsets and good food. Mixed-diet group, everyone's welcome — we always find places for all of us.",
    voice:"0:24 voice intro", interests:["Food Exploration","Photography","Nightlife"],
    description:"North Goa beaches, café-hopping, sunset vibes. Chill group, flexible plans.",
    gradient:"linear-gradient(150deg,#5A4F3E,#C2A878)", groupFoods:["vegan","everything","pure_veg"] },
  { id:3, destId:"andaman", destination:"Andaman Islands", dates:"Dec 20–28", duration:"8 days", budget:"₹18,000", spots:1, size:4,
    host:"Dev P.", hostAvatar:"DP", score:83, podRating:4.6, pastPods:3, style:"Adventure", verified:false, compatibility:74,
    intro:"Havelock, Neil Island, scuba. Looking for one calm ocean-lover to round out the group.",
    voice:"0:15 voice intro", interests:["Adventure","Nature","Photography"],
    description:"Diving, island-hopping, slow evenings. One spot left.",
    gradient:"linear-gradient(150deg,#1B3A47,#5E97A8)", groupFoods:["everything","halal"] },
  { id:4, destId:"jaisalmer", destination:"Udaipur & Jaisalmer", dates:"Oct 25–29", duration:"4 days", budget:"₹9,500", spots:2, size:5,
    host:"Priya S.", hostAvatar:"PS", score:87, podRating:4.8, pastPods:5, style:"Cultural", verified:true, compatibility:81,
    intro:"Lakes, palaces, bazaars and a desert night. Jain & sattvic food sorted throughout the route.",
    voice:"0:21 voice intro", interests:["Culture","Photography","Food Exploration"],
    description:"Heritage cities at a relaxed pace, with a desert camp finale.",
    gradient:"linear-gradient(150deg,#3A2E3A,#9A7E8E)", groupFoods:["jain","sattvic"] },
];

const GUIDES = [
  { id:1, name:"Vikram Singh", destId:"jaisalmer", location:"Jaisalmer", speciality:"Desert & Heritage", languages:["Hindi","English"], rating:4.9, reviews:312, price:"₹1,200/day", score:94, verified:true, tags:["Desert safari","Fort tours","Camel trek"], gradient:"linear-gradient(150deg,#6B5A38,#D4B483)" },
  { id:2, name:"Meera Nair", destId:"rishikesh", location:"Munnar", speciality:"Nature & Tea Estates", languages:["Malayalam","English","Tamil"], rating:4.8, reviews:189, price:"₹900/day", score:91, verified:true, tags:["Tea estate walks","Bird watching","Waterfalls"], gradient:"linear-gradient(150deg,#1E2E2C,#5E847E)" },
  { id:3, name:"Arjun Thapa", destId:"spiti", location:"Manali", speciality:"Trekking & Adventure", languages:["Hindi","English","Nepali"], rating:4.7, reviews:245, price:"₹1,500/day", score:88, verified:true, tags:["High altitude treks","Camping","Snow routes"], gradient:"linear-gradient(150deg,#1B263B,#5E7C99)" },
  { id:4, name:"Fatima Khan", destId:"bali", location:"Agra", speciality:"History & Heritage", languages:["Hindi","English","Urdu"], rating:4.9, reviews:421, price:"₹800/day", score:96, verified:true, tags:["Heritage walks","History","Photography spots"], gradient:"linear-gradient(150deg,#3A2E3A,#9A7E8E)" },
];

const FAMILY_MEMBERS = [
  { id:1, name:"Maa", relation:"Mother", avatar:"MA", location:"Manali", lastSeen:"10 min ago", status:"active", trip:"Manali Trip", checkins:3 },
  { id:2, name:"Papa", relation:"Father", avatar:"PA", location:"Delhi", lastSeen:"2 hrs ago", status:"home", trip:null, checkins:0 },
];

// ── Author verification map (badges beside usernames everywhere) ────────────
const USER_VERIFY = {
  "Aryan M.":["email","phone","digilocker","frequent"],
  "Priya S.":["email","phone","digilocker","govt","premium"],
  "Rahul K.":["email","phone"],
  "Sneha V.":["email","phone","digilocker","frequent","premium"],
  "Dev P.":["email","phone","frequent"],
  "Meera N.":["email","phone","digilocker","govt"],
  "Vikram Singh":["email","phone","digilocker","govt","frequent"],
  "Meera Nair":["email","phone","digilocker","govt"],
  "Arjun Thapa":["email","phone","digilocker","frequent"],
  "Fatima Khan":["email","phone","digilocker","govt","premium"],
};
const USER_PREMIUM = ["Priya S.","Sneha V.","Fatima Khan"];
const getVerify = (name) => USER_VERIFY[name] || ["email"];

// ── Live community counter (Home) ───────────────────────────────────────────
const COMMUNITY_COUNTER = [
  { icon:"Users",    value:"12,842", label:"travellers exploring right now" },
  { icon:"Compass",  value:"483",    label:"active trips today" },
  { icon:"MapPin",   value:"1,024",  label:"destination updates this week" },
];

// ── Traveller stories (full cards) ──────────────────────────────────────────
const STORY_FEED = [
  { id:1, user:"Sneha V.", avatar:"SV", destId:"goa", place:"Assagao, Goa", title:"Three slow mornings in North Goa", excerpt:"Coffee at Bluebell, a scooter, and absolutely no plans. The susegad life is real.", likes:312, gradient:"linear-gradient(150deg,#5A4F3E,#C2A878)" },
  { id:2, user:"Aryan M.", avatar:"AM", destId:"spiti", place:"Kaza, Spiti", title:"The road to Chandratal nearly broke us", excerpt:"14,100 ft, no signal, the bluest lake I've ever seen. Worth every bone-rattling hour.", likes:489, gradient:"linear-gradient(150deg,#1E2740,#5A6B96)" },
];

// ── Hotels (Explore · Full Vision) ──────────────────────────────────────────
const HOTELS = [
  { id:1, name:"Bluebell Homestay", destId:"goa", location:"Assagao, Goa", price:"₹1,200", rating:4.8, reviews:142, traits:["Solo Female Friendly","Family Friendly"], gradient:"linear-gradient(150deg,#5A4F3E,#C2A878)" },
  { id:2, name:"The Himalayan Nest", destId:"spiti", location:"Kaza, Spiti", price:"₹1,800", rating:4.7, reviews:88, traits:["Backpacker Friendly","Solo Female Friendly"], gradient:"linear-gradient(150deg,#1E2740,#5A6B96)" },
  { id:3, name:"Ganga View Retreat", destId:"rishikesh", location:"Tapovan, Rishikesh", price:"₹2,400", rating:4.9, reviews:203, traits:["Family Friendly","Wellness"], gradient:"linear-gradient(150deg,#243A33,#6E8C7E)" },
];

// ── Experiences (Explore · Full Vision) ─────────────────────────────────────
const EXPERIENCES = [
  { id:1, name:"Sunrise kayak on the Ganga", destId:"rishikesh", host:"Meera N.", price:"₹600", rating:4.9, duration:"2 hrs", gradient:"linear-gradient(150deg,#243A33,#6E8C7E)" },
  { id:2, name:"Desert camp & folk night", destId:"jaisalmer", host:"Vikram S.", price:"₹1,500", rating:4.8, duration:"Overnight", gradient:"linear-gradient(150deg,#6B5A38,#D4B483)" },
  { id:3, name:"Rice-terrace cycle tour", destId:"bali", host:"Wayan G.", price:"₹900", rating:4.9, duration:"Half day", gradient:"linear-gradient(150deg,#1B3A47,#5E97A8)" },
];

// ── Ask Travellers (Reddit-style Q&A) ───────────────────────────────────────
const QUESTIONS = [
  { id:1, q:"Best cafés in Bali for working remotely?", by:"Nikhil R.", avatar:"NR", time:"3h", answers:14, upvotes:42, tags:["Bali","Cafés"], top:"Crate in Canggu has fast wifi + great coffee. Outpost Ubud if you want a proper co-working vibe." },
  { id:2, q:"Is Goa safe for solo female travellers in December?", by:"Aditi M.", avatar:"AM", time:"6h", answers:23, upvotes:88, tags:["Goa","Safety","Solo"], top:"Yes — North Goa is busy and well-lit. Stick to Assagao/Anjuna, pre-book cabs at night, you'll be great." },
  { id:3, q:"Vegetarian food in Bangkok that isn't just fried rice?", by:"Karan P.", avatar:"KP", time:"1d", answers:9, upvotes:31, tags:["Bangkok","Food","Veg"], top:"May Veggie Home and Broccoli Revolution are incredible. Look for the 'J' (เจ) sign for pure veg." },
  { id:4, q:"Hidden gems in Thailand away from the crowds?", by:"Sara T.", avatar:"ST", time:"2d", answers:17, upvotes:56, tags:["Thailand","Offbeat"], top:"Koh Mak and Nan province. Barely any tourists, incredibly kind locals, untouched beaches." },
];

// ── Notifications (bell) ────────────────────────────────────────────────────
const NOTIFICATIONS = [
  { id:1, icon:"UserPlus", text:"Sneha V. requested to join your Spiti pod", time:"8m", unread:true, color:"secondary" },
  { id:2, icon:"Heart", text:"Priya S. and 23 others liked your Goa story", time:"40m", unread:true, color:"danger" },
  { id:3, icon:"BadgeCheck", text:"Your DigiLocker verification was approved", time:"2h", unread:true, color:"success" },
  { id:4, icon:"MessageCircle", text:"New message in “Goa Beach Trip” group chat", time:"5h", unread:false, color:"accent" },
  { id:5, icon:"Sparkles", text:"Your AI itinerary for Rishikesh is ready", time:"1d", unread:false, color:"gold" },
];

// ── TripPod: match requests, chats, events ──────────────────────────────────
const MATCH_REQUESTS = [
  { id:1, name:"Rohan D.", avatar:"RD", score:90, pod:"Spiti Valley", compatibility:88, foods:["pure_veg"], dir:"incoming" },
  { id:2, name:"Ishita B.", avatar:"IB", score:84, pod:"Spiti Valley", compatibility:79, foods:["jain"], dir:"incoming" },
  { id:3, name:"Goa Beach Trip", avatar:"SV", score:95, pod:"Hosted by Sneha V.", compatibility:92, foods:["vegan"], dir:"outgoing", status:"Pending" },
];
const GROUP_CHATS = [
  { id:1, name:"Spiti Valley Crew", members:5, last:"Aryan: carry an extra power bank, no charging at Chandratal", time:"12m", unread:3, gradient:"linear-gradient(150deg,#1E2740,#5A6B96)" },
  { id:2, name:"Goa Beach Trip", members:6, last:"Sneha: dinner at Thalassa on the 2nd, booked!", time:"1h", unread:0, gradient:"linear-gradient(150deg,#5A4F3E,#C2A878)" },
];
const EVENTS = [
  { id:1, title:"Travellers' Meetup, Rishikesh", date:"Sat 14 Jun · 6 PM", going:34, place:"Little Buddha Café", gradient:"linear-gradient(150deg,#243A33,#6E8C7E)" },
  { id:2, title:"Full-moon beach cleanup", date:"Sun 22 Jun · 5 PM", going:58, place:"Vagator Beach, Goa", gradient:"linear-gradient(150deg,#5A4F3E,#C2A878)" },
];

// ── Creator profiles (Full Vision) ──────────────────────────────────────────
const CREATORS = [
  { id:1, name:"Sneha V.", avatar:"SV", type:"Creator", followers:"24.1k", countries:9, trust:95, bio:"Slow travel + vegetarian food across India. Sharing the susegad life.", gradient:"linear-gradient(150deg,#5A4F3E,#C2A878)" },
  { id:2, name:"Vikram Singh", avatar:"VS", type:"Local Guide", followers:"8.4k", countries:1, trust:94, bio:"Born in Jaisalmer. Desert safaris, fort stories, and the best kachori in Rajasthan.", gradient:"linear-gradient(150deg,#6B5A38,#D4B483)" },
];

Object.assign(window, { DESTINATIONS, getDest, FEED_POSTS, STORIES, STORY_FEED, COMMUNITY_ACTIVITY, COMMUNITY_COUNTER, COLLECTIONS, RESTAURANTS, PODS, GUIDES, FAMILY_MEMBERS, HOTELS, EXPERIENCES, QUESTIONS, NOTIFICATIONS, MATCH_REQUESTS, GROUP_CHATS, EVENTS, CREATORS, USER_VERIFY, USER_PREMIUM, getVerify });
