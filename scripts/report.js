const fs = require('fs');
const path = require('path');
const { jsPDF } = require("jspdf");
const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');

const ANALYTICS_FILE = path.join(__dirname, '..', 'data', 'analytics.json');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

async function createChartImage(labels, data, title, type = 'bar') {
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Chart.js configuration
    const configuration = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: { display: true },
                title: { display: true, text: title }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    };

    // Instantiate Chart.js
    new Chart(ctx, configuration);
    return canvas.toBuffer('image/png');
}

async function generateReport() {
    console.log('--- Starting PDF Report Generator ---');

    if (!fs.existsSync(ANALYTICS_FILE)) {
        console.error('Analytics data not found.');
        return;
    }

    const analytics = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const reportPath = path.join(REPORTS_DIR, `${monthStr}-report.pdf`);

    const doc = new jsPDF();

    // Title
    doc.setFontSize(22);
    doc.text("Media Intelligence Executive Summary", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Report Period: ${monthStr}`, 105, 30, { align: "center" });

    // Global Stats
    doc.setFontSize(16);
    doc.text("Overview Stats", 20, 50);
    doc.setFontSize(12);
    doc.text(`Total Articles: ${analytics.global.totalArticles}`, 20, 60);
    doc.text(`Avg Views per Article: ${analytics.global.averageViews}`, 20, 70);
    doc.text(`Avg Word Count: ${analytics.global.averageWordLength}`, 20, 80);
    doc.text(`Growth Rate (Monthly): ${analytics.timeSeries.monthlyGrowthRate}`, 20, 90);

    // Top Keywords (Transliterate/Represent simply if font is missing)
    doc.setFontSize(16);
    doc.text("Top Keywords Distribution", 20, 110);
    const topKeywords = analytics.global.topWords.slice(0, 5);
    let ky = 120;
    topKeywords.forEach(kw => {
        doc.setFontSize(10);
        doc.text(`${kw.word}: ${kw.count}`, 25, ky);
        ky += 7;
    });

    // Generate and Add Chart
    console.log('Generating Monthly Trend Chart...');
    const chartLabels = analytics.timeSeries.labelsMonth;
    const chartData = analytics.timeSeries.dataMonth;
    const chartBuffer = await createChartImage(chartLabels, chartData, 'Articles Published per Month');

    // Add image to PDF
    doc.addImage(chartBuffer, 'PNG', 15, 160, 180, 90);

    // Save
    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync(reportPath, Buffer.from(pdfBuffer));

    console.log(`Report generated successfully: ${reportPath}`);
}

generateReport().catch(console.error);
