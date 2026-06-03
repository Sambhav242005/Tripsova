// TRIPOVA — UI chrome translations. Plain JS global.
// Brand/product names (Tripova, PureFind, Pods) are NOT localised.
// Content (posts, names, places) stays in source language — only chrome translates.
const TRANSLATIONS = {
  "English": {},
  "हिंदी": {
    "Explore":"खोज", "Plan":"योजना", "More":"अधिक",
    "Explore more. Live stories.":"और खोजें। कहानियाँ जिएँ।",
    "Search any destination...":"कोई भी गंतव्य खोजें...",
    "Search restaurant or city...":"रेस्तरां या शहर खोजें...",
    "Live Destinations":"लाइव गंतव्य", "Live Updates":"लाइव अपडेट",
    "Helpful":"सहायक", "Reply":"जवाब",
    "Trip Builder":"यात्रा योजना", "Local Guides":"स्थानीय गाइड",
    "Family Circle":"परिवार मंडल", "Budget Tracker":"बजट ट्रैकर",
    "Offline Maps":"ऑफ़लाइन मानचित्र", "Profile":"प्रोफ़ाइल", "Language":"भाषा",
  },
  "தமிழ்": {
    "Explore":"ஆராய்", "Plan":"திட்டம்", "More":"மேலும்",
    "Explore more. Live stories.":"மேலும் ஆராயுங்கள். கதைகளை வாழுங்கள்.",
    "Search any destination...":"எந்த இடத்தையும் தேடுங்கள்...",
    "Search restaurant or city...":"உணவகம் அல்லது நகரம்...",
    "Live Destinations":"நேரடி இடங்கள்", "Live Updates":"நேரடி புதுப்பிப்புகள்",
    "Helpful":"பயனுள்ளது", "Reply":"பதில்",
    "Trip Builder":"பயணத் திட்டம்", "Local Guides":"உள்ளூர் வழிகாட்டிகள்",
    "Family Circle":"குடும்ப வட்டம்", "Budget Tracker":"பட்ஜெட் கண்காணிப்பு",
    "Offline Maps":"ஆஃப்லைன் வரைபடங்கள்", "Profile":"சுயவிவரம்", "Language":"மொழி",
  },
  "বাংলা": {
    "Explore":"অন্বেষণ", "Plan":"পরিকল্পনা", "More":"আরও",
    "Explore more. Live stories.":"আরও অন্বেষণ করুন। গল্প বাঁচুন।",
    "Search any destination...":"যেকোনো গন্তব্য খুঁজুন...",
    "Search restaurant or city...":"রেস্তোরাঁ বা শহর খুঁজুন...",
    "Live Destinations":"লাইভ গন্তব্য", "Live Updates":"লাইভ আপডেট",
    "Helpful":"সহায়ক", "Reply":"উত্তর",
    "Trip Builder":"ট্রিপ পরিকল্পনা", "Local Guides":"স্থানীয় গাইড",
    "Family Circle":"পরিবার বৃত্ত", "Budget Tracker":"বাজেট ট্র্যাকার",
    "Offline Maps":"অফলাইন মানচিত্র", "Profile":"প্রোফাইল", "Language":"ভাষা",
  },
  "मराठी": {
    "Explore":"शोधा", "Plan":"योजना", "More":"अधिक",
    "Explore more. Live stories.":"अधिक शोधा. गोष्टी जगा.",
    "Search any destination...":"कोणतेही ठिकाण शोधा...",
    "Search restaurant or city...":"रेस्टॉरंट किंवा शहर शोधा...",
    "Live Destinations":"थेट ठिकाणे", "Live Updates":"थेट अपडेट",
    "Helpful":"उपयुक्त", "Reply":"उत्तर",
    "Trip Builder":"सहल नियोजन", "Local Guides":"स्थानिक मार्गदर्शक",
    "Family Circle":"कुटुंब मंडळ", "Budget Tracker":"बजेट ट्रॅकर",
    "Offline Maps":"ऑफलाइन नकाशे", "Profile":"प्रोफाइल", "Language":"भाषा",
  },
  "العربية": {
    "Explore":"استكشف", "Plan":"خطط", "More":"المزيد",
    "Explore more. Live stories.":"استكشف أكثر. عش القصص.",
    "Search any destination...":"ابحث عن أي وجهة...",
    "Search restaurant or city...":"ابحث عن مطعم أو مدينة...",
    "Live Destinations":"وجهات مباشرة", "Live Updates":"تحديثات مباشرة",
    "Helpful":"مفيد", "Reply":"رد",
    "Trip Builder":"مخطط الرحلة", "Local Guides":"مرشدون محليون",
    "Family Circle":"دائرة العائلة", "Budget Tracker":"متتبع الميزانية",
    "Offline Maps":"خرائط دون اتصال", "Profile":"الملف الشخصي", "Language":"اللغة",
  },
};
// Reads the dict App publishes each render; falls back to the English source key.
const T = (key) => (window.__TR && window.__TR[key]) || key;

Object.assign(window, { TRANSLATIONS, T });
