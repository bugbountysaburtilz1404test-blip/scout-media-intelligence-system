const fs = require('fs');
const path = require('path');

const PROCESSED_FILE = path.join(__dirname, '..', 'data', 'processed_articles.json');
const ANALYTICS_FILE = path.join(__dirname, '..', 'data', 'analytics.json');

function getMetrics(data) {
    if (data.length === 0) return null;

    let totalLength = 0;
    let totalViews = 0;
    let lengthCount = 0;
    let viewsCount = 0;

    const wordsOverall = {};
    const cityCounts = {};
    const themeCounts = {};
    const articlesPerMonth = {};
    const articlesPerYear = {};
    const daysActive = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    let totalRichness = 0;
    let hasNumbersCount = 0;
    let hasQuotesCount = 0;
    let totalTitleLength = 0;

    // Sentiment tracking
    let sentimentPositive = 0;
    let sentimentNegative = 0;
    let sentimentNeutral = 0;
    let totalSentimentScore = 0;

    // Reading time tracking
    let readingQuick = 0;
    let readingMedium = 0;
    let readingLong = 0;
    let totalReadingTime = 0;

    // Author tracking
    const authorCounts = {};

    // Views per month for trend analysis
    const viewsPerMonth = {};

    for (const article of data) {
        if (article.wordCount) {
            totalLength += article.wordCount;
            lengthCount++;
        }
        if (article.views) {
            totalViews += article.views;
            viewsCount++;
        }

        // Days active & time series
        if (article.date) {
            const d = new Date(article.date);
            if (!isNaN(d.getTime())) {
                const dayOfWeek = d.getDay();
                daysActive[dayOfWeek]++;

                const yyyyMM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                articlesPerMonth[yyyyMM] = (articlesPerMonth[yyyyMM] || 0) + 1;

                const yyyy = d.getFullYear().toString();
                articlesPerYear[yyyy] = (articlesPerYear[yyyy] || 0) + 1;

                // Track views per month
                viewsPerMonth[yyyyMM] = (viewsPerMonth[yyyyMM] || 0) + (article.views || 0);
            }
        }

        // Keywords
        if (article.top20Keywords) {
            for (const kw of article.top20Keywords) {
                wordsOverall[kw.word] = (wordsOverall[kw.word] || 0) + kw.count;
            }
        }

        // City — use all city mentions if available
        if (article.cityMentions && Object.keys(article.cityMentions).length > 0) {
            for (const [city, count] of Object.entries(article.cityMentions)) {
                cityCounts[city] = (cityCounts[city] || 0) + count;
            }
        } else if (article.mostMentionedCity) {
            cityCounts[article.mostMentionedCity] = (cityCounts[article.mostMentionedCity] || 0) + 1;
        }

        // Theme
        if (article.primaryTheme && article.primaryTheme !== 'Other') {
            themeCounts[article.primaryTheme] = (themeCounts[article.primaryTheme] || 0) + 1;
        }

        // Quality
        if (article.contentQuality) {
            totalRichness += article.contentQuality.richnessScore || 0;
            if (article.contentQuality.hasNumbers) hasNumbersCount++;
            if (article.contentQuality.hasQuotes) hasQuotesCount++;
            if (article.contentQuality.titleLength) totalTitleLength += article.contentQuality.titleLength;
        }

        // Sentiment aggregation
        if (article.sentiment) {
            if (article.sentiment.label === 'positive') sentimentPositive++;
            else if (article.sentiment.label === 'negative') sentimentNegative++;
            else sentimentNeutral++;
            totalSentimentScore += article.sentiment.score || 0;
        }

        // Reading time aggregation
        if (article.readingTier === 'quick') readingQuick++;
        else if (article.readingTier === 'medium') readingMedium++;
        else if (article.readingTier === 'long') readingLong++;
        totalReadingTime += article.readingTimeMin || 0;

        // Author aggregation
        if (article.author) {
            authorCounts[article.author] = (authorCounts[article.author] || 0) + 1;
        }
    }

    const mostActiveDayStr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const bestDayIdx = Object.keys(daysActive).reduce((a, b) => daysActive[a] > daysActive[b] ? a : b, 0);

    const sortedWords = Object.entries(wordsOverall).sort((a, b) => b[1] - a[1]).slice(0, 50).map(x => ({ word: x[0], count: x[1] }));
    const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);

    let mostCoveredCity = null;
    if (sortedCities.length > 0) mostCoveredCity = sortedCities[0][0];

    // Top authors
    const sortedAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Format for charts
    const timeSeriesMonth = Object.keys(articlesPerMonth).sort();
    const tsMonthData = timeSeriesMonth.map(m => articlesPerMonth[m]);

    // Monthly growth rate
    let monthlyGrowthRate = 0;
    if (timeSeriesMonth.length >= 2) {
        const lastMonth = articlesPerMonth[timeSeriesMonth[timeSeriesMonth.length - 1]];
        const prevMonth = articlesPerMonth[timeSeriesMonth[timeSeriesMonth.length - 2]];
        if (prevMonth > 0) {
            monthlyGrowthRate = ((lastMonth - prevMonth) / prevMonth) * 100;
        }
    }

    // YoY
    const timeSeriesYear = Object.keys(articlesPerYear).sort();
    let yoyGrowth = 0;
    if (timeSeriesYear.length >= 2) {
        const lastYear = articlesPerYear[timeSeriesYear[timeSeriesYear.length - 1]];
        const prevYear = articlesPerYear[timeSeriesYear[timeSeriesYear.length - 2]];
        if (prevYear > 0) yoyGrowth = ((lastYear - prevYear) / prevYear) * 100;
    }

    // Views per month for chart
    const viewsMonthData = timeSeriesMonth.map(m => viewsPerMonth[m] || 0);

    // Activity heatmap data (month x dayOfWeek)
    const heatmapData = {};
    for (const article of data) {
        if (article.date) {
            const d = new Date(article.date);
            if (!isNaN(d.getTime())) {
                const month = d.getMonth(); // 0-11
                const day = d.getDay(); // 0-6
                const key = `${month}-${day}`;
                heatmapData[key] = (heatmapData[key] || 0) + 1;
            }
        }
    }

    return {
        global: {
            totalArticles: data.length,
            averageWordLength: lengthCount > 0 ? Math.round(totalLength / lengthCount) : 0,
            averageViews: viewsCount > 0 ? Math.round(totalViews / viewsCount) : 0,
            totalViews,
            mostActiveDay: mostActiveDayStr[bestDayIdx],
            mostCoveredCity,
            topWords: sortedWords,
            topicDistribution: themeCounts,
            cityDistribution: Object.fromEntries(sortedCities.slice(0, 15)),
            daysActive
        },
        timeSeries: {
            labelsMonth: timeSeriesMonth,
            dataMonth: tsMonthData,
            viewsMonth: viewsMonthData,
            labelsYear: timeSeriesYear,
            dataYear: timeSeriesYear.map(y => articlesPerYear[y]),
            monthlyGrowthRate: monthlyGrowthRate.toFixed(2) + '%',
            yoyGrowth: yoyGrowth.toFixed(2) + '%'
        },
        qualityMetrics: {
            avgRichnessScore: data.length > 0 ? Math.round(totalRichness / data.length) : 0,
            articlesWithNumbersPercent: data.length > 0 ? Math.round((hasNumbersCount / data.length) * 100) : 0,
            articlesWithQuotesPercent: data.length > 0 ? Math.round((hasQuotesCount / data.length) * 100) : 0,
            avgTitleLength: data.length > 0 ? Math.round(totalTitleLength / data.length) : 0
        },
        sentiment: {
            positive: sentimentPositive,
            negative: sentimentNegative,
            neutral: sentimentNeutral,
            avgScore: data.length > 0 ? Math.round(totalSentimentScore / data.length) : 0
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
        heatmap: heatmapData,
        yearComparison: {
            labels: timeSeriesYear,
            data: timeSeriesYear.map(y => articlesPerYear[y])
        },
        updatedAt: new Date().toISOString()
    };
}

function runAnalytics() {
    console.log('--- Starting Analytics Engine v2.0 ---');
    if (!fs.existsSync(PROCESSED_FILE)) {
        console.error('Processed data not found.');
        return;
    }

    const processedData = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
    const metrics = getMetrics(processedData);

    if (metrics) {
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(metrics, null, 2), 'utf8');
        console.log(`Analytics updated and saved to ${ANALYTICS_FILE}`);
        console.log(`Topics found: ${JSON.stringify(metrics.global.topicDistribution)}`);
        console.log(`Cities found: ${Object.keys(metrics.global.cityDistribution).length} cities`);
        console.log(`Sentiment: +${metrics.sentiment.positive} / -${metrics.sentiment.negative} / neutral:${metrics.sentiment.neutral}`);
    }
}

runAnalytics();
