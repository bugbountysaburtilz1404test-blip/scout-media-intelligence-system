/* ═════════════════════════════════════════════
   نظام ذكاء الكشافة — محرك لوحة التحكم 3.0
   كل شيء بالعربي الكامل
   ═════════════════════════════════════════════ */

let allArticles = [];
let filteredArticles = [];
let currentPage = 1;
let perPage = 10;

const COLORS = {
    purple: '#7c3aed', purpleLight: '#a78bfa', purpleDark: '#5b21b6',
    green: '#006c35', gold: '#d4a843',
    success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
    text: '#a399c4', grid: 'rgba(124,58,237,0.06)',
    palette: ['#7c3aed', '#a855f7', '#6366f1', '#006c35', '#d4a843', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6']
};

document.addEventListener('DOMContentLoaded', async () => {
    createParticles();
    try {
        const [analytics, alerts, articles] = await Promise.all([
            fetch('data/analytics.json').then(r => r.json()),
            fetch('data/alerts.json').then(r => r.json()),
            fetch('data/processed_articles.json').then(r => r.json())
        ]);

        allArticles = articles;
        filteredArticles = [...articles];

        renderKPIs(analytics);
        renderSentimentChart(analytics);
        renderReadingTimeChart(analytics);
        renderGradeChart(analytics);
        renderTrendChart(analytics);
        renderYearChart(analytics);
        renderTopicChart(analytics);
        renderCityChart(analytics);
        renderRadarChart(analytics);
        renderEntities(analytics);
        renderKeywords(analytics);
        renderAlerts(alerts);
        populateFilters(articles);
        renderArticles();

        document.getElementById('lastUpdated').textContent =
            `آخر تحديث: ${new Date(analytics.updatedAt).toLocaleString('ar-SA')}`;

        setupEventListeners();

        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('app').style.opacity = '1';
            setupScrollAnimations();
        }, 900);

    } catch (e) {
        console.error('خطأ في تحميل البيانات:', e);
        document.getElementById('loadingScreen').innerHTML =
            '<div style="text-align:center"><p style="color:#ef4444;font-size:1rem;margin-bottom:8px">❌ خطأ في تحميل البيانات</p><p style="color:#6e6391;font-size:0.8rem">تأكد من وجود ملفات البيانات في مجلد data/</p></div>';
    }
});

// ═════════════════════════════════════════════
// الجزيئات المتحركة
// ═════════════════════════════════════════════
function createParticles() {
    const c = document.getElementById('particles');
    if (!c) return;
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (10 + Math.random() * 18) + 's';
        p.style.animationDelay = Math.random() * 12 + 's';
        p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
        p.style.background = Math.random() > 0.6
            ? 'rgba(124, 58, 237, 0.2)' : 'rgba(168, 85, 247, 0.15)';
        c.appendChild(p);
    }
}

// ═════════════════════════════════════════════
// عداد متحرك
// ═════════════════════════════════════════════
function animateCounter(el, target, duration = 1500) {
    if (!el) return;
    if (typeof target === 'string') { el.textContent = target; return; }
    const startTime = performance.now();
    function tick(now) {
        const p = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('ar-SA');
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ═════════════════════════════════════════════
// بطاقات KPI
// ═════════════════════════════════════════════
function renderKPIs(data) {
    animateCounter(document.getElementById('kpi-total'), data.global.totalArticles);
    animateCounter(document.getElementById('kpi-views'), data.global.averageViews);
    animateCounter(document.getElementById('kpi-totalViews'), data.global.totalViews);
    animateCounter(document.getElementById('kpi-richness'), data.qualityMetrics.avgRichnessScore);
    document.getElementById('kpi-city').textContent = data.global.mostCoveredCity || 'غير محدد';
    document.getElementById('kpi-day').textContent = data.global.mostActiveDay || '-';
    const growthEl = document.getElementById('kpi-growth');
    if (growthEl) growthEl.textContent = `معدل النمو: ${data.timeSeries.monthlyGrowthRate || '0%'}`;
}

// ═════════════════════════════════════════════
// رسم المشاعر
// ═════════════════════════════════════════════
function renderSentimentChart(data) {
    if (!data.sentiment) return;
    const ctx = document.getElementById('sentimentChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['إيجابي', 'محايد', 'سلبي'],
            datasets: [{
                data: [data.sentiment.positive, data.sentiment.neutral, data.sentiment.negative],
                backgroundColor: [COLORS.success, COLORS.warning, COLORS.danger],
                borderWidth: 0, cutout: '68%'
            }]
        },
        options: chartOptions({ legend: false })
    });

    document.getElementById('sent-pos').textContent = data.sentiment.positive.toLocaleString();
    document.getElementById('sent-neutral').textContent = data.sentiment.neutral.toLocaleString();
    document.getElementById('sent-neg').textContent = data.sentiment.negative.toLocaleString();
}

// ═════════════════════════════════════════════
// رسم وقت القراءة
// ═════════════════════════════════════════════
function renderReadingTimeChart(data) {
    if (!data.readingTime) return;
    const ctx = document.getElementById('readingTimeChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['سريع (أقل من دقيقتين)', 'متوسط (2-5 دقائق)', 'طويل (أكثر من 5 دقائق)'],
            datasets: [{
                data: [data.readingTime.quick, data.readingTime.medium, data.readingTime.long],
                backgroundColor: [COLORS.purple, COLORS.gold, COLORS.green],
                borderWidth: 0, cutout: '55%'
            }]
        },
        options: chartOptions({ legend: true, legendPos: 'bottom' })
    });
}

// ═════════════════════════════════════════════
// رسم التقييمات
// ═════════════════════════════════════════════
function renderGradeChart(data) {
    if (!data.qualityMetrics || !data.qualityMetrics.gradeDistribution) return;
    const ctx = document.getElementById('gradeChart');
    if (!ctx) return;

    const gd = data.qualityMetrics.gradeDistribution;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(gd),
            datasets: [{
                label: 'عدد المقالات',
                data: Object.values(gd),
                backgroundColor: [COLORS.success, '#3b82f6', COLORS.purple, COLORS.warning, COLORS.danger],
                borderRadius: 6, borderSkipped: false, borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: tooltipConfig() },
            scales: {
                y: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text, font: { family: 'Tajawal' } } },
                x: { grid: { display: false }, ticks: { color: COLORS.text, font: { family: 'Tajawal', size: 11 } } }
            }
        }
    });
}

// ═════════════════════════════════════════════
// اتجاه النشر
// ═════════════════════════════════════════════
function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    const n = Math.min(36, data.timeSeries.labelsMonth.length);
    const labels = data.timeSeries.labelsMonth.slice(-n);
    const dataArr = data.timeSeries.dataMonth.slice(-n);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'عدد المقالات',
                data: dataArr,
                borderColor: COLORS.purple,
                backgroundColor: createGradient(ctx, COLORS.purple),
                tension: 0.4, fill: true, borderWidth: 2.5,
                pointRadius: 0, pointHoverRadius: 6,
                pointHoverBackgroundColor: COLORS.purple,
                pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: tooltipConfig() },
            scales: {
                y: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text, font: { family: 'Tajawal' } } },
                x: { grid: { display: false }, ticks: { color: COLORS.text, font: { family: 'Tajawal', size: 10 }, maxRotation: 45 } }
            }
        }
    });
}

function createGradient(ctx, color) {
    const canvas = ctx.getContext ? ctx : ctx.canvas;
    const g = canvas.getContext('2d').createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, color + '30');
    g.addColorStop(1, color + '00');
    return g;
}

// ═════════════════════════════════════════════
// المقارنة السنوية
// ═════════════════════════════════════════════
function renderYearChart(data) {
    const ctx = document.getElementById('yearChart');
    if (!ctx) return;

    const labels = data.yearComparison ? data.yearComparison.labels : data.timeSeries.labelsYear;
    const yearData = data.yearComparison ? data.yearComparison.data : data.timeSeries.dataYear;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'مقالات سنوية',
                data: yearData,
                backgroundColor: labels.map((_, i) => COLORS.palette[i % COLORS.palette.length] + '70'),
                borderColor: labels.map((_, i) => COLORS.palette[i % COLORS.palette.length]),
                borderWidth: 1.5, borderRadius: 6, borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: tooltipConfig() },
            scales: {
                y: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text, font: { family: 'Tajawal' } } },
                x: { grid: { display: false }, ticks: { color: COLORS.text, font: { family: 'Tajawal' } } }
            }
        }
    });
}

// ═════════════════════════════════════════════
// المواضيع
// ═════════════════════════════════════════════
function renderTopicChart(data) {
    const ctx = document.getElementById('topicChart');
    if (!ctx) return;

    const labels = Object.keys(data.global.topicDistribution);
    const counts = Object.values(data.global.topicDistribution);
    if (labels.length === 0) { showEmpty(ctx); return; }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels, datasets: [{
                data: counts,
                backgroundColor: COLORS.palette.slice(0, labels.length),
                borderWidth: 0, cutout: '50%', borderRadius: 3
            }]
        },
        options: chartOptions({ legend: true, legendPos: 'right' })
    });
}

// ═════════════════════════════════════════════
// المدن
// ═════════════════════════════════════════════
function renderCityChart(data) {
    const ctx = document.getElementById('cityChart');
    if (!ctx) return;

    const sorted = Object.entries(data.global.cityDistribution || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (sorted.length === 0) { showEmpty(ctx); return; }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: 'عدد الإشارات',
                data: sorted.map(x => x[1]),
                backgroundColor: COLORS.purple + '50',
                borderColor: COLORS.purple,
                borderWidth: 1.5, borderRadius: 6, borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: tooltipConfig() },
            scales: {
                x: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text, font: { family: 'Tajawal' } } },
                y: { grid: { display: false }, ticks: { color: COLORS.text, font: { family: 'Tajawal', size: 12 } } }
            }
        }
    });
}

// ═════════════════════════════════════════════
// الرادار
// ═════════════════════════════════════════════
function renderRadarChart(data) {
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;

    const labels = Object.keys(data.global.topicDistribution);
    const counts = Object.values(data.global.topicDistribution);
    if (labels.length < 3) { showEmpty(ctx); return; }

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels,
            datasets: [{
                label: 'تغطية المواضيع',
                data: counts,
                backgroundColor: COLORS.purple + '18',
                borderColor: COLORS.purple,
                borderWidth: 2,
                pointBackgroundColor: COLORS.purple,
                pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: tooltipConfig() },
            scales: {
                r: {
                    angleLines: { color: COLORS.grid },
                    grid: { color: COLORS.grid },
                    pointLabels: { color: COLORS.text, font: { family: 'Tajawal', size: 11, weight: '600' } },
                    ticks: { display: false }
                }
            }
        }
    });
}

// ═════════════════════════════════════════════
// الكيانات (أشخاص ومنظمات)
// ═════════════════════════════════════════════
function renderEntities(data) {
    renderEntityList('peopleList', data.entities?.topPeople || [], '👤');
    renderEntityList('orgsList', data.entities?.topOrganizations || [], '🏛️');
}

function renderEntityList(containerId, items, icon) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';

    if (items.length === 0) {
        el.innerHTML = '<p class="empty-state">لم يتم العثور على كيانات</p>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'entity-item';
        div.innerHTML = `
            <span class="entity-name">${icon} ${item.name}</span>
            <span class="entity-count">${item.count} إشارة</span>
        `;
        el.appendChild(div);
    });
}

// ═════════════════════════════════════════════
// الكلمات المفتاحية
// ═════════════════════════════════════════════
function renderKeywords(data) {
    const cloud = document.getElementById('keywordsCloud');
    if (!cloud) return;
    cloud.innerHTML = '';

    const top = (data.global.topWords || []).slice(0, 30);
    if (top.length === 0) return;
    const max = top[0].count;

    top.forEach(kw => {
        const span = document.createElement('span');
        span.className = 'keyword-tag';
        span.textContent = kw.word;
        const ratio = kw.count / max;
        span.style.fontSize = `${0.7 + ratio * 0.9}rem`;
        span.style.opacity = 0.5 + ratio * 0.5;
        span.title = `${kw.word}: ${kw.count.toLocaleString()} تكرار`;
        cloud.appendChild(span);
    });
}

// ═════════════════════════════════════════════
// التنبيهات
// ═════════════════════════════════════════════
function renderAlerts(alerts) {
    const list = document.getElementById('alertsList');
    if (!list) return;
    list.innerHTML = '';

    if (!alerts || alerts.length === 0) {
        list.innerHTML = '<p class="empty-state">لا توجد تنبيهات حالية</p>';
        return;
    }

    alerts.slice(0, 15).forEach(alert => {
        const div = document.createElement('div');
        div.className = `alert-item ${alert.level || 'info'}`;
        div.innerHTML = `
            <span class="alert-icon">${alert.icon || '📋'}</span>
            <div class="alert-body">
                <div class="alert-msg">${alert.message}</div>
                <div class="alert-time">${new Date(alert.timestamp).toLocaleString('ar-SA')}</div>
            </div>
        `;
        list.appendChild(div);
    });
}

// ═════════════════════════════════════════════
// جدول المقالات
// ═════════════════════════════════════════════
function renderArticles() {
    const tbody = document.getElementById('articlesTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    const start = (currentPage - 1) * perPage;
    const pageArticles = filteredArticles.slice(start, start + perPage);

    // معلومات الجدول
    const infoEl = document.getElementById('tableInfo');
    if (infoEl) {
        infoEl.textContent = `عرض ${start + 1} - ${Math.min(start + perPage, filteredArticles.length)} من ${filteredArticles.length.toLocaleString()} مقال`;
    }

    pageArticles.forEach(a => {
        const sentClass = { 'إيجابي': 'badge-positive', 'سلبي': 'badge-negative' }[a.sentiment?.label] || 'badge-neutral';
        const sentText = a.sentiment?.label || 'محايد';
        const qScore = a.contentQuality?.richnessScore || 0;
        const qColor = qScore >= 80 ? '#10b981' : qScore >= 60 ? '#f59e0b' : '#ef4444';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="max-width:250px;"><a href="${a.url}" target="_blank">${a.title}</a></td>
            <td style="white-space:nowrap;">${a.date || '-'}</td>
            <td>${(a.views || 0).toLocaleString()}</td>
            <td><span class="badge badge-theme">${a.primaryTheme || '-'}</span></td>
            <td>${a.mostMentionedCity || '-'}</td>
            <td><span class="badge ${sentClass}">${sentText}</span></td>
            <td>
                <span style="color:${qColor};font-weight:700">${qScore}</span>
                <span class="quality-bar"><span class="quality-fill" style="width:${qScore}%;background:${qColor}"></span></span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination();
}

// ═════════════════════════════════════════════
// التصفح
// ═════════════════════════════════════════════
function renderPagination() {
    const c = document.getElementById('pagination');
    if (!c) return;
    c.innerHTML = '';

    const totalPages = Math.ceil(filteredArticles.length / perPage);
    if (totalPages <= 1) return;

    const maxV = 7;
    let s = Math.max(1, currentPage - Math.floor(maxV / 2));
    let e = Math.min(totalPages, s + maxV - 1);
    if (e - s < maxV - 1) s = Math.max(1, e - maxV + 1);

    if (currentPage > 1) c.appendChild(createPageBtn('السابق', () => { currentPage--; renderArticles(); }));
    for (let i = s; i <= e; i++) {
        const btn = createPageBtn(i, () => { currentPage = i; renderArticles(); });
        if (i === currentPage) btn.classList.add('active');
        c.appendChild(btn);
    }
    if (currentPage < totalPages) c.appendChild(createPageBtn('التالي', () => { currentPage++; renderArticles(); }));
}

function createPageBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'page-btn'; btn.textContent = text;
    btn.addEventListener('click', onClick); return btn;
}

// ═════════════════════════════════════════════
// الفلاتر
// ═════════════════════════════════════════════
function populateFilters(articles) {
    const themeSelect = document.getElementById('themeFilter');
    if (!themeSelect) return;
    const themes = new Set();
    articles.forEach(a => { if (a.primaryTheme) themes.add(a.primaryTheme); });
    themes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t;
        themeSelect.appendChild(opt);
    });
}

function applyFilters() {
    const search = (document.getElementById('articleSearch')?.value || '').toLowerCase();
    const theme = document.getElementById('themeFilter')?.value || '';
    const sentiment = document.getElementById('sentimentFilter')?.value || '';

    filteredArticles = allArticles.filter(a => {
        const matchSearch = !search || a.title.toLowerCase().includes(search);
        const matchTheme = !theme || a.primaryTheme === theme;
        const matchSentiment = !sentiment || a.sentiment?.label === sentiment;
        return matchSearch && matchTheme && matchSentiment;
    });

    currentPage = 1;
    renderArticles();
}

// ═════════════════════════════════════════════
// تصدير CSV محسّن
// ═════════════════════════════════════════════
function exportCSV() {
    const headers = ['العنوان', 'التاريخ', 'المشاهدات', 'الكلمات', 'الموضوع الرئيسي', 'الموضوع الثانوي', 'المدينة', 'المشاعر', 'درجة المشاعر', 'الجودة', 'التقييم', 'وقت القراءة (دقيقة)', 'الرابط'];
    const rows = filteredArticles.map(a => [
        `"${(a.title || '').replace(/"/g, '""')}"`,
        a.date || '',
        a.views || 0,
        a.wordCount || 0,
        a.primaryTheme || '',
        a.secondaryTheme || '',
        a.mostMentionedCity || '',
        a.sentiment?.label || '',
        a.sentiment?.score || 0,
        a.contentQuality?.richnessScore || 0,
        a.contentQuality?.grade || '',
        a.readingTimeMin || 0,
        a.url || ''
    ]);

    const bom = '\uFEFF';
    const csv = bom + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ذكاء-الكشافة-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// ═════════════════════════════════════════════
// أحداث
// ═════════════════════════════════════════════
function setupEventListeners() {
    let timeout;
    document.getElementById('articleSearch')?.addEventListener('input', () => {
        clearTimeout(timeout); timeout = setTimeout(applyFilters, 300);
    });
    document.getElementById('themeFilter')?.addEventListener('change', applyFilters);
    document.getElementById('sentimentFilter')?.addEventListener('change', applyFilters);
    document.getElementById('perPage')?.addEventListener('change', (e) => {
        perPage = parseInt(e.target.value, 10); currentPage = 1; renderArticles();
    });
    document.getElementById('btnExport')?.addEventListener('click', exportCSV);
}

// ═════════════════════════════════════════════
// أنيميشن التمرير
// ═════════════════════════════════════════════
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 80);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });
    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

// ═════════════════════════════════════════════
// أدوات مساعدة للرسوم البيانية
// ═════════════════════════════════════════════
function tooltipConfig() {
    return {
        backgroundColor: 'rgba(12, 10, 26, 0.95)',
        titleFont: { family: 'Tajawal', weight: '700' },
        bodyFont: { family: 'Tajawal' },
        borderColor: 'rgba(124, 58, 237, 0.3)',
        borderWidth: 1, padding: 10, rtl: true, textDirection: 'rtl'
    };
}

function chartOptions({ legend = false, legendPos = 'bottom' }) {
    return {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: legend ? {
                position: legendPos,
                labels: { color: COLORS.text, font: { family: 'Tajawal', size: 11 }, padding: 10, usePointStyle: true }
            } : { display: false },
            tooltip: tooltipConfig()
        }
    };
}

function showEmpty(ctx) {
    ctx.parentElement.innerHTML = '<p class="empty-state">لا توجد بيانات كافية للعرض</p>';
}
