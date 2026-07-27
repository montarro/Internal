'use strict';

/*
 * Aymen's News frontend.
 * Talks to /api/news, renders article cards (every card gets the same large
 * photo treatment), and manages topic chips, the channel picker, the keyword
 * filter, the EN/FR/AR language switch and liked/saved articles (stored in
 * the browser so they persist and act as recommendations next time).
 */

const API = '/api/news';
const LANGS = ['en', 'fr', 'ar'];
const LIKES_KEY = 'aymen_likes_v1';
const READ_KEY = 'aymen_read_v1';

// UI translations. The language-switch buttons themselves stay Latin (EN/FR/AR)
// so the reader can always find their way back to English.
const I18N = {
  en: {
    tagline: "What's happening today",
    placeholder: 'Add a keyword (e.g. election, football, energy)…',
    refresh: 'Refresh', loading: 'Loading…', saved: 'Saved',
    channel: 'Channel', allChannels: 'All channels',
    clearFilters: 'Clear filters',
    noMatchTitle: 'No matching headlines',
    noMatchKeyword: (k) => `Nothing found for “${k}”. Try a broader keyword or add more topics.`,
    noTopic: 'Select at least one topic above to build your feed.',
    errTitle: 'Could not load the news',
    errHint: "The news service didn't respond. Give it a moment and try again.",
    retry: 'Try again',
    savedEmptyTitle: 'No saved articles yet',
    savedEmptyHint: 'Tap the heart on any headline to save it here for next time.',
    headline: (n) => `${n} headline${n === 1 ? '' : 's'}`,
    savedCount: (n) => `${n} saved`,
    updated: 'Updated',
    updatedAt: (s) => `Updated ${s}`,
    yourLocation: 'Your location',
    weatherUnavailable: "Weather isn't available right now.",
    tryAgainSoon: 'Try again soon.',
    loadingWeather: 'Loading weather…',
    readAloud: 'Read this aloud',
    stopReading: 'Stop reading',
    greetingMorning: 'Good morning, Aymen 👋',
    greetingAfternoon: 'Good afternoon, Aymen 👋',
    greetingEvening: 'Good evening, Aymen 👋',
  },
  fr: {
    tagline: "L'actualité du jour",
    placeholder: 'Ajouter un mot-clé (ex. élection, football, énergie)…',
    refresh: 'Actualiser', loading: 'Chargement…', saved: 'Enregistrés',
    channel: 'Chaîne', allChannels: 'Toutes les chaînes',
    clearFilters: 'Effacer les filtres',
    noMatchTitle: 'Aucun titre correspondant',
    noMatchKeyword: (k) => `Rien trouvé pour « ${k} ». Essayez un mot-clé plus large ou ajoutez des sujets.`,
    noTopic: 'Sélectionnez au moins un sujet ci-dessus.',
    errTitle: 'Impossible de charger les actualités',
    errHint: "Le service n'a pas répondu. Patientez un instant puis réessayez.",
    retry: 'Réessayer',
    savedEmptyTitle: 'Aucun article enregistré',
    savedEmptyHint: 'Touchez le cœur sur un titre pour l’enregistrer ici.',
    headline: (n) => `${n} titre${n === 1 ? '' : 's'}`,
    savedCount: (n) => `${n} enregistré${n === 1 ? '' : 's'}`,
    updated: 'Mis à jour',
    updatedAt: (s) => `Mis à jour ${s}`,
    yourLocation: 'Votre position',
    weatherUnavailable: "La météo n'est pas disponible pour le moment.",
    tryAgainSoon: 'Réessayez bientôt.',
    loadingWeather: 'Chargement de la météo…',
    readAloud: 'Lire à voix haute',
    stopReading: 'Arrêter la lecture',
    greetingMorning: 'Bonjour, Aymen 👋',
    greetingAfternoon: 'Bon après-midi, Aymen 👋',
    greetingEvening: 'Bonsoir, Aymen 👋',
  },
  ar: {
    tagline: 'أخبار اليوم',
    placeholder: 'أضف كلمة مفتاحية (مثال: انتخابات، كرة القدم، طاقة)…',
    refresh: 'تحديث', loading: 'جارٍ التحميل…', saved: 'المحفوظة',
    channel: 'القناة', allChannels: 'كل القنوات',
    clearFilters: 'مسح عوامل التصفية',
    noMatchTitle: 'لا توجد عناوين مطابقة',
    noMatchKeyword: (k) => `لا نتائج عن «${k}». جرّب كلمة أعمّ أو أضف مواضيع.`,
    noTopic: 'اختر موضوعًا واحدًا على الأقل بالأعلى.',
    errTitle: 'تعذّر تحميل الأخبار',
    errHint: 'لم يستجب الخادم. انتظر لحظة ثم أعد المحاولة.',
    retry: 'إعادة المحاولة',
    savedEmptyTitle: 'لا مقالات محفوظة بعد',
    savedEmptyHint: 'اضغط على القلب في أي عنوان لحفظه هنا للمرة القادمة.',
    headline: (n) => `${n} عنوان`,
    savedCount: (n) => `${n} محفوظ`,
    updated: 'آخر تحديث',
    updatedAt: (s) => `آخر تحديث ${s}`,
    yourLocation: 'موقعك',
    weatherUnavailable: 'تعذّر عرض حالة الطقس الآن.',
    tryAgainSoon: 'أعد المحاولة بعد قليل.',
    loadingWeather: 'جارٍ تحميل حالة الطقس…',
    readAloud: 'اقرأ هذا بصوت عالٍ',
    stopReading: 'إيقاف القراءة',
    greetingMorning: 'صباح الخير يا أيمن 👋',
    greetingAfternoon: 'طاب يومك يا أيمن 👋',
    greetingEvening: 'مساء الخير يا أيمن 👋',
  },
};

// ---------------------------------------------------------------------------
// Quote of the day — a fixed local list per language (no API/key needed).
// Picked deterministically from the local calendar date, so it stays the
// same all day and changes the next day. Kept simple and concrete on
// purpose: no metaphors, religion, politics, or pressure-based phrasing.
// ---------------------------------------------------------------------------

const QUOTES = {
  en: [
    'Take things one step at a time.',
    'You are doing better than you think.',
    'A calm day can still be a good day.',
    'Small progress still matters.',
    'It is okay to take your time.',
    'You do not have to be perfect today.',
    'Rest is part of doing well.',
    'One small step counts.',
    'You are allowed to go at your own pace.',
    'Today can be simple and that is fine.',
    'It is okay to ask for help.',
    'You handled today, and that is enough.',
    'Quiet moments can be good moments.',
    'You are learning, and that takes time.',
    'Doing a little is still doing something.',
    'It is fine to take breaks.',
    'You are not behind. You are on your own path.',
    'A slow day is still a real day.',
    'You are allowed to feel however you feel.',
    'Small wins are still wins.',
    'You do not need to rush.',
    'Today is a new day.',
    'You showed up today, and that matters.',
    'It is okay if today was hard.',
    'Being kind to yourself is a good choice.',
    'You are trying, and that counts.',
    'One thing at a time is enough.',
    'You are safe to go slowly.',
    'Comfort is important too.',
    'You get to decide what feels okay for you.',
    'It is okay to repeat things you like.',
    'Familiar things can feel good.',
    'You are allowed to take breaks whenever you need.',
    'Every day does not need to be exciting to be good.',
    'You are doing okay.',
    'It is fine to do things your own way.',
    'Small steps still move you forward.',
    'You can go at whatever speed feels right.',
    'Today only needs to be today.',
    'You are allowed to rest without a reason.',
    'Simple days can still be good days.',
    'You are enough just as you are.',
    'It is okay to need time to adjust.',
    'You do not have to explain your feelings to anyone.',
    'Taking care of yourself is important.',
    'You are allowed to say what you need.',
    'A quiet win is still a win.',
    'You can be proud of small things.',
    'It is okay to go at your own rhythm.',
    'You are doing your best, and that is enough.',
    'It is okay to feel calm, and that is nice.',
    'You get to choose what makes today good.',
    'You are allowed to like what you like.',
    'Today can be a gentle day.',
    'You are capable, even on slow days.',
    'It is okay to take things slowly today.',
    'You are not alone in how you feel.',
    'One good moment can make a day better.',
    'You are allowed to be exactly where you are.',
    'Small comforts matter too.',
  ],
  fr: [
    'Va à ton rythme, une étape à la fois.',
    'Tu fais mieux que tu ne le penses.',
    'Une journée calme peut quand même être une bonne journée.',
    'Un petit progrès compte aussi.',
    'Tu peux prendre ton temps.',
    "Tu n'as pas besoin d'être parfait aujourd'hui.",
    'Se reposer, c’est aussi bien faire.',
    'Un petit pas compte.',
    "Tu as le droit d'avancer à ton rythme.",
    'Une journée simple, c’est très bien aussi.',
    "Tu peux demander de l'aide.",
    "Tu as traversé aujourd'hui, et c'est suffisant.",
    'Les moments calmes peuvent être de bons moments.',
    'Tu apprends, et cela prend du temps.',
    'Faire un peu, c’est déjà faire quelque chose.',
    'Tu peux faire des pauses.',
    "Tu n'es pas en retard. Tu suis ton propre chemin.",
    'Une journée lente reste une vraie journée.',
    'Tu as le droit de ressentir ce que tu ressens.',
    'Les petites victoires comptent aussi.',
    "Tu n'as pas besoin de te presser.",
    "Aujourd'hui est un nouveau jour.",
    "Tu es venu aujourd'hui, et cela compte.",
    "C'est normal si aujourd'hui a été difficile.",
    'Être gentil avec toi-même est un bon choix.',
    'Tu essaies, et cela compte.',
    'Une chose à la fois, c’est suffisant.',
    'Tu peux avancer lentement, en toute sécurité.',
    'Le confort compte aussi.',
    'Tu décides de ce qui te convient.',
    'Tu peux refaire les choses que tu aimes.',
    'Les choses familières peuvent faire du bien.',
    "Tu peux faire une pause quand tu en as besoin.",
    "Chaque jour n'a pas besoin d'être excitant pour être bon.",
    'Tu vas bien.',
    'C’est bien de faire les choses à ta façon.',
    'Les petits pas te font quand même avancer.',
    'Tu peux avancer à la vitesse qui te convient.',
    "Aujourd'hui n'a besoin que d'être aujourd'hui.",
    'Tu peux te reposer sans raison particulière.',
    'Les journées simples peuvent aussi être bonnes.',
    'Tu es suffisant tel que tu es.',
    "C'est normal d'avoir besoin de temps pour s'adapter.",
    "Tu n'as pas à expliquer tes sentiments à personne.",
    'Prendre soin de toi est important.',
    'Tu peux dire ce dont tu as besoin.',
    'Une petite victoire reste une victoire.',
    'Tu peux être fier des petites choses.',
    "C'est bien d'avancer à ton propre rythme.",
    'Tu fais de ton mieux, et cela suffit.',
    'C’est agréable de se sentir calme.',
    'Tu choisis ce qui rend ta journée bonne.',
    "Tu as le droit d'aimer ce que tu aimes.",
    "Aujourd'hui peut être une journée douce.",
    'Tu es capable, même les jours plus lents.',
    "Tu peux prendre les choses doucement aujourd'hui.",
    'Tu n’es pas seul dans ce que tu ressens.',
    'Un bon moment peut améliorer une journée.',
    'Tu as le droit d’être exactement où tu es.',
    'Les petits conforts comptent aussi.',
  ],
  ar: [
    'خذ الأمور خطوة بخطوة.',
    'أنت تقوم بعمل أفضل مما تظن.',
    'يوم هادئ يمكن أن يكون يومًا جيدًا أيضًا.',
    'التقدم البسيط مهم أيضًا.',
    'لا بأس أن تأخذ وقتك.',
    'لست بحاجة لأن تكون مثاليًا اليوم.',
    'الراحة جزء من النجاح.',
    'كل خطوة صغيرة مهمة.',
    'من حقك أن تسير بالسرعة التي تناسبك.',
    'يوم بسيط يكفي، ولا بأس بذلك.',
    'لا بأس أن تطلب المساعدة.',
    'أنجزت يومك، وهذا يكفي.',
    'اللحظات الهادئة يمكن أن تكون لحظات جيدة.',
    'أنت تتعلم، وهذا يحتاج وقتًا.',
    'فعل القليل هو فعل شيء بالفعل.',
    'لا بأس أن تأخذ استراحة.',
    'لست متأخرًا، أنت تسير في طريقك الخاص.',
    'اليوم الهادئ يبقى يومًا حقيقيًا.',
    'من حقك أن تشعر بما تشعر به.',
    'الإنجازات الصغيرة مهمة أيضًا.',
    'لا داعي للاستعجال.',
    'اليوم يوم جديد.',
    'حضورك اليوم أمر مهم.',
    'لا بأس إن كان اليوم صعبًا.',
    'أن تكون لطيفًا مع نفسك خيار جيد.',
    'أنت تحاول، وهذا يكفي.',
    'شيء واحد في كل مرة يكفي.',
    'من حقك أن تتقدم ببطء وبأمان.',
    'الراحة مهمة أيضًا.',
    'أنت من يقرر ما يناسبك.',
    'لا بأس أن تكرر ما تحب.',
    'الأشياء المألوفة قد تشعرك بالراحة.',
    'لك أن تأخذ استراحة متى احتجت.',
    'لا يلزم أن يكون كل يوم مثيرًا ليكون جيدًا.',
    'أنت بخير.',
    'لا بأس أن تفعل الأمور بطريقتك.',
    'الخطوات الصغيرة تقدّمك أيضًا.',
    'يمكنك التقدم بالسرعة التي تناسبك.',
    'يكفي أن يكون اليوم يومًا عاديًا.',
    'من حقك أن ترتاح دون سبب.',
    'الأيام البسيطة يمكن أن تكون جيدة أيضًا.',
    'أنت كافٍ كما أنت.',
    'لا بأس أن تحتاج وقتًا للتأقلم.',
    'لست مضطرًا لشرح مشاعرك لأحد.',
    'الاعتناء بنفسك أمر مهم.',
    'من حقك أن تقول ما تحتاجه.',
    'الإنجاز الصغير يبقى إنجازًا.',
    'يمكنك أن تفتخر بالأشياء الصغيرة.',
    'لا بأس أن تسير على إيقاعك الخاص.',
    'تبذل قصارى جهدك، وهذا يكفي.',
    'من الجميل أن تشعر بالهدوء.',
    'أنت من يختار ما يجعل يومك جيدًا.',
    'من حقك أن تحب ما تحب.',
    'يمكن أن يكون اليوم يومًا لطيفًا.',
    'أنت قادر، حتى في الأيام البطيئة.',
    'يمكنك أخذ الأمور ببطء اليوم.',
    'لست وحدك فيما تشعر به.',
    'لحظة جيدة واحدة قد تُحسّن يومك.',
    'من حقك أن تكون بالضبط حيث أنت.',
    'الراحة الصغيرة مهمة أيضًا.',
  ],
};

function greetingKey() {
  try {
    const h = new Date().getHours();
    if (h < 12) return 'greetingMorning';
    if (h < 18) return 'greetingAfternoon';
    return 'greetingEvening';
  } catch {
    return 'greetingMorning';
  }
}

function renderGreeting() {
  const text = t()[greetingKey()] || t().greetingMorning;
  if (els.greetingText.textContent !== text) els.greetingText.textContent = text;
}

// Day-of-year in the visitor's local timezone, so the quote changes at local
// midnight and stays put for the rest of the calendar day.
function quoteIndexForToday() {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / 86400000);
    return dayOfYear;
  } catch {
    return 0;
  }
}

function renderQuote() {
  const list = QUOTES[lang] || QUOTES.en;
  const idx = ((quoteIndexForToday() % list.length) + list.length) % list.length;
  els.quoteBody.textContent = list[idx] || QUOTES.en[0];
}

// ---------------------------------------------------------------------------
// Weather — simple, concrete, plain-language, with a "read aloud" option.
// Fetched straight from the browser (Open-Meteo + BigDataCloud, both free
// and keyless) so there's no server dependency; falls back quietly to Tunis
// if location access is denied or unavailable — no alarming error shown.
// ---------------------------------------------------------------------------

const TUNIS_COORDS = { lat: 36.8065, lon: 10.1815 };
const WEATHER_TUNIS_LABEL = { en: 'Tunis, Tunisia', fr: 'Tunis, Tunisie', ar: 'تونس العاصمة، تونس' };

// WMO weather codes grouped into a handful of concrete, everyday buckets.
const WEATHER_CODE_BUCKET = {
  0: 'sunny',
  1: 'partlyCloudy', 2: 'partlyCloudy',
  3: 'cloudy',
  45: 'foggy', 48: 'foggy',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'drizzle', 57: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain', 80: 'rain', 81: 'rain', 82: 'rain',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow', 85: 'snow', 86: 'snow',
  95: 'storm', 96: 'storm', 99: 'storm',
};

const WEATHER_ICON = {
  sunny: '☀️', partlyCloudy: '⛅', cloudy: '☁️', foggy: '🌫️',
  drizzle: '🌦️', rain: '🌧️', snow: '❄️', storm: '⛈️',
};

const WEATHER_TEXT = {
  en: {
    sunny: { label: 'Sunny', tip: 'You may want sunglasses.' },
    partlyCloudy: { label: 'Partly cloudy', tip: 'A light jacket should be fine.' },
    cloudy: { label: 'Cloudy', tip: 'A calm, cloudy day.' },
    foggy: { label: 'Foggy', tip: 'Take care if you go outside.' },
    drizzle: { label: 'Light rain', tip: 'Bring an umbrella.' },
    rain: { label: 'Rainy', tip: 'Bring an umbrella and a coat.' },
    snow: { label: 'Snowy', tip: 'Wear a warm coat.' },
    storm: { label: 'Stormy', tip: 'It may be best to stay inside.' },
  },
  fr: {
    sunny: { label: 'Ensoleillé', tip: 'Pensez à vos lunettes de soleil.' },
    partlyCloudy: { label: 'Partiellement nuageux', tip: 'Une veste légère suffira.' },
    cloudy: { label: 'Nuageux', tip: 'Une journée calme et nuageuse.' },
    foggy: { label: 'Brumeux', tip: 'Soyez prudent si vous sortez.' },
    drizzle: { label: 'Pluie légère', tip: 'Prenez un parapluie.' },
    rain: { label: 'Pluvieux', tip: 'Prenez un parapluie et un manteau.' },
    snow: { label: 'Neigeux', tip: 'Portez un manteau chaud.' },
    storm: { label: 'Orageux', tip: 'Il vaut mieux rester à l’intérieur.' },
  },
  ar: {
    sunny: { label: 'مشمس', tip: 'قد تحتاج إلى نظارة شمسية.' },
    partlyCloudy: { label: 'غائم جزئيًا', tip: 'سترة خفيفة تكفي.' },
    cloudy: { label: 'غائم', tip: 'يوم هادئ وغائم.' },
    foggy: { label: 'ضبابي', tip: 'كن حذرًا إذا خرجت.' },
    drizzle: { label: 'أمطار خفيفة', tip: 'خذ مظلة معك.' },
    rain: { label: 'ممطر', tip: 'خذ مظلة ومعطفًا.' },
    snow: { label: 'ثلجي', tip: 'ارتدِ معطفًا دافئًا.' },
    storm: { label: 'عاصف', tip: 'يفضل البقاء في الداخل.' },
  },
};

let weatherState = null; // { bucket, tempC, place, ok }

function weatherSpeechLang() {
  return lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US';
}

function renderWeather() {
  if (weatherState === null) {
    els.weatherDesc.textContent = t().loadingWeather;
    return;
  }
  if (!weatherState.ok) {
    els.weatherIcon.textContent = '🌡️';
    els.weatherTemp.textContent = '';
    els.weatherDesc.textContent = t().weatherUnavailable;
    els.weatherPlace.textContent = '';
    els.weatherTip.textContent = t().tryAgainSoon;
    return;
  }
  const wt = WEATHER_TEXT[lang] || WEATHER_TEXT.en;
  const info = wt[weatherState.bucket] || wt.cloudy;
  els.weatherIcon.textContent = WEATHER_ICON[weatherState.bucket] || '🌡️';
  els.weatherTemp.textContent = `${Math.round(weatherState.tempC)}°`;
  els.weatherDesc.textContent = info.label;
  els.weatherPlace.textContent = weatherState.place || '';
  els.weatherTip.textContent = info.tip;

  if ('speechSynthesis' in window) {
    els.speakBtn.hidden = false;
    els.speakBtn.setAttribute('aria-label', t().readAloud);
  }
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const code = data && data.current && data.current.weather_code;
  const tempC = data && data.current && data.current.temperature_2m;
  if (typeof tempC !== 'number') throw new Error('No current weather in response');
  return { bucket: WEATHER_CODE_BUCKET[code] || 'cloudy', tempC };
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`);
    if (!res.ok) return null;
    const data = await res.json();
    const city = data.city || data.locality || data.principalSubdivision;
    if (!city) return null;
    return data.countryName ? `${city}, ${data.countryName}` : city;
  } catch {
    return null;
  }
}

function getGeolocation(timeoutMs) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve(null); return; }
    let done = false;
    const finish = (val) => { if (!done) { done = true; resolve(val); } };
    navigator.geolocation.getCurrentPosition(
      (pos) => finish({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => finish(null),
      { timeout: timeoutMs, maximumAge: 10 * 60 * 1000 }
    );
    setTimeout(() => finish(null), timeoutMs + 500);
  });
}

async function loadWeather() {
  els.weatherDesc.textContent = t().loadingWeather;
  els.weatherPlace.textContent = '';
  els.weatherTip.textContent = '';

  const pos = await getGeolocation(6000);
  const usingFallback = !pos;
  const coords = pos || TUNIS_COORDS;

  try {
    const weather = await fetchWeather(coords.lat, coords.lon);
    let place;
    if (usingFallback) {
      place = WEATHER_TUNIS_LABEL[lang] || WEATHER_TUNIS_LABEL.en;
    } else {
      place = (await reverseGeocode(coords.lat, coords.lon)) || t().yourLocation;
    }
    weatherState = { ...weather, place, ok: true };
  } catch {
    weatherState = { ok: false };
  }
  renderWeather();
}

function speechSentence() {
  if (!weatherState || !weatherState.ok) return t().weatherUnavailable;
  const wt = WEATHER_TEXT[lang] || WEATHER_TEXT.en;
  const info = wt[weatherState.bucket] || wt.cloudy;
  const place = weatherState.place ? `${weatherState.place}. ` : '';
  return `${place}${info.label}. ${Math.round(weatherState.tempC)}°. ${info.tip}`;
}

function onSpeakClick() {
  if (!('speechSynthesis' in window)) return;
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    els.speakBtn.classList.remove('is-speaking');
    return;
  }
  const utter = new SpeechSynthesisUtterance(speechSentence());
  utter.lang = weatherSpeechLang();
  utter.onend = () => els.speakBtn.classList.remove('is-speaking');
  utter.onerror = () => els.speakBtn.classList.remove('is-speaking');
  els.speakBtn.classList.add('is-speaking');
  window.speechSynthesis.speak(utter);
}

const FALLBACK_CATEGORIES = [
  { key: 'world', label: 'World & Politics' },
  { key: 'sports', label: 'Soccer' },
  { key: 'tunisia', label: 'Tunisia' },
  { key: 'middleeast', label: 'Middle East' },
  { key: 'northafrica', label: 'North Africa / Maghreb' },
  { key: 'france', label: 'France & French Politics' },
];

const DEFAULT_SELECTED = ['world', 'tunisia', 'middleeast', 'northafrica', 'france'];
const HEART_OUTLINE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 20.2s-7-4.4-9.4-8.9C1 8.2 2.4 4.9 5.6 4.2c1.9-.4 3.8.4 5 2 1.2-1.6 3.1-2.4 5-2 3.2.7 4.6 4 3 7.1C19 15.8 12 20.2 12 20.2z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

const els = {
  chips: document.getElementById('chips'),
  feed: document.getElementById('feed'),
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  clearBtn: document.getElementById('clearBtn'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  savedBtn: document.getElementById('savedBtn'),
  savedLabel: document.getElementById('savedLabel'),
  savedCount: document.getElementById('savedCount'),
  meta: document.getElementById('metaLine'),
  updatedLine: document.getElementById('updatedLine'),
  dateLine: document.getElementById('dateLine'),
  stateBox: document.getElementById('stateBox'),
  stateTitle: document.getElementById('stateTitle'),
  stateHint: document.getElementById('stateHint'),
  langSwitch: document.getElementById('langSwitch'),
  tagline: document.getElementById('tagline'),
  footer: document.getElementById('footer'),
  sourceSelect: document.getElementById('sourceSelect'),
  channelLabel: document.getElementById('channelLabel'),
  weatherIcon: document.getElementById('weatherIcon'),
  weatherTemp: document.getElementById('weatherTemp'),
  weatherDesc: document.getElementById('weatherDesc'),
  weatherPlace: document.getElementById('weatherPlace'),
  weatherTip: document.getElementById('weatherTip'),
  speakBtn: document.getElementById('speakBtn'),
  greetingText: document.getElementById('greetingText'),
  quoteBody: document.getElementById('quoteBody'),
};

let categories = FALLBACK_CATEGORIES;
let channels = [];
let selected = new Set(DEFAULT_SELECTED);
let keyword = '';
let lang = 'en';
let source = 'all';
let inflight = null;
let currentArticles = [];
let savedView = false;

const t = () => I18N[lang] || I18N.en;
const loc = () => (lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en-US');

// ---------------------------------------------------------------------------
// Likes (persisted in the browser).
// ---------------------------------------------------------------------------

function loadLikes() {
  try { return JSON.parse(localStorage.getItem(LIKES_KEY)) || []; } catch { return []; }
}
function saveLikes(arr) {
  try { localStorage.setItem(LIKES_KEY, JSON.stringify(arr)); } catch { /* private mode */ }
}
let likes = loadLikes();
const isLiked = (link) => likes.some((l) => l.link === link);

function toggleLike(article) {
  if (isLiked(article.link)) {
    likes = likes.filter((l) => l.link !== article.link);
  } else {
    likes = [{ ...article, likedAt: Date.now() }, ...likes];
  }
  saveLikes(likes);
  updateSavedCount();
}

function updateSavedCount() {
  els.savedCount.textContent = likes.length ? `(${likes.length})` : '';
}

// ---------------------------------------------------------------------------
// Read state (persisted in the browser; purely a visual affordance).
// ---------------------------------------------------------------------------

function loadRead() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY)) || []); } catch { return new Set(); }
}
function saveRead() {
  try {
    // Cap so this never grows without bound.
    const arr = [...readLinks].slice(-500);
    localStorage.setItem(READ_KEY, JSON.stringify(arr));
  } catch { /* private mode */ }
}
let readLinks = loadRead();
function markRead(link) {
  if (readLinks.has(link)) return;
  readLinks.add(link);
  saveRead();
}

// ---------------------------------------------------------------------------
// URL state.
// ---------------------------------------------------------------------------

function readState() {
  const params = new URLSearchParams(location.hash.slice(1));
  const cats = params.get('c');
  if (cats !== null) selected = new Set(cats.split(',').filter(Boolean));
  keyword = params.get('q') || '';
  lang = LANGS.includes(params.get('l')) ? params.get('l') : 'en';
  source = params.get('s') || 'all';
}

function writeState() {
  const params = new URLSearchParams();
  params.set('c', [...selected].join(','));
  if (keyword) params.set('q', keyword);
  params.set('l', lang);
  if (source && source !== 'all') params.set('s', source);
  history.replaceState(null, '', '#' + params.toString());
}

// ---------------------------------------------------------------------------
// Language.
// ---------------------------------------------------------------------------

function renderDate() {
  const now = new Date();
  const datePart = now.toLocaleDateString(loc(), { weekday: 'long', month: 'long', day: 'numeric' });
  const timePart = now.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' });
  els.dateLine.textContent = `${datePart} · ${timePart}`;
}

let clockTimer = null;
function startClock() {
  if (clockTimer) return;
  clockTimer = setInterval(() => {
    renderDate();
    renderGreeting();
  }, 20000);
}

function applyLanguageChrome() {
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
  els.tagline.textContent = t().tagline;
  els.searchInput.placeholder = t().placeholder;
  els.savedLabel.textContent = t().saved;
  els.channelLabel.textContent = t().channel;
  els.clearFiltersBtn.textContent = t().clearFilters;
  els.footer.textContent = '';
  renderDate();
  renderGreeting();
  renderQuote();
  renderWeather();
  els.langSwitch.querySelectorAll('.lang').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
  });
}

function buildChannelSelect() {
  const sel = els.sourceSelect;
  sel.innerHTML = '';
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = t().allChannels;
  sel.appendChild(all);
  for (const ch of channels) {
    const opt = document.createElement('option');
    opt.value = ch.key;
    opt.textContent = ch.label;
    sel.appendChild(opt);
  }
  sel.value = source;
  if (sel.value !== source) { source = 'all'; sel.value = 'all'; } // guard invalid
}

async function loadChannels() {
  try {
    const res = await fetch(`${API}?meta=channels&lang=${lang}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.channels)) channels = data.channels;
    }
  } catch {
    /* leave channels empty; only "All channels" shows */
  }
  buildChannelSelect();
}

// ---------------------------------------------------------------------------
// Rendering.
// ---------------------------------------------------------------------------

function renderChips() {
  els.chips.innerHTML = '';
  for (const cat of categories) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = cat.label;
    btn.setAttribute('aria-pressed', selected.has(cat.key) ? 'true' : 'false');
    btn.addEventListener('click', () => {
      if (selected.has(cat.key)) selected.delete(cat.key);
      else selected.add(cat.key);
      btn.setAttribute('aria-pressed', selected.has(cat.key) ? 'true' : 'false');
      writeState();
      if (!savedView) load();
    });
    els.chips.appendChild(btn);
  }
}

function timeAgo(iso) {
  if (!iso) return '';
  const then = Date.parse(iso);
  if (isNaN(then)) return '';
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (secs < 60) return t().updated;
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  return new Date(then).toLocaleDateString(loc(), { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function likeButtonHTML(a) {
  const liked = isLiked(a.link);
  return (
    `<button class="like" type="button" data-link="${escapeHtml(a.link)}" ` +
    `aria-pressed="${liked ? 'true' : 'false'}" aria-label="${escapeHtml(t().saved)}">${HEART_OUTLINE}</button>`
  );
}

// Every article — not just one "top story" — gets the same large-photo
// treatment: a full-width image above the headline, sized generously.
function cardHTML(a) {
  const time = timeAgo(a.publishedAt);
  const isRead = readLinks.has(a.link);
  const img = a.image
    ? `<div class="card__imgwrap"><img class="card__img" src="${escapeHtml(a.image)}" alt="" loading="lazy" onerror="this.parentElement.remove()" /></div>`
    : '';
  return (
    `<a class="card${img ? '' : ' card--noimg'}${isRead ? ' card--read' : ''}" ` +
    `href="${encodeURI(a.link)}" target="_blank" rel="noopener noreferrer" data-link="${escapeHtml(a.link)}">` +
    img +
    '<div class="card__body">' +
    '<div class="card__top">' +
    `<span class="card__source">${escapeHtml(a.source)}</span>` +
    (time ? `<span class="card__dot">·</span><span class="card__time">${escapeHtml(time)}</span>` : '') +
    '</div>' +
    `<div class="card__title">${escapeHtml(a.title)}</div>` +
    (a.snippet ? `<div class="card__snippet">${escapeHtml(a.snippet)}</div>` : '') +
    `<div class="card__foot">${likeButtonHTML(a)}</div>` +
    '</div>' +
    '</a>'
  );
}

function showSkeletons(n = 6) {
  els.stateBox.hidden = true;
  els.feed.setAttribute('aria-busy', 'true');
  let html = '';
  for (let i = 0; i < n; i++) {
    html +=
      '<div class="skeleton">' +
      '<div class="skeleton__imgwrap"></div>' +
      '<div class="skeleton__body">' +
      '<div class="skeleton__line short"></div>' +
      '<div class="skeleton__line title"></div>' +
      '<div class="skeleton__line body"></div>' +
      '</div>' +
      '</div>';
  }
  els.feed.innerHTML = html;
}

function renderList(list) {
  els.feed.setAttribute('aria-busy', 'false');
  currentArticles = list;
  if (!list.length) {
    els.feed.innerHTML = '';
    if (savedView) showState(t().savedEmptyTitle, t().savedEmptyHint);
    else showState(t().noMatchTitle, keyword ? t().noMatchKeyword(keyword) : t().noTopic);
    return;
  }
  els.stateBox.hidden = true;
  // Photo articles first (stable order within each group), text-only below.
  const ordered = list.filter((a) => a.image).concat(list.filter((a) => !a.image));
  els.feed.innerHTML = ordered.map(cardHTML).join('');
}

function showState(title, hint, isError) {
  els.feed.innerHTML = '';
  els.stateBox.hidden = false;
  els.stateBox.classList.toggle('state--error', !!isError);
  els.stateTitle.textContent = title;
  els.stateHint.textContent = hint;
  const existingRetry = els.stateBox.querySelector('.state__retry');
  if (existingRetry) existingRetry.remove();
  if (isError) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'state__retry';
    retry.textContent = t().retry;
    retry.addEventListener('click', () => (savedView ? showSaved() : load()));
    els.stateBox.appendChild(retry);
  }
}

function updateMeta(data) {
  const m = (data && data.meta) || {};
  els.meta.textContent = t().headline(m.total || 0);
  if (m.generatedAt) {
    els.updatedLine.textContent = t().updatedAt(
      new Date(m.generatedAt).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' })
    );
  }
  updateClearFilters();
}

function updateClearFilters() {
  const active = !!keyword || (source && source !== 'all');
  els.clearFiltersBtn.hidden = !active;
}

// ---------------------------------------------------------------------------
// Views.
// ---------------------------------------------------------------------------

function showSaved() {
  savedView = true;
  els.savedBtn.setAttribute('aria-pressed', 'true');
  if (inflight) inflight.abort();
  // Saved list ordered newest-liked first (acts as "recommended for next time").
  const list = likes.slice().sort((a, b) => (b.likedAt || 0) - (a.likedAt || 0));
  renderList(list);
  els.meta.textContent = t().savedCount(likes.length);
  els.updatedLine.textContent = '';
  els.clearFiltersBtn.hidden = true;
}

async function load() {
  savedView = false;
  els.savedBtn.setAttribute('aria-pressed', 'false');
  if (inflight) inflight.abort();
  inflight = new AbortController();

  showSkeletons();
  els.meta.textContent = t().loading;

  const params = new URLSearchParams();
  params.set('categories', [...selected].join(','));
  if (keyword) params.set('q', keyword);
  params.set('lang', lang);
  params.set('source', source);

  try {
    const res = await fetch(`${API}?${params.toString()}`, { signal: inflight.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderList((data && data.articles) || []);
    updateMeta(data);
  } catch (err) {
    if (err.name === 'AbortError') return;
    els.feed.setAttribute('aria-busy', 'false');
    els.meta.textContent = t().errTitle;
    showState(t().errTitle, t().errHint, true);
  } finally {
    els.refreshBtn.classList.remove('is-spinning');
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API}?meta=categories&lang=${lang}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.categories) && data.categories.length) {
        categories = data.categories;
      }
    }
  } catch {
    /* keep fallback list */
  }
}

// ---------------------------------------------------------------------------
// Events.
// ---------------------------------------------------------------------------

let searchTimer = null;
function onSearchInput() {
  const val = els.searchInput.value.trim();
  els.clearBtn.hidden = !val;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    keyword = val;
    writeState();
    load();
  }, 400);
}

async function setLanguage(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  writeState();
  applyLanguageChrome();
  await Promise.all([loadCategories(), loadChannels()]);
  renderChips();
  if (savedView) showSaved();
  else load();
}

function onFeedClick(e) {
  const btn = e.target.closest('.like');
  const card = e.target.closest('.card');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    const link = btn.dataset.link;
    const article = currentArticles.find((a) => a.link === link);
    if (!article) return;
    toggleLike(article);
    const nowLiked = isLiked(link);
    btn.setAttribute('aria-pressed', nowLiked ? 'true' : 'false');
    btn.classList.remove('is-pulsing');
    void btn.offsetWidth;
    btn.classList.add('is-pulsing');
    // If we're viewing the saved list and just un-liked, drop the card.
    if (savedView && !nowLiked) showSaved();
    return;
  }
  if (card && card.dataset.link) {
    markRead(card.dataset.link);
    card.classList.add('card--read');
  }
}

function wireEvents() {
  els.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(searchTimer);
    keyword = els.searchInput.value.trim();
    writeState();
    load();
  });
  els.searchInput.addEventListener('input', onSearchInput);
  els.clearBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    els.clearBtn.hidden = true;
    keyword = '';
    writeState();
    load();
  });
  els.clearFiltersBtn.addEventListener('click', () => {
    keyword = '';
    source = 'all';
    els.searchInput.value = '';
    els.clearBtn.hidden = true;
    els.sourceSelect.value = 'all';
    writeState();
    load();
  });
  els.refreshBtn.addEventListener('click', () => {
    els.refreshBtn.classList.add('is-spinning');
    if (savedView) showSaved();
    else load();
    loadWeather();
  });
  els.speakBtn.addEventListener('click', onSpeakClick);
  els.savedBtn.addEventListener('click', () => {
    if (savedView) load();
    else showSaved();
  });
  els.feed.addEventListener('click', onFeedClick);
  els.sourceSelect.addEventListener('change', () => {
    source = els.sourceSelect.value || 'all';
    writeState();
    load();
  });
  els.langSwitch.querySelectorAll('.lang').forEach((b) => {
    b.addEventListener('click', () => setLanguage(b.dataset.lang));
  });
}

// ---------------------------------------------------------------------------
// Init.
// ---------------------------------------------------------------------------

(async function init() {
  readState();
  applyLanguageChrome();
  els.searchInput.value = keyword;
  els.clearBtn.hidden = !keyword;
  updateSavedCount();
  wireEvents();
  startClock();
  loadWeather();
  await Promise.all([loadCategories(), loadChannels()]);
  renderChips();
  load();
})();
