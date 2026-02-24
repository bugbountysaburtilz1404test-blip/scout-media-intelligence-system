const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '..', 'data', 'raw_articles.json');
const PROCESSED_FILE = path.join(__dirname, '..', 'data', 'processed_articles.json');

// Comprehensive Arabic stopwords list
const arabicStopWords = new Set([
    "في", "من", "على", "إلى", "عن", "مع", "أن", "هذه", "هذا", "كان", "كانت", "التي", "الذي",
    "تم", "إن", "و", "أو", "ثم", "كما", "وقد", "بين", "بعد", "قبل", "عند", "له", "لها", "بها", "به",
    "ذلك", "تلك", "هناك", "نحو", "خلال", "حيث", "أنه", "أنها",
    "لا", "ما", "لم", "لن", "إذا", "كل", "هو", "هي", "نحن", "هم", "أنت", "أنا",
    "قد", "عن", "فقد", "كذلك", "أيضا", "أيضاً", "منذ", "حتى", "لكن", "بل", "إذ",
    "غير", "دون", "سوى", "لدى", "عبر", "فوق", "تحت", "أمام", "وراء", "ضمن",
    "يكون", "تكون", "يتم", "كانوا", "ليس", "ليست", "أصبح", "أصبحت",
    "إلا", "سواء", "بأن", "لأن", "حول", "ضد", "بعض", "معظم", "جميع",
    "فيما", "بينما", "حين", "عندما", "كيف", "أين", "متى", "لماذا", "ماذا",
    "الا", "اما", "انه", "انها", "ايضا", "اذا", "الذين", "اللذين", "اللتين",
    "والتي", "والذي", "يمكن", "ينبغي", "يجب", "يعد", "يعتبر",
    "ولا", "فلا", "ولم", "ولن", "وهو", "وهي", "وهذا", "وهذه",
    "علي", "الي", "لله", "عبدا"
]);

// Comprehensive Saudi cities list (40+ cities/regions)
const saudiCities = [
    "الرياض", "جدة", "جده", "مكة", "مكه", "المكرمة", "المكرمه", "المدينة", "المدينه", "المنورة", "المنوره",
    "الدمام", "الطائف", "بريدة", "بريده", "تبوك", "أبها", "ابها", "خميس مشيط",
    "حائل", "حفر الباطن", "الجبيل", "الخرج", "ينبع", "نجران", "جازان", "جيزان",
    "عرعر", "سكاكا", "الأحساء", "الاحساء", "القطيف", "الخبر", "الظهران",
    "الباحة", "الباحه", "بيشة", "بيشه", "عنيزة", "عنيزه", "الزلفي",
    "المجمعة", "المجمعه", "شقراء", "الدوادمي", "وادي الدواسر", "رفحاء",
    "القصيم", "عسير", "الجوف", "الحدود الشمالية", "المنطقة الشرقية",
    "القنفذة", "القنفذه", "محايل", "رجال المع", "النماص", "ظهران الجنوب",
    "صبيا", "صامطة", "أبو عريش", "فيفا", "بلجرشي", "المندق",
    "ضرما", "المزاحمية", "المزاحميه", "حوطة بني تميم", "الأفلاج",
    "الرس", "البكيرية", "البكيريه", "المذنب", "رياض الخبراء"
];

// Expanded Topics with more categories
const topics = {
    Religious: [
        "حج", "عمرة", "عمره", "مسجد", "إسلام", "اسلام", "توحيد", "عقيدة", "عقيده",
        "قرآن", "قران", "سنة", "سنه", "رمضان", "عيد", "حجاج", "معتمرين",
        "اسلامي", "إسلامي", "ديني", "دينية", "مصحف", "صلاة", "صلاه"
    ],
    National: [
        "وطن", "وطني", "يوم وطني", "مليك", "ملك", "ولي العهد", "سعودية", "سعوديه",
        "مملكة", "مملكه", "رؤية", "رؤيه", "تأسيس", "علم", "بيعة", "بيعه",
        "وطنية", "وطنيه", "يوم التأسيس", "العلم السعودي", "الوطن"
    ],
    Environmental: [
        "بيئة", "بييه", "أشجار", "اشجار", "تشجير", "نظافة", "نظافه",
        "منتزه", "حديقة", "حديقه", "طبيعة", "طبيعه", "مناخ", "تلوث",
        "سعودية خضراء", "خضراء", "بيئي", "بيئية", "بييي", "بيييه",
        "نظام بيئي", "تدوير", "اعادة تدوير", "محمية", "محميه"
    ],
    Volunteer: [
        "تطوع", "خدمة", "خدمه", "مجتمع", "مساعدة", "مساعده", "مبادرة", "مبادره",
        "جهود", "عطاء", "خيري", "خيريه", "إغاثة", "اغاثه", "إنسانية", "انسانيه",
        "مسؤولية", "مسووليه", "اجتماعي", "اجتماعيه", "تطوعي", "تطوعيه",
        "متطوع", "متطوعين", "عمل تطوعي"
    ],
    Training: [
        "تدريب", "تدريبي", "تدريبية", "تدريبيه", "دورة", "دوره", "دورات",
        "ورشة", "ورشه", "تأهيل", "تاهيل", "مهارات", "مهاره",
        "قائد", "قيادة", "قياده", "تعلم", "تعليم", "معسكر", "محاضرة", "محاضره",
        "شهادة", "شهاده", "اجتياز", "برنامج تدريبي"
    ],
    International: [
        "عالمي", "عالميه", "عالمية", "دولي", "دوليه", "دولية",
        "عربي", "عربيه", "عربية", "مؤتمر", "موتمر", "مخيم عالمي",
        "جامبوري", "منظمة", "منظمه", "اتحاد", "خارجي", "خارجيه",
        "وفد", "زيارة خارجية", "مشاركة دولية"
    ],
    Camps: [
        "مخيم", "مخيمات", "معسكر", "معسكرات", "كشفي", "كشفية", "كشفيه",
        "خيمة", "خيمه", "رحلة", "رحله", "نشاط كشفي", "حياة خلوية", "خلويه",
        "استكشاف", "مغامرة", "مغامره"
    ],
    Education: [
        "تربية", "تربيه", "تعليم", "مدرسة", "مدرسه", "طالب", "طلاب",
        "منهج", "مناهج", "إدارة تعليم", "اداره تعليم", "تربوي", "تربويه",
        "تعليمي", "تعليميه", "ثقافي", "ثقافيه", "ثقافة", "ثقافه"
    ]
};

// Arabic Sentiment Word Lists
const positiveWords = [
    "نجاح", "تميز", "إنجاز", "انجاز", "تفوق", "رائع", "ممتاز", "متميز", "إبداع", "ابداع",
    "فخر", "اعتزاز", "تكريم", "جائزة", "جايزه", "فوز", "بطولة", "بطوله", "مبارك",
    "تهنئة", "تهنيه", "احتفال", "احتفاء", "تطور", "تقدم", "ازدهار", "نمو",
    "شكر", "تقدير", "عطاء", "تعاون", "شراكة", "شراكه", "مشاركة", "مشاركه",
    "سعادة", "سعاده", "فرح", "بهجة", "بهجه", "فرحة", "فرحه", "جميل", "جميله",
    "أفضل", "افضل", "أحسن", "احسن", "أجمل", "اجمل", "أروع", "اروع",
    "حب", "محبة", "محبه", "تضامن", "وفاء", "إخلاص", "اخلاص",
    "مبدع", "متألق", "متالق", "منجز", "ناجح", "فائز"
];

const negativeWords = [
    "فشل", "خسارة", "خساره", "إخفاق", "اخفاق", "تراجع", "انخفاض",
    "مشكلة", "مشكله", "أزمة", "ازمه", "صعوبة", "صعوبه", "تحدي", "عقبة", "عقبه",
    "خطر", "تهديد", "قلق", "خوف", "حزن", "أسف", "اسف", "مؤسف", "موسف",
    "ضعف", "نقص", "عجز", "تدهور", "انهيار", "سوء",
    "رفض", "اعتراض", "انتقاد", "شكوى", "شكوي", "ضرر",
    "إلغاء", "الغاء", "تأجيل", "تاجيل", "توقف", "حادث", "حوادث"
];

function normalizeArabic(text) {
    if (!text) return '';
    let result = text
        .replace(/[إأآا]/g, "ا")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/[^\u0621-\u064A0-9A-Za-z\s]/g, " ")
        .replace(/\s+/g, ' ')
        .trim();
    return result;
}

function tokenizeAndFilter(text) {
    const words = text.split(' ');
    return words.filter(w => w.length > 2 && !arabicStopWords.has(w) && isNaN(w));
}

function getWordFrequencies(words) {
    const freqs = {};
    for (const w of words) freqs[w] = (freqs[w] || 0) + 1;
    return Object.entries(freqs).sort((a, b) => b[1] - a[1]);
}

// Fixed: Use whitespace-based matching instead of \b for Arabic
function countArabicMatches(text, keyword) {
    const normKw = normalizeArabic(keyword);
    if (!normKw) return 0;
    // Use regex with space/start/end boundaries instead of \b
    const pattern = new RegExp(`(?:^|\\s)${normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'g');
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
}

function detectThemes(textNorm) {
    const themesDetected = {};
    for (const [theme, keywords] of Object.entries(topics)) {
        let count = 0;
        for (const kw of keywords) {
            count += countArabicMatches(textNorm, kw);
        }
        themesDetected[theme] = count;
    }
    let highestTheme = 'Other';
    let max = 0;
    for (const [theme, count] of Object.entries(themesDetected)) {
        if (count > max && count > 0) {
            max = count;
            highestTheme = theme;
        }
    }
    return { all: themesDetected, primary: highestTheme };
}

function detectCity(textNorm) {
    const cityFreqs = {};
    for (const city of saudiCities) {
        const count = countArabicMatches(textNorm, city);
        if (count > 0) {
            // Normalize city name back to canonical form
            const canonical = getCanonicalCity(city);
            cityFreqs[canonical] = (cityFreqs[canonical] || 0) + count;
        }
    }
    const sorted = Object.entries(cityFreqs).sort((a, b) => b[1] - a[1]);
    return {
        most: sorted.length > 0 ? sorted[0][0] : null,
        all: cityFreqs
    };
}

// Map variant spellings to canonical city name
function getCanonicalCity(city) {
    const cityMap = {
        "جده": "جدة", "مكه": "مكة", "المكرمه": "المكرمة",
        "المدينه": "المدينة", "المنوره": "المنورة",
        "بريده": "بريدة", "ابها": "أبها",
        "الاحساء": "الأحساء", "الباحه": "الباحة",
        "بيشه": "بيشة", "عنيزه": "عنيزة",
        "المجمعه": "المجمعة", "القنفذه": "القنفذة",
        "المزاحميه": "المزاحمية", "البكيريه": "البكيرية",
        "بييه": "بيئة", "جيزان": "جازان"
    };
    return cityMap[city] || city;
}

function analyzeSentiment(textNorm) {
    let posScore = 0;
    let negScore = 0;

    for (const word of positiveWords) {
        posScore += countArabicMatches(textNorm, word);
    }
    for (const word of negativeWords) {
        negScore += countArabicMatches(textNorm, word);
    }

    const total = posScore + negScore;
    let label = 'neutral';
    let score = 0;

    if (total > 0) {
        score = ((posScore - negScore) / total) * 100;
        if (score > 15) label = 'positive';
        else if (score < -15) label = 'negative';
        else label = 'neutral';
    }

    return {
        label,
        score: Math.round(score),
        positive: posScore,
        negative: negScore
    };
}

function detectAuthor(content) {
    if (!content) return null;
    // Common patterns: "الرياض - مبارك الدوسري" or "اسم الصحفي"
    const match = content.match(/^[\s]*([^\-–]+)\s*[-–]\s*([^\n\r]+)/);
    if (match && match[2]) {
        return match[2].trim().substring(0, 50);
    }
    return null;
}

function analyzeArticles() {
    console.log('--- Starting NLP & Text Processing Engine v2.0 ---');
    if (!fs.existsSync(RAW_FILE)) {
        console.error('No raw data found.');
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
    let themeHits = 0;
    let cityHits = 0;

    const processedData = rawData.map(article => {
        const textNorm = normalizeArabic(article.content);
        const titleNorm = normalizeArabic(article.title);

        const fullTextContext = titleNorm + ' ' + textNorm;
        const words = tokenizeAndFilter(fullTextContext);

        const wordCount = textNorm.split(' ').filter(w => w.length > 0).length;
        const readingTimeMin = Math.ceil(wordCount / 200) || 1;

        // Reading time tier
        let readingTier = 'quick';
        if (readingTimeMin >= 5) readingTier = 'long';
        else if (readingTimeMin >= 2) readingTier = 'medium';

        const sortedFreqs = getWordFrequencies(words);
        const top20Keywords = sortedFreqs.slice(0, 20).map(x => ({ word: x[0], count: x[1] }));

        const themes = detectThemes(fullTextContext);
        const cityResult = detectCity(fullTextContext);
        const sentiment = analyzeSentiment(fullTextContext);
        const author = detectAuthor(article.content);

        if (themes.primary !== 'Other') themeHits++;
        if (cityResult.most) cityHits++;

        const hasNumbers = /\d/.test(article.content);
        const hasQuotes = /["']/.test(article.content) || /«|»/.test(article.content);
        const hasImages = /<img/i.test(article.content || '');

        // Enhanced content richness score
        let richnessScore = 40; // lower base
        if (wordCount > 50) richnessScore += 5;
        if (wordCount > 100) richnessScore += 10;
        if (wordCount > 300) richnessScore += 10;
        if (wordCount > 500) richnessScore += 5;
        if (hasQuotes) richnessScore += 10;
        if (hasNumbers) richnessScore += 5;
        if (hasImages) richnessScore += 5;
        if (top20Keywords.length >= 10) richnessScore += 5;
        if (top20Keywords.length >= 15) richnessScore += 5;
        if (sentiment.label !== 'neutral') richnessScore += 5;
        richnessScore = Math.min(100, richnessScore);

        return {
            id: article.url.split('id=')[1] || Date.now().toString(),
            title: article.title,
            url: article.url,
            date: article.date,
            views: article.views,
            wordCount,
            readingTimeMin,
            readingTier,
            top20Keywords,
            primaryTheme: themes.primary,
            themeScores: themes.all,
            mostMentionedCity: cityResult.most,
            cityMentions: cityResult.all,
            sentiment,
            author,
            contentQuality: {
                hasNumbers,
                hasQuotes,
                hasImages,
                titleLength: article.title.length,
                richnessScore
            }
        };
    });

    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processedData, null, 2), 'utf8');
    console.log(`Processed ${processedData.length} articles and saved to ${PROCESSED_FILE}`);
    console.log(`Theme detection: ${themeHits}/${processedData.length} articles classified (${Math.round(themeHits/processedData.length*100)}%)`);
    console.log(`City detection: ${cityHits}/${processedData.length} articles with city mentions (${Math.round(cityHits/processedData.length*100)}%)`);
}

analyzeArticles();
