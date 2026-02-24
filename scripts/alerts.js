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
    console.log('═══════════════════════════════════════════');
    console.log('   نظام التنبيهات — الإصدار 3.0');
    console.log('═══════════════════════════════════════════');

    const rawData = loadJSON(RAW_FILE) || [];
    const analytics = loadJSON(ANALYTICS_FILE) || {};
    const existingAlerts = loadJSON(ALERTS_FILE) || [];
    const newAlerts = [];
    const now = new Date();

    // 1. مقالات جديدة
    const recentArticles = rawData.filter(a => {
        if (!a.scrapedAt) return false;
        return (now - new Date(a.scrapedAt)) / (1000 * 60 * 60) < 24;
    });
    if (recentArticles.length > 0) {
        newAlerts.push({
            type: 'NEW_ARTICLES', level: 'info', icon: '📰',
            message: `تم رصد ${recentArticles.length} مقالات جديدة خلال الـ 24 ساعة الماضية`,
            timestamp: now.toISOString()
        });
    }

    // 2. طفرة في موضوع
    if (analytics.global && analytics.global.topicDistribution) {
        const total = Object.values(analytics.global.topicDistribution).reduce((a, b) => a + b, 0);
        if (total > 0) {
            for (const [topic, count] of Object.entries(analytics.global.topicDistribution)) {
                const pct = Math.round((count / total) * 100);
                if (pct > 30 && count >= 5) {
                    newAlerts.push({
                        type: 'TOPIC_SURGE', level: 'warning', icon: '📊',
                        message: `زيادة ملحوظة في تغطية موضوع "${topic}" بنسبة ${pct}%`,
                        timestamp: now.toISOString()
                    });
                }
            }
        }
    }

    // 3. ارتفاع المشاهدات
    if (analytics.global && analytics.global.averageViews > 5000) {
        newAlerts.push({
            type: 'VIEW_SPIKE', level: 'warning', icon: '👁️',
            message: `ارتفاع غير طبيعي في المشاهدات (${analytics.global.averageViews.toLocaleString()} زيارة/مقال)`,
            timestamp: now.toISOString()
        });
    }

    // 4. تحول المشاعر
    if (analytics.sentiment) {
        const { positive, negative, neutral } = analytics.sentiment;
        const total = positive + negative + neutral;
        if (total > 0) {
            const negPct = Math.round((negative / total) * 100);
            if (negPct > 15) {
                newAlerts.push({
                    type: 'SENTIMENT_SHIFT', level: 'warning', icon: '😟',
                    message: `نسبة المقالات السلبية مرتفعة (${negPct}%). يُنصح بالمراجعة`,
                    timestamp: now.toISOString()
                });
            }
            const posPct = Math.round((positive / total) * 100);
            if (posPct > 60) {
                newAlerts.push({
                    type: 'POSITIVE_TREND', level: 'info', icon: '😊',
                    message: `اتجاه إيجابي ملحوظ — ${posPct}% من المقالات ذات مشاعر إيجابية`,
                    timestamp: now.toISOString()
                });
            }
        }
    }

    // 5. جودة المحتوى
    if (analytics.qualityMetrics && analytics.qualityMetrics.avgRichnessScore < 50) {
        newAlerts.push({
            type: 'QUALITY_DROP', level: 'warning', icon: '⚠️',
            message: `متوسط جودة المحتوى منخفض (${analytics.qualityMetrics.avgRichnessScore}/100)`,
            timestamp: now.toISOString()
        });
    }

    // 6. انخفاض النشر
    if (analytics.timeSeries && analytics.timeSeries.dataMonth && analytics.timeSeries.dataMonth.length >= 2) {
        const last = analytics.timeSeries.dataMonth[analytics.timeSeries.dataMonth.length - 1];
        const prev = analytics.timeSeries.dataMonth[analytics.timeSeries.dataMonth.length - 2];
        if (prev > 0 && last < prev * 0.5) {
            newAlerts.push({
                type: 'FREQUENCY_DROP', level: 'warning', icon: '📉',
                message: `انخفاض حاد في النشر: ${last} مقال مقارنة بـ ${prev} الشهر السابق`,
                timestamp: now.toISOString()
            });
        }
    }

    // 7. إنجازات
    if (analytics.global) {
        const total = analytics.global.totalArticles;
        for (const m of [1000, 2000, 3000, 5000, 7500, 10000]) {
            if (total >= m && total < m + 200) {
                newAlerts.push({
                    type: 'MILESTONE', level: 'info', icon: '🎉',
                    message: `تهانينا! تجاوز الأرشيف ${m.toLocaleString()} مقال!`,
                    timestamp: now.toISOString()
                });
                break;
            }
        }
    }

    // دمج وإزالة التكرار
    const allAlerts = [...newAlerts, ...existingAlerts];
    const seen = new Set();
    const unique = allAlerts.filter(a => {
        const sig = `${a.type}-${a.timestamp.split('T')[0]}`;
        if (seen.has(sig)) return false;
        seen.add(sig); return true;
    }).slice(0, 50);

    fs.writeFileSync(ALERTS_FILE, JSON.stringify(unique, null, 2), 'utf8');
    console.log(`   ✅ ${newAlerts.length} تنبيهات جديدة. الإجمالي: ${unique.length}`);
}

generateAlerts();
