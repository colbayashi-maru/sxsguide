// Folds a SINGLE_FILE build into one self-contained HTML page for hosting
// somewhere that cannot serve the app's extra chunks.
//
//   SINGLE_FILE=1 BASE_PATH=./ npm run build
//   node scripts/bundle-single-file.mjs <output.html>
//
// Everything ships inline, so the page makes no requests of its own.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const out = process.argv[2];
if (!out) {
  console.error('usage: node scripts/bundle-single-file.mjs <output.html>');
  process.exit(1);
}

const assets = readdirSync(join(DIST, 'assets'));
const scripts = assets.filter((f) => f.endsWith('.js'));
const styles = assets.filter((f) => f.endsWith('.css'));

if (scripts.length !== 1) {
  console.error(
    `Expected exactly one JS chunk, found ${scripts.length}: ${scripts.join(', ')}\n` +
    'Build with SINGLE_FILE=1 so dynamic imports are inlined.');
  process.exit(1);
}

const read = (f) => readFileSync(join(DIST, 'assets', f), 'utf8');

// A closing tag inside a string literal would end the element early, so break
// the sequence. The escape is inert in JS and CSS alike.
const safeJs = read(scripts[0]).replaceAll('</script', '<\\/script');
const css = styles.map(read).join('\n').replaceAll('</style', '<\\/style');

const html = `<title>SxS Guide</title>
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;

writeFileSync(out, html);
const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`${out}: ${mb} MB, ${scripts[0]} + ${styles.length} stylesheet(s) inlined`);
