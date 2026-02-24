const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const DATA_FILE = path.join(__dirname, '..', 'data', 'raw_articles.json');
const BASE_URL = 'https://www.scouts.org.sa/ar/';
const NEWS_URL = `${BASE_URL}include/plugins/news/news.php?action=l&id=6`;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const headers = { 'User-Agent': 'ScoutMediaIntelBot/1.0 (+https://github.com/scout-media-intel)' };

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await axios.get(url, { headers, httpsAgent, timeout: 15000 });
            return cheerio.load(res.data);
        } catch (e) {
            console.error(`Error fetching ${url}: ${e.message}. Retrying... (${i + 1}/${retries})`);
            await sleep(2000 * (i + 1));
        }
    }
    return null;
}

function loadExistingData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            console.error('Error reading existing data:', e.message);
            return [];
        }
    }
    return [];
}

function normalizeDate(dateStr) {
    if (!dateStr) return null;
    // Format: DD-MM-YY HH:MM AM/PM
    const match = dateStr.match(/(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        let [_, d, m, y] = match;
        y = '20' + y;
        return `${y}-${m}-${d}`;
    }
    return dateStr;
}

async function scrapeArticle(url) {
    const $ = await fetchPage(url);
    if (!$) return null;

    const title = $('h1').first().text().trim() || $('title').text().trim();
    const dateHtml = $('span[itemprop="datePublished"]').text().trim() || '';
    const date = normalizeDate(dateHtml);

    let views = 0;
    const viewsHtml = $('.dimviews').text().trim();
    if (viewsHtml) {
        views = parseInt(viewsHtml.replace(/\D/g, ''), 10) || 0;
    }

    const content = $('#textcontent').text().trim().replace(/\s+/g, ' ');

    return { title, url, date, views, content, scrapedAt: new Date().toISOString() };
}

async function scrapeAll() {
    console.log('--- Starting Data Collection Engine ---');
    const existing = loadExistingData();
    const existingUrls = new Set(existing.map(a => a.url));
    console.log(`Found ${existing.length} existing articles.`);

    let pageNum = 1;
    let hasNextPage = true;
    let newArticles = [];

    // Stop if we see fully matched pages
    const MAX_CONSECUTIVE_EXISTING = 15;
    let consecutiveExistingCount = 0;

    while (hasNextPage) {
        const pageUrl = pageNum === 1 ? NEWS_URL : `${NEWS_URL}&page=${pageNum}`;
        console.log(`Fetching list page ${pageNum}...`);

        const $ = await fetchPage(pageUrl);
        if (!$) break;

        const links = [];
        $('a[href*="action=s"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('news.php')) {
                links.push(href.startsWith('http') ? href : BASE_URL + href);
            }
        });

        // Unique links
        const uniqueLinks = [...new Set(links)];
        if (uniqueLinks.length === 0) {
            console.log('No news links found on page. Stopping.');
            break;
        }

        let pageHadNew = false;

        for (const link of uniqueLinks) {
            if (existingUrls.has(link)) {
                console.log(`Skipping already scraped: ${link}`);
                consecutiveExistingCount++;
                continue;
            }
            consecutiveExistingCount = 0;
            pageHadNew = true;

            console.log(`Scraping article: ${link}`);
            const article = await scrapeArticle(link);
            if (article && article.content) {
                newArticles.push(article);
                existingUrls.add(link);
            }
            await sleep(1000); // obey rate limits
        }

        // If we found a lot of consecutive existing articles across pages, assume we caught up
        if (!pageHadNew && consecutiveExistingCount > MAX_CONSECUTIVE_EXISTING) {
            console.log('Reached overlapping existing articles. Halting crawl.');
            break;
        }

        // Check if there is a next page
        const nextPageLink = $(`a[href*="page=${pageNum + 1}"]`).length > 0;
        if (!nextPageLink && pageNum > 1) { // the first page might not have a page=2 link explicitly labeled as next
            // Wait, actually many pages exist. Let's just check if `uniqueLinks` was not empty.
            if (!pageHadNew && uniqueLinks.length < 5) hasNextPage = false;
        } else {
            pageNum++;
        }

        // Safety cap for initial crawl to not take forever if it's huge, though user said "all pages".
        // There are ~350+ pages. If we want all, this script will run completely on github actions.
        // For now, I'll limit the "dev" run to a few pages unless in GH actions.
        if (process.env.DEV_LIMIT && pageNum > parseInt(process.env.DEV_LIMIT, 10)) {
            console.log(`Dev limit reached (${process.env.DEV_LIMIT} pages).`);
            break;
        }
    }

    if (newArticles.length > 0) {
        const finalData = [...newArticles, ...existing];
        // Sort by date descending
        finalData.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2), 'utf8');
        console.log(`Saved ${newArticles.length} new articles to ${DATA_FILE}`);
    } else {
        console.log('No new articles found. Data is up to date.');
    }
}

scrapeAll().catch(console.error);
