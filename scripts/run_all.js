const { execSync } = require('child_process');
const path = require('path');

function runScript(scriptName) {
    console.log(`\n>> Running: ${scriptName}`);
    try {
        execSync(`node scripts/${scriptName}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (e) {
        console.error(`Error in ${scriptName}:`, e.message);
        process.exit(1);
    }
}

async function start() {
    console.log('--- STARTING MEDIA INTELLIGENCE PIPELINE ---');

    runScript('scraper.js');
    runScript('analyzer.js');
    runScript('analytics.js');
    runScript('alerts.js');
    runScript('report.js');

    console.log('\n--- PIPELINE COMPLETED SUCCESSFULLY ---');
}

start();
