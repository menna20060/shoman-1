// Flat build for GitHub's web uploader (it cannot take folders): every file in ONE folder.
// English pages: index.html, about.html ...   Arabic pages: ar-index.html, ar-about.html ...
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage, FILES } from './src/render.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, process.argv[2] || 'site');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
let css = read('src/styles.css')
  .split('\n').filter((l) => !l.includes('/_blob/')).join('\n')   // dead artifact-only URLs
  .replaceAll('url(media/', 'url(');
fs.writeFileSync(path.join(out, 'styles.css'), css);
fs.copyFileSync(path.join(root, 'src/main.js'), path.join(out, 'main.js'));
for (const f of fs.readdirSync(path.join(root, 'public/media'))) fs.copyFileSync(path.join(root, 'public/media', f), path.join(out, f));
const S = JSON.parse(read('content/shared.json'));
const names = Object.values(FILES).map((f) => f.replace('.html', '')).join('|');
const hrefRe = new RegExp(`href="((?:${names})\\.html)((?:#[^"]*)?)"`, 'g');
let n = 0;
for (const lang of ['en', 'ar']) {
  const c = JSON.parse(read(`content/${lang}.json`));
  for (const [page, file] of Object.entries(FILES)) {
    const switchHref = lang === 'en' ? `ar-${file}` : `@@${file}`;
    let html = renderPage(page, { c, S, lang, base: '', switchHref, page });
    html = html.replaceAll('assets/media/', '').replaceAll('assets/styles.css', 'styles.css').replaceAll('assets/main.js', 'main.js');
    if (lang === 'ar') html = html.replace(hrefRe, 'href="ar-$1$2"').replaceAll('@@', '');
    fs.writeFileSync(path.join(out, (lang === 'ar' ? 'ar-' : '') + file), html);
    n++;
  }
}
console.log(`Built ${n} pages + assets -> ${path.basename(out)}/ (flat)`);
