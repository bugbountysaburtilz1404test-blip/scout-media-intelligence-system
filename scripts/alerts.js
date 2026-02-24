const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '..', 'data', 'raw_articles.json');
const ANALYTICS_FILE = path.join(__dirname, '..', 'data', 'analytics.json');
const ALERTS_FILE = path.join(__dirname, '..', 'data', 'alerts.json');

function loadJSON(file) {
    if (fs.existsSync(file)) {
        try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
        catch (e) { return null; }
    }
    return null;
}

function generateAlerts() {
    console.log('--- Starting Change Detection Engine v2.0 ---');

    const rawData = loadJSON(RAW_FILE) || [];
    const analytics = loadJSON(ANALYTICS_FILE) || {};
    const existingAlerts = loadJSON(ALERTS_FILE) || [];

    const newAlerts = [];
    const now = new Date();

    // 1. New articles in last 24h
    const recentArticles = rawData.filter(a => {
        if (!a.scrapedAt) return false;
        const diffHours = (now - new Date(a.scrapedAt)) / (1000 * 60 * 60);
        return diffHours < 24;
    });

    if (recentArticles.length > 0) {
        newAlerts.push({
            type: 'NEW_ARTICLES',
            level: 'info',
            icon: '📰',
            message: `تم رصد ${recentArticles.length} مقالات جديدة خلال الـ 24 ساعة الماضية.`,
            timestamp: now.toISOString(),
            data: recentArticles.map(a => a.title).slice(0, 5)
        });
    }

    // 2. Topic surge (>30% of distribution)
    if (analytics.global && analytics.global.topicDistribution) {
        const total = Object.values(analytics.global.topicDistribution).reduce((a, b) => a + b, 0);
        if (total > 0) {
            for (const [topic, count] of Object.entries(analytics.global.topicDistribution)) {
                if ((count / total) > 0.3 && count >= 5) {
                    newAlerts.push({
                        type: 'TOPIC_SURGE',
                        level: 'warning',
                        icon: '📊',
                        message: `زيادة ملحوظة في تغطية موضوع (${topic}) بنسبة ${Math.round((count / total) * 100)}% من المقالات.`,
                        timestamp: now.toISOString(),
                        data: { topic, count, percentage: Math.round((count / total) * 100) }
                    });
                }
            }
        }
    }

    // 3. View spike anomaly
    if (analytics.global && analytics.global.averageViews > 5000) {
        newAlerts.push({
            type: 'VIEW_SPIKE',
            level: 'warning',
            icon: '👁️',
            message: `ارتفاع غير طبيعي في متوسط عدد الزيارات (${analytics.global.averageViews} زيارة/مقال).`,
            timestamp: now.toISOString()
        });
    }

    // 4. Sentiment shift alert
    if (analytics.sentiment) {
        const { positive, negative, neutral } = analytics.sentiment;
        const total = positive + negative + neutral;
        if (total > 0 && negative > 0) {
            const negPercent = Math.round((negative / total) * 100);
            if (negPercent > 20) {
                newAlerts.push({
                    type: 'SENTIMENT_SHIFT',
                    level: 'warning',
                    icon: '😟',
                    message: `نسبة المقالات ذات المشاعر السلبية مرتفعة (${negPercent}%). يُنصح بالمراجعة.`,
                    timestamp: now.toISOString(),
                    data: { negPercent, negative, total }
                });
            }
        }
        if (total > 0 && positive > 0) {
            const posPercent = Math.round((positive / total) * 100);
            if (posPercent > 60) {
                newAlerts.push({
                    type: 'POSITIVE_TREND',
                    level: 'info',
                    icon: '😊',
                    message: `اتجاه إيجابي ملحوظ - ${posPercent}% من المقالات ذات مشاعر إيجابية.`,
                    timestamp: now.toISOString(),
                    data: { posPercent, positive, total }
                });
            }
        }
    }

    // 5. Quality metrics alert
    if (analytics.qualityMetrics && analytics.qualityMetrics.avgRichnessScore < 50) {
        newAlerts.push({
            type: 'QUALITY_DROP',
            level: 'warning',
            icon: '⚠️',
            message: `متوسط جودة المحتوى منخفض (${analytics.qualityMetrics.avgRichnessScore}/100). يُنصح بتحسين المحتوى.`,
            timestamp: now.toISOString()
        });
    }

    // 6. Publishing frequency
    if (analytics.timeSeries && analytics.timeSeries.dataMonth) {
        const months = analytics.timeSeries.dataMonth;
        if (months.length >= 2) {
            const lastMonth = months[months.length - 1];
            const prevMonth = months[months.length - 2];
            if (prevMonth > 0 && lastMonth < prevMonth * 0.5) {
                newAlerts.push({
                    type: 'FREQUENCY_DROP',
                    level: 'warning',
                    icon: '📉',
                    message: `انخفاض حاد في معدل النشر: ${lastMonth} مقال مقارنة بـ ${prevMonth} في الشهر السابق.`,
                    timestamp: now.toISOString()
                });
            }
        }
    }

    // 7. Milestone alerts
    if (analytics.global) {
        const total = analytics.global.totalArticles;
        const milestones = [1000, 2000, 3000, 5000, 7500, 10000];
        for (const m of milestones) {
            if (total >= m && total < m + 100) {
                newAlerts.push({
                    type: 'MILESTONE',
                    level: 'info',
                    icon: '🎉',
                    message: `تهانينا! تجاوز أرشيف المقالات ${m.toLocaleString()} مقال!`,
                    timestamp: now.toISOString()
                });
                break;
            }
        }
    }

    // Combine and deduplicate
    const allAlerts = [...newAlerts, ...existingAlerts];
    const uniqueAlerts = [];
    const seenSigs = new Set();

    for (const alert of allAlerts) {
        const dateStr = alert.timestamp.split('T')[0];
        const sig = `${alert.type}-${dateStr}`;
        if (!seenSigs.has(sig)) {
            seenSigs.add(sig);
            uniqueAlerts.push(alert);
        }
    }

    const finalAlerts = uniqueAlerts.slice(0, 50);

    fs.writeFileSync(ALERTS_FILE, JSON.stringify(finalAlerts, null, 2), 'utf8');
    console.log(`Generated ${newAlerts.length} new alerts. Total alerts: ${finalAlerts.length}`);
}

generateAlerts();
