const fs = require('fs');

const [file, url, profile] = process.argv.slice(2);

if (!file || !url || !profile) {
  console.error('Usage: lighthouse-summary.js <report.json> <url> <profile>');
  process.exit(1);
}

const result = JSON.parse(fs.readFileSync(file, 'utf8'));
const categories = result.categories || {};
const audits = result.audits || {};

const score = (id) => Math.round(((categories[id] && categories[id].score) || 0) * 100);
const value = (id) => audits[id] && audits[id].numericValue;
const seconds = (id) => (typeof value(id) === 'number' ? `${(value(id) / 1000).toFixed(1)}s` : 'n/a');
const number = (id, digits = 0) => (typeof value(id) === 'number' ? value(id).toFixed(digits) : 'n/a');

console.log([
  profile,
  url,
  `P${score('performance')}`,
  `A${score('accessibility')}`,
  `BP${score('best-practices')}`,
  `SEO${score('seo')}`,
  `FCP=${seconds('first-contentful-paint')}`,
  `LCP=${seconds('largest-contentful-paint')}`,
  `TBT=${number('total-blocking-time')}ms`,
  `CLS=${number('cumulative-layout-shift', 3)}`,
  `SI=${seconds('speed-index')}`,
].join(' | '));
