const fs = require('fs');
const path = require('path');

const PROCESSED_FILE = path.join(__dirname, '..', 'data', 'processed_articles.json');
const ANALYTICS_FILE = path.join(__dirname, '..', 'data', 'analytics.json');

function getMetrics(data) {
    if (data.length === 0) return null;

    let totalLength = 0, totalViews = 0, lengthCount = 0, viewsCount = 0;
    const wordsOverall = {};
    const cityCounts = {};
    const themeCounts = {};
    const articlesPerMonth = {};
    const articlesPerYear = {};
    const daysActive = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    let totalRichness = 0, hasNumbersCount = 0, hasQuotesCount = 0, totalTitleLength = 0;
    let sentimentPositive = 0, sentimentNegative = 0, sentimentNeutral = 0, totalSentScore = 0;
    let readingQuick = 0, readingMedium = 0, readingLong = 0, totalReadingTime = 0;
    const authorCounts = {};
    const viewsPerMonth = {};
    const gradeDistribution = { 'ممتاز': 0, 'جيد جداً': 0, 'جيد': 0, 'مقبول': 0, 'ضعيف': 0 };
    const allPeople = {};
    const allOrgs = {};
    const secondaryThemeCounts = {};

    for (const article of data) {
        if (article.wordCount) { totalLength += article.wordCount; lengthCount++; }
        if (article.views) { totalViews += article.views; viewsCount++; }

        // أيام النشاط والسلاسل الزمنية
        if (article.date) {
            const d = new Date(article.date);
            if (!isNaN(d.getTime())) {
                daysActive[d.getDay()]++;
                const yyyyMM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                articlesPerMonth[yyyyMM] = (articlesPerMonth[yyyyMM] || 0) + 1;
                articlesPerYear[d.getFullYear().toString()] = (articlesPerYear[d.getFullYear().toString()] || 0) + 1;
                viewsPerMonth[yyyyMM] = (viewsPerMonth[yyyyMM] || 0) + (article.views || 0);
            }
        }

        // الكلمات المفتاحية
        if (article.top20Keywords) {
            for (const kw of article.top20Keywords) {
                wordsOverall[kw.word] = (wordsOverall[kw.word] || 0) + kw.count;
            }
        }

        // المدن
        if (article.cityMentions && Object.keys(article.cityMentions).length > 0) {
            for (const [city, count] of Object.entries(article.cityMentions)) {
                cityCounts[city] = (cityCounts[city] || 0) + count;
            }
        }

        // المواضيع
        if (article.primaryTheme && article.primaryTheme !== 'عام') {
            themeCounts[article.primaryTheme] = (themeCounts[article.primaryTheme] || 0) + 1;
        }
        if (article.secondaryTheme) {
            secondaryThemeCounts[article.secondaryTheme] = (secondaryThemeCounts[article.secondaryTheme] || 0) + 1;
        }

        // الجودة
        if (article.contentQuality) {
            totalRichness += article.contentQuality.richnessScore || 0;
            if (article.contentQuality.hasNumbers) hasNumbersCount++;
            if (article.contentQuality.hasQuotes) hasQuotesCount++;
            totalTitleLength += article.contentQuality.titleLength || 0;
            if (article.contentQuality.grade && gradeDistribution.hasOwnProperty(article.contentQuality.grade)) {
                gradeDistribution[article.contentQuality.grade]++;
            }
        }

        // المشاعر
        if (article.sentiment) {
            if (article.sentiment.label === 'إيجابي') sentimentPositive++;
            else if (article.sentiment.label === 'سلبي') sentimentNegative++;
            else sentimentNeutral++;
            totalSentScore += article.sentiment.score || 0;
        }

        // وقت القراءة
        if (article.readingTier === 'سريع') readingQuick++;
        else if (article.readingTier === 'متوسط') readingMedium++;
        else if (article.readingTier === 'طويل') readingLong++;
        totalReadingTime += article.readingTimeMin || 0;

        // المؤلفون
        if (article.author) authorCounts[article.author] = (authorCounts[article.author] || 0) + 1;

        // الكيانات (أشخاص ومنظمات)
        if (article.entities) {
            (article.entities.people || []).forEach(p => { allPeople[p] = (allPeople[p] || 0) + 1; });
            (article.entities.organizations || []).forEach(o => { allOrgs[o] = (allOrgs[o] || 0) + 1; });
        }
    }

    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const bestDayIdx = Object.keys(daysActive).reduce((a, b) => daysActive[a] > daysActive[b] ? a : b, 0);
    const sortedWords = Object.entries(wordsOverall).sort((a, b) => b[1] - a[1]).slice(0, 50).map(x => ({ word: x[0], count: x[1] }));
    const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
    const sortedAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const sortedPeople = Object.entries(allPeople).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const sortedOrgs = Object.entries(allOrgs).sort((a, b) => b[1] - a[1]).slice(0, 15);

    const timeSeriesMonth = Object.keys(articlesPerMonth).sort();
    const timeSeriesYear = Object.keys(articlesPerYear).sort();

    // معدل نمو شهري
    let monthlyGrowth = '0%';
    if (timeSeriesMonth.length >= 2) {
        const last = articlesPerMonth[timeSeriesMonth[timeSeriesMonth.length - 1]];
        const prev = articlesPerMonth[timeSeriesMonth[timeSeriesMonth.length - 2]];
        if (prev > 0) monthlyGrowth = ((last - prev) / prev * 100).toFixed(1) + '%';
    }

    // نمو سنوي
    let yoyGrowth = '0%';
    if (timeSeriesYear.length >= 2) {
        const last = articlesPerYear[timeSeriesYear[timeSeriesYear.length - 1]];
        const prev = articlesPerYear[timeSeriesYear[timeSeriesYear.length - 2]];
        if (prev > 0) yoyGrowth = ((last - prev) / prev * 100).toFixed(1) + '%';
    }

    return {
        global: {
            totalArticles: data.length,
            averageWordLength: lengthCount > 0 ? Math.round(totalLength / lengthCount) : 0,
            averageViews: viewsCount > 0 ? Math.round(totalViews / viewsCount) : 0,
            totalViews,
            mostActiveDay: dayNames[bestDayIdx],
            mostCoveredCity: sortedCities.length > 0 ? sortedCities[0][0] : null,
            topWords: sortedWords,
            topicDistribution: themeCounts,
            cityDistribution: Object.fromEntries(sortedCities.slice(0, 20)),
            daysActive
        },
        timeSeries: {
            labelsMonth: timeSeriesMonth,
            dataMonth: timeSeriesMonth.map(m => articlesPerMonth[m]),
            viewsMonth: timeSeriesMonth.map(m => viewsPerMonth[m] || 0),
            labelsYear: timeSeriesYear,
            dataYear: timeSeriesYear.map(y => articlesPerYear[y]),
            monthlyGrowthRate: monthlyGrowth,
            yoyGrowth
        },
        qualityMetrics: {
            avgRichnessScore: data.length > 0 ? Math.round(totalRichness / data.length) : 0,
            articlesWithNumbersPercent: data.length > 0 ? Math.round((hasNumbersCount / data.length) * 100) : 0,
            articlesWithQuotesPercent: data.length > 0 ? Math.round((hasQuotesCount / data.length) * 100) : 0,
            avgTitleLength: data.length > 0 ? Math.round(totalTitleLength / data.length) : 0,
            gradeDistribution
        },
        sentiment: {
            positive: sentimentPositive,
            negative: sentimentNegative,
            neutral: sentimentNeutral,
            avgScore: data.length > 0 ? Math.round(totalSentScore / data.length) : 0
        },
        readingTime: {
            quick: readingQuick,
            medium: readingMedium,
            long: readingLong,
            avgMinutes: data.length > 0 ? Math.round(totalReadingTime / data.length) : 0,
            totalMinutes: totalReadingTime
        },
        authors: {
            topAuthors: sortedAuthors.map(([name, count]) => ({ name, count })),
            uniqueCount: Object.keys(authorCounts).length
        },
        entities: {
            topPeople: sortedPeople.map(([name, count]) => ({ name, count })),
            topOrganizations: sortedOrgs.map(([name, count]) => ({ name, count }))
        },
        yearComparison: {
            labels: timeSeriesYear,
            data: timeSeriesYear.map(y => articlesPerYear[y])
        },
        updatedAt: new Date().toISOString()
    };
}

function runAnalytics() {
    console.log('═══════════════════════════════════════════');
    console.log('   محرك التحليلات — الإصدار 3.0');
    console.log('═══════════════════════════════════════════');

    if (!fs.existsSync(PROCESSED_FILE)) {
        console.error('لا توجد بيانات معالجة.');
        return;
    }

    const processedData = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
    const metrics = getMetrics(processedData);

    if (metrics) {
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(metrics, null, 2), 'utf8');
        console.log(`   ✅ تم تحديث التحليلات`);
        console.log(`   📊 المواضيع: ${JSON.stringify(metrics.global.topicDistribution)}`);
        console.log(`   🏙️ المدن: ${Object.keys(metrics.global.cityDistribution).length} مدينة`);
        console.log(`   💬 المشاعر: +${metrics.sentiment.positive} / -${metrics.sentiment.negative} / محايد:${metrics.sentiment.neutral}`);
        console.log(`   👤 الكيانات: ${metrics.entities.topPeople.length} شخصيات، ${metrics.entities.topOrganizations.length} منظمات`);
    }
}

runAnalytics();
