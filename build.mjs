// AgenticaLab · gera o site estático em dist/ (sem dependências: só Node 18+)
// Uso: node build.mjs    → Cloudflare Pages: build command "node build.mjs", output "dist"
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const SRC = join(ROOT, 'src'), DIST = join(ROOT, 'dist');
const SITE = 'https://agenticalab.com.br';
const read = p => readFileSync(join(ROOT, p), 'utf8');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (tpl, v) => tpl
  .replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => v[k] ?? '')
  .replace(/\{\{(\w+)\}\}/g, (_, k) => esc(v[k]));

const partial = { head: read('partials/head.html'), header: read('partials/header.html'), footer: read('partials/footer.html') };
const produtos = JSON.parse(read('data/produtos.json')).sort((a, b) => a.ordem - b.ordem);
const footer_produtos = produtos.map(p => `<a href="/solucoes/${p.slug}/">${esc(p.nome)}</a>`).join('\n      ');
const produtos_cards = produtos.map(p => `<a class="app" href="/solucoes/${p.slug}/"><div class="art shot"><img class="s1" src="${p.imagens[0].src}" alt="${esc(p.imagens[0].alt)}" loading="lazy"></div><div class="app-copy"><span class="kicker">${esc(p.categoria)}</span><h3>${esc(p.nome)}</h3><p>${esc(p.resumo)}</p>${p.prova ? `<p class="stat">${esc(p.prova)}</p>` : ''}<span class="more">Ver solução →</span></div></a>`).join('\n');

// Lê o bloco de configuração no topo da página: <!-- title: … description: … nav: … -->
function frontMatter(html) {
  const m = html.match(/^<!--\s*\n([\s\S]*?)\n-->\s*\n?/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { meta, body: html.slice(m[0].length) };
}

function page(html, path, extra = {}) {
  const fm = frontMatter(fill(html, { ...extra, produtos_cards }));
  if (!fm) return html;
  const v = { title: fm.meta.title, description: fm.meta.description, path };
  const header = partial.header.replace(`data-nav="${fm.meta.nav}"`, `data-nav="${fm.meta.nav}" aria-current="page"`);
  return fill(partial.head, v) + header + '\n' + fm.body + '\n' + fill(partial.footer, { footer_produtos }) + '\n</body>\n</html>\n';
}

const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

rmSync(DIST, { recursive: true, force: true });
cpSync(SRC, DIST, { recursive: true });
const urls = [];

for (const file of walk(DIST)) {
  const rel = '/' + relative(DIST, file).replace(/\\/g, '/');
  if (!rel.endsWith('.html') || rel.startsWith('/brandbook/midia/')) continue;
  if (rel.startsWith('/brandbook/')) { continue; } // o brandbook tem layout próprio
  const path = rel.replace(/index\.html$/, '');
  writeFileSync(file, page(readFileSync(file, 'utf8'), path));
  if (!rel.endsWith('404.html')) urls.push(path);
}

const tpl = read('templates/produto.html');
for (const p of produtos) {
  const v = {
    ...p,
    imagens_html: p.imagens.map(i => `<img class="${i.classe}" src="${i.src}" alt="${esc(i.alt)}">`).join(''),
    problema_html: p.problema.map(t => `<p>${esc(t)}</p>`).join(''),
    entregas_html: p.entregas.map(t => `<li>${esc(t)}</li>`).join(''),
    proof_html: p.prova ? `<div class="proof" style="margin-top:48px"><strong>${esc(p.prova)}</strong><small>${esc(p.prova_nota)}</small></div>` : '',
  };
  const out = join(DIST, 'solucoes', p.slug, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  const path = `/solucoes/${p.slug}/`;
  writeFileSync(out, page(fill(tpl, v).replace(/^<!--\s*\n/, '<!--\n'), path));
  urls.push(path);
}

writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.sort().map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Site gerado em dist/ com ${urls.length} páginas:\n  ${urls.sort().join('\n  ')}`);
