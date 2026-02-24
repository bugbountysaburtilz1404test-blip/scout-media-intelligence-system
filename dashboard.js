/* ═══════════════════════════════════════
   SCOUT INTELLIGENCE — DASHBOARD ENGINE v2.0
   ═══════════════════════════════════════ */

// Global state
let allArticles = [];
let filteredArticles = [];
let currentPage = 1;
let perPage = 10;

// Color palette
const COLORS = {
    accent1: '#00d4aa',
    accent2: '#7c3aed',
    accent3: '#3b82f6',
    pink: '#ec4899',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    text: '#94a3b8',
    grid: 'rgba(255,255,255,0.04)',
    chartColors: [
        '#00d4aa', '#7c3aed', '#3b82f6', '#ec4899', '#f59e0b',
        '#ef4444', '#06b6d4', '#8b5cf6', '#10b981', '#f97316'
    ]
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

        // Render everything
        renderKPIs(analytics);
        renderSentimentChart(analytics);
        renderReadingTimeChart(analytics);
        renderQuickStats(analytics);
        renderTrendChart(analytics);
        renderYearChart(analytics);
        renderTopicChart(analytics);
        renderCityChart(analytics);
        renderRadarChart(analytics);
        renderKeywords(analytics);
        renderAlerts(alerts);
        populateFilters(articles);
        renderArticles();

        document.getElementById('lastUpdated').textContent =
            `آخر تحديث: ${new Date(analytics.updatedAt).toLocaleString('ar-SA')}`;

        // Event listeners
        setupEventListeners();

        // Hide loading, show app
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('app').style.opacity = '1';
            setupScrollAnimations();
        }, 800);

    } catch (e) {
        console.error('Error loading dashboard data:', e);
        document.getElementById('loadingScreen').innerHTML =
            '<p style="color: #ef4444; font-size: 1.1rem;">خطأ في تحميل البيانات</p>';
    }
});

// ═══════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 15) + 's';
        p.style.animationDelay = Math.random() * 10 + 's';
        p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
        p.style.background = Math.random() > 0.5
            ? 'rgba(0, 212, 170, 0.2)'
            : 'rgba(124, 58, 237, 0.2)';
        container.appendChild(p);
    }
}

// ═══════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════
function animateCounter(el, target, duration = 1500) {
    const start = 0;
    const startTime = performance.now();
    const isString = typeof target === 'string';

    if (isString) {
        el.textContent = target;
        return;
    }

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.round(start + (target - start) * eased);
        el.textContent = current.toLocaleString('ar-SA');
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ═══════════════════════════════════════
// KPIs
// ═══════════════════════════════════════
function renderKPIs(data) {
    animateCounter(document.getElementById('kpi-total'), data.global.totalArticles);
    animateCounter(document.getElementById('kpi-views'), data.global.averageViews);
    document.getElementById('kpi-city').textContent = data.global.mostCoveredCity || 'غير محدد';
    animateCounter(document.getElementById('kpi-richness'), data.qualityMetrics.avgRichnessScore);
}

// ═══════════════════════════════════════
// SENTIMENT CHART
// ═══════════════════════════════════════
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
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 22, 41, 0.9)',
                    titleFont: { family: 'Tajawal' },
                    bodyFont: { family: 'Tajawal' },
                    borderColor: 'rgba(124, 58, 237, 0.3)',
                    borderWidth: 1,
                    rtl: true
                }
            }
        }
    });

    // Update stats
    document.getElementById('sent-pos').textContent = data.sentiment.positive.toLocaleString();
    document.getElementById('sent-neutral').textContent = data.sentiment.neutral.toLocaleString();
    document.getElementById('sent-neg').textContent = data.sentiment.negative.toLocaleString();
}

// ═══════════════════════════════════════
// READING TIME CHART
// ═══════════════════════════════════════
function renderReadingTimeChart(data) {
    if (!data.readingTime) return;
    const ctx = document.getElementById('readingTimeChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['سريع (<2 دقيقة)', 'متوسط (2-5 دقائق)', 'طويل (5+ دقائق)'],
            datasets: [{
                data: [data.readingTime.quick, data.readingTime.medium, data.readingTime.long],
                backgroundColor: [COLORS.accent1, COLORS.accent2, COLORS.pink],
                borderWidth: 0,
                cutout: '60%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: COLORS.text, font: { family: 'Tajawal', size: 11 }, padding: 12 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 22, 41, 0.9)',
                    titleFont: { family: 'Tajawal' },
                    bodyFont: { family: 'Tajawal' },
                    rtl: true
                }
            }
        }
    });
}

// ═══════════════════════════════════════
// QUICK STATS
// ═══════════════════════════════════════
function renderQuickStats(data) {
    animateCounter(document.getElementById('stat-totalViews'), data.global.totalViews || 0);
    animateCounter(document.getElementById('stat-avgWords'), data.global.averageWordLength || 0);
    document.getElementById('stat-activeDay').textContent = data.global.mostActiveDay || '-';
    document.getElementById('stat-growth').textContent = data.timeSeries.monthlyGrowthRate || '0%';
}

// ═══════════════════════════════════════
// TREND CHART
// ═══════════════════════════════════════
function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    // Show only last 36 months for readability
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
                borderColor: COLORS.accent1,
                backgroundColor: createGradient(ctx, COLORS.accent1),
                tension: 0.4,
                fill: true,
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: COLORS.accent1,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 22, 41, 0.95)',
                    titleFont: { family: 'Tajawal', weight: '700' },
                    bodyFont: { family: 'Tajawal' },
                    borderColor: 'rgba(0, 212, 170, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    rtl: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: COLORS.grid },
                    ticks: { color: COLORS.text, font: { family: 'Tajawal', size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: COLORS.text, font: { family: 'Tajawal', size: 10 }, maxRotation: 45 }
                }
            }
        }
    });
}

function createGradient(ctx, color) {
    const canvas = ctx.getContext ? ctx : ctx.canvas;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color + '33');
    gradient.addColorStop(1, color + '00');
    return gradient;
}

// ═══════════════════════════════════════
// YEAR CHART
// ═══════════════════════════════════════
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
                backgroundColor: labels.map((_, i) =>
                    COLORS.chartColors[i % COLORS.chartColors.length] + '80'
                ),
                borderColor: labels.map((_, i) =>
                    COLORS.chartColors[i % COLORS.chartColors.length]
                ),
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(15,22,41,0.95)', rtl: true, titleFont: { family: 'Tajawal' }, bodyFont: { family: 'Tajawal' } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text, font: { family: 'Tajawal' } } },
                x: { grid: { display: false }, ticks: { color: COLORS.text, font: { family: 'Tajawal' } } }
            }
        }
    });
}

// ═══════════════════════════════════════
// TOPIC CHART
// ═══════════════════════════════════════
function renderTopicChart(data) {
    const ctx = document.getElementById('topicChart');
    if (!ctx) return;

    const labels = Object.keys(data.global.topicDistribution);
    const counts = Object.values(data.global.topicDistribution);

    if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 60px;">لا توجد بيانات كافية</p>';
        return;
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: counts,
                backgroundColor: COLORS.chartColors.slice(0, labels.length),
                borderWidth: 0,
                cutout: '55%',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: COLORS.text, font: { family: 'Tajawal', size: 12 }, padding: 14, usePointStyle: true }
                },
                tooltip: { backgroundColor: 'rgba(15,22,41,0.95)', rtl: true, titleFont: { family: 'Tajawal' }, bodyFont: { family: 'Tajawal' } }
            }
        }
    });
}

// ═══════════════════════════════════════
// CITY CHART
// ═══════════════════════════════════════
function renderCityChart(data) {
    const ctx = document.getElementById('cityChart');
    if (!ctx) return;

    const sorted = Object.entries(data.global.cityDistribution || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    if (sorted.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 60px;">لا توجد بيانات كافية</p>';
        return;
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: 'تكرار المدن',
                data: sorted.map(x => x[1]),
                backgroundColor: COLORS.accent2 + '60',
                borderColor: COLORS.accent2,
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15,22,41,0.95)', rtl: true, titleFont: { family: 'Tajawal' }, bodyFont: { family: 'Tajawal' } } },
            scales: {
                x: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text, font: { family: 'Tajawal' } } },
                y: { grid: { display: false }, ticks: { color: COLORS.text, font: { family: 'Tajawal', size: 12 } } }
            }
        }
    });
}

// ═══════════════════════════════════════
// RADAR CHART
// ═══════════════════════════════════════
function renderRadarChart(data) {
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;

    const labels = Object.keys(data.global.topicDistribution);
    const counts = Object.values(data.global.topicDistribution);

    if (labels.length < 3) {
        ctx.parentElement.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 60px;">يحتاج 3 مواضيع على الأقل</p>';
        return;
    }

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels,
            datasets: [{
                label: 'تغطية المواضيع',
                data: counts,
                backgroundColor: COLORS.accent1 + '20',
                borderColor: COLORS.accent1,
                borderWidth: 2,
                pointBackgroundColor: COLORS.accent1,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(15,22,41,0.95)', rtl: true, titleFont: { family: 'Tajawal' }, bodyFont: { family: 'Tajawal' } }
            },
            scales: {
                r: {
                    angleLines: { color: COLORS.grid },
                    grid: { color: COLORS.grid },
                    pointLabels: { color: COLORS.text, font: { family: 'Tajawal', size: 12, weight: '600' } },
                    ticks: { display: false }
                }
            }
        }
    });
}

// ═══════════════════════════════════════
// KEYWORDS
// ═══════════════════════════════════════
function renderKeywords(data) {
    const cloud = document.getElementById('keywordsCloud');
    if (!cloud) return;
    cloud.innerHTML = '';

    const top = (data.global.topWords || []).slice(0, 25);
    if (top.length === 0) return;
    const max = top[0].count;

    top.forEach((kw, i) => {
        const span = document.createElement('span');
        span.className = 'keyword-tag';
        span.textContent = kw.word;
        const ratio = kw.count / max;
        const size = 0.75 + ratio * 1.0;
        span.style.fontSize = `${size}rem`;
        span.style.opacity = 0.5 + ratio * 0.5;
        span.style.animationDelay = (i * 0.05) + 's';
        span.title = `${kw.word}: ${kw.count.toLocaleString()} تكرار`;
        cloud.appendChild(span);
    });
}

// ═══════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════
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

// ═══════════════════════════════════════
// ARTICLES TABLE
// ═══════════════════════════════════════
function renderArticles() {
    const tbody = document.getElementById('articlesTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageArticles = filteredArticles.slice(start, end);

    pageArticles.forEach(a => {
        const sentimentBadge = getSentimentBadge(a.sentiment);
        const qualityColor = getQualityColor(a.contentQuality?.richnessScore || 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="max-width: 280px;"><a href="${a.url}" target="_blank">${a.title}</a></td>
            <td style="white-space:nowrap;">${a.date || '-'}</td>
            <td>${(a.views || 0).toLocaleString()}</td>
            <td><span class="badge badge-theme">${a.primaryTheme || '-'}</span></td>
            <td>${a.mostMentionedCity || '-'}</td>
            <td>${sentimentBadge}</td>
            <td>
                <span style="color: ${qualityColor}">${a.contentQuality?.richnessScore || 0}</span>
                <span class="quality-bar"><span class="quality-fill" style="width: ${a.contentQuality?.richnessScore || 0}%; background: ${qualityColor};"></span></span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination();
}

function getSentimentBadge(sentiment) {
    if (!sentiment) return '<span class="badge badge-neutral">-</span>';
    const map = {
        positive: { cls: 'badge-positive', text: 'إيجابي' },
        negative: { cls: 'badge-negative', text: 'سلبي' },
        neutral: { cls: 'badge-neutral', text: 'محايد' }
    };
    const s = map[sentiment.label] || map.neutral;
    return `<span class="badge ${s.cls}">${s.text}</span>`;
}

function getQualityColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
}

// ═══════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════
function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(filteredArticles.length / perPage);
    if (totalPages <= 1) return;

    const maxVisible = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Previous
    if (currentPage > 1) {
        const prev = createPageBtn('السابق', () => { currentPage--; renderArticles(); });
        container.appendChild(prev);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = createPageBtn(i, () => { currentPage = i; renderArticles(); });
        if (i === currentPage) btn.classList.add('active');
        container.appendChild(btn);
    }

    // Next
    if (currentPage < totalPages) {
        const next = createPageBtn('التالي', () => { currentPage++; renderArticles(); });
        container.appendChild(next);
    }
}

function createPageBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'page-btn';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
}

// ═══════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════
function populateFilters(articles) {
    const themeSelect = document.getElementById('themeFilter');
    if (!themeSelect) return;

    const themes = new Set();
    articles.forEach(a => { if (a.primaryTheme) themes.add(a.primaryTheme); });
    themes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        themeSelect.appendChild(opt);
    });
}

function applyFilters() {
    const search = document.getElementById('articleSearch')?.value?.toLowerCase() || '';
    const theme = document.getElementById('themeFilter')?.value || '';

    filteredArticles = allArticles.filter(a => {
        const matchSearch = !search || a.title.toLowerCase().includes(search);
        const matchTheme = !theme || a.primaryTheme === theme;
        return matchSearch && matchTheme;
    });

    currentPage = 1;
    renderArticles();
}

// ═══════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════
function exportCSV() {
    const headers = ['العنوان', 'التاريخ', 'المشاهدات', 'الموضوع', 'المدينة', 'المشاعر', 'الجودة', 'الرابط'];
    const rows = filteredArticles.map(a => [
        `"${(a.title || '').replace(/"/g, '""')}"`,
        a.date || '',
        a.views || 0,
        a.primaryTheme || '',
        a.mostMentionedCity || '',
        a.sentiment?.label || '',
        a.contentQuality?.richnessScore || 0,
        a.url || ''
    ]);

    const bom = '\uFEFF'; // UTF-8 BOM for Arabic
    const csv = bom + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scout-intelligence-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════
function setupEventListeners() {
    // Debounced search
    let searchTimeout;
    document.getElementById('articleSearch')?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });

    document.getElementById('themeFilter')?.addEventListener('change', applyFilters);

    document.getElementById('perPage')?.addEventListener('change', (e) => {
        perPage = parseInt(e.target.value, 10);
        currentPage = 1;
        renderArticles();
    });

    document.getElementById('btnExport')?.addEventListener('click', exportCSV);
}

// ═══════════════════════════════════════
// SCROLL ANIMATIONS
// ═══════════════════════════════════════
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, i * 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}
