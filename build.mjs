// AgenticaLab · gera o site estático em dist/ (sem dependências: só Node 18+)
// Uso: node build.mjs    → Cloudflare Pages: build command "node build.mjs", output "dist"
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import * as blog from './blog.mjs';

const ROOT = new URL('.', import.meta.url).pathname;
const SRC = join(ROOT, 'src'), DIST = join(ROOT, 'dist');
const SITE = 'https://agenticalab.com.br';
const read = p => readFileSync(join(ROOT, p), 'utf8');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (tpl, v) => tpl
  .replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => v[k] ?? '')
  .replace(/\{\{(\w+)\}\}/g, (_, k) => esc(v[k]));

// Versão dos arquivos pelo conteúdo: o navegador baixa o CSS/JS novo a cada mudança, sem ficar com cópia antiga em cache.
const ver = p => createHash('sha1').update(readFileSync(join(SRC, p))).digest('hex').slice(0, 8);
const bust = html => html
  .replace('/assets/css/site.css"', `/assets/css/site.css?v=${ver('assets/css/site.css')}"`)
  .replace('/assets/js/diagnostico.js"', `/assets/js/diagnostico.js?v=${ver('assets/js/diagnostico.js')}"`);
const partial = { head: bust(read('partials/head.html')), header: read('partials/header.html'), footer: bust(read('partials/footer.html')) };
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
  const v = { title: fm.meta.title, description: fm.meta.description, path, og_type: extra.og_type || 'website', head_extra: extra.head_extra || '' };
  const header = partial.header.replace(`data-nav="${fm.meta.nav}"`, `data-nav="${fm.meta.nav}" aria-current="page"`);
  return fill(partial.head, v) + header + '\n' + fm.body + '\n' + fill(partial.footer, { footer_produtos }) + '\n</body>\n</html>\n';
}

const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

rmSync(DIST, { recursive: true, force: true });
cpSync(SRC, DIST, { recursive: true });
const urls = [];
const paginasSite = []; // título e descrição de cada página, para o llms.txt

for (const file of walk(DIST)) {
  const rel = '/' + relative(DIST, file).replace(/\\/g, '/');
  if (!rel.endsWith('.html') || rel.startsWith('/brandbook/midia/')) continue;
  if (rel.startsWith('/brandbook/')) { continue; } // o brandbook tem layout próprio
  const path = rel.replace(/index\.html$/, '');
  const fonte = readFileSync(file, 'utf8'), fmSrc = frontMatter(fonte);
  if (fmSrc && !rel.endsWith('404.html')) paginasSite.push({ titulo: fmSrc.meta.title, descricao: fmSrc.meta.description, path });
  writeFileSync(file, page(fonte, path));
  if (!rel.endsWith('404.html')) urls.push(path);
}

const tplDefault = read('templates/produto.html');
for (const p of produtos) {
  const v = {
    ...p,
    imagens_html: p.imagens.map(i => `<img class="${i.classe}" src="${i.src}" alt="${esc(i.alt)}">`).join(''),
    problema_html: p.problema.map(t => `<p>${esc(t)}</p>`).join(''),
    entregas_html: p.entregas.map(t => `<li>${esc(t)}</li>`).join(''),
    proof_html: p.prova ? `<div class="proof" style="margin-top:48px"><strong>${esc(p.prova)}</strong><small>${esc(p.prova_nota)}</small></div>` : '',
  };
  const tpl = existsSync(join(ROOT, `templates/${p.slug}.html`)) ? read(`templates/${p.slug}.html`) : tplDefault; // página própria, se existir templates/<slug>.html
  const out = join(DIST, 'solucoes', p.slug, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  const path = `/solucoes/${p.slug}/`;
  writeFileSync(out, page(fill(tpl, v).replace(/^<!--\s*\n/, '<!--\n'), path));
  urls.push(path);
}

// ---------- Blog: posts em content/blog/*.md (veja content/blog/README.md) ----------
// Rascunhos (draft: true) só aparecem nas prévias dos PRs (branch diferente de main) ou com BLOG_DRAFTS=1.
// Nunca entram no sitemap, no RSS nem no llms.txt, e as páginas deles levam noindex.
const RASCUNHOS = process.env.BLOG_DRAFTS === '1' || (!!process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main');
const todosPosts = blog.lerPosts(ROOT, { incluirRascunhos: RASCUNHOS });
const publicados = todosPosts.filter(p => !p.rascunho), rascunhos = todosPosts.filter(p => p.rascunho);
const tplBlog = read('templates/blog.html'), tplPost = read('templates/post.html');
const emBreve = read('templates/blog-em-breve.html').replace(/^<!--[\s\S]*?-->\n/, '');
const fillHtml = (tpl, v) => tpl.replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => v[k] ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => blog.esc(v[k]));
const crumbsBlog = nome => nome
  ? `<a href="/">Início</a><span aria-hidden="true">/</span><a href="/blog/">Blog</a><span aria-hidden="true">/</span><span aria-current="page">${blog.esc(nome)}</span>`
  : `<a href="/">Início</a><span aria-hidden="true">/</span><span aria-current="page">Blog</span>`;
const avisoRascunhos = rascunhos.length
  ? `<p class="blog-soon blog-drafts">Rascunhos (só na prévia, não publicados): ${rascunhos.map(p => `<a href="${p.url}">${blog.esc(p.titulo)}</a>`).join(' · ')}</p>`
  : '';
const emitir = (path, html, extra) => {
  const out = join(DIST, path, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page(html, path, extra));
};

function listas(base, lista, cat) {
  const total = Math.max(1, Math.ceil(lista.length / blog.POR_PAGINA));
  for (let n = 1; n <= total; n++) {
    const path = n === 1 ? base : `${base}pagina/${n}/`;
    const fatia = lista.slice((n - 1) * blog.POR_PAGINA, n * blog.POR_PAGINA);
    let conteudo;
    if (!publicados.length) conteudo = emBreve; // enquanto não houver post publicado, mostra os cards "Em breve"
    else if (!lista.length) conteudo = `${blog.navCategorias(cat?.slug)}\n<p class="blog-empty">Ainda não há artigos em ${blog.esc(cat.nome)}. <a href="/blog/">Ver todos os artigos</a></p>`;
    else {
      const [primeiro, ...resto] = fatia;
      const grade = (n === 1 ? resto : fatia).map(blog.card).join('\n');
      conteudo = [blog.navCategorias(cat?.slug), n === 1 ? blog.destaque(primeiro) : '', grade ? `<div class="post-grid">${grade}</div>` : '', blog.paginacao(n, total, base)].join('\n');
    }
    const sufixo = n > 1 ? ` · Página ${n}` : '';
    const v = cat
      ? { titulo_pagina: `${cat.nome} · Blog AgenticaLab${sufixo}`, descricao: `Artigos da AgenticaLab sobre agentes de IA em ${cat.nome.toLowerCase()} para pequenas e médias empresas.`, crumbs: crumbsBlog(cat.nome), kicker: 'Blog · Categoria', h1: `${blog.esc(cat.nome)}<span>.</span>`, lead: `Agentes de IA aplicados a ${cat.nome.toLowerCase()}: casos, passo a passo e o que medir antes e depois.`, aviso: '', conteudo }
      : { titulo_pagina: `Blog · AgenticaLab${sufixo}`, descricao: 'Conteúdos da AgenticaLab sobre agentes de IA na operação de pequenas e médias empresas: atendimento, comercial, marketing e gestão.', crumbs: crumbsBlog(), kicker: 'Blog', h1: 'Agentes de IA <span>na prática.</span>', lead: 'Como pequenas e médias empresas colocam agentes para trabalhar no atendimento, no comercial, no marketing e na gestão. Casos, passo a passo e o que medir antes e depois.', aviso: (publicados.length ? '' : '<p class="blog-soon">Os primeiros artigos estão sendo preparados.</p>') + avisoRascunhos, conteudo };
    const vazia = !!cat && !lista.length;
    emitir(path, fillHtml(tplBlog, v), { head_extra: blog.headLista(SITE, path, cat?.nome, { noindex: vazia }) });
    if (n === 1 && !vazia) urls.push(path);
  }
}

listas('/blog/', publicados);
for (const cat of blog.CATEGORIAS) listas(`/blog/categoria/${cat.slug}/`, publicados.filter(p => p.categoria === cat.slug), cat);

for (const p of todosPosts) {
  const rel = blog.relacionados(p, publicados);
  const v = {
    titulo_pagina: `${p.titulo} · AgenticaLab`, descricao: p.descricao, titulo: p.titulo, autor: p.autor,
    cat_slug: p.cat.slug, cat_nome: p.cat.nome, data_iso: p.data.slice(0, 10), data_br: blog.dataBR(p.data), minutos: p.minutos,
    atualizado: p.atualizado && p.atualizado !== p.data ? ` · Atualizado em <time datetime="${blog.esc(p.atualizado.slice(0, 10))}">${blog.dataBR(p.atualizado)}</time>` : '',
    imagem: p.imagem, imagem_alt: p.imagemAlt, html: p.html, sumario: blog.sumario(p.toc), faq: blog.faqHtml(p.faq),
    tags: p.tags.length ? `<p class="post-tags">${p.tags.map(t => `<span>#${blog.esc(t)}</span>`).join(' ')}</p>` : '',
    aviso_rascunho: p.rascunho ? '<p class="blog-soon">Rascunho: esta página só aparece na prévia. Ela vai ao ar quando o arquivo tiver draft: false.</p>' : '',
    relacionados_titulo: rel.length ? 'Leia também' : 'Mais artigos em breve',
    relacionados: rel.length ? `<div class="post-grid">${rel.map(blog.card).join('')}</div>` : '<p class="blog-empty"><a href="/blog/">Voltar para o Blog</a></p>',
  };
  emitir(p.url, fillHtml(tplPost, v), { og_type: 'article', head_extra: blog.headPost(p, SITE) });
  if (!p.rascunho) urls.push(p.url);
}

mkdirSync(join(DIST, 'blog'), { recursive: true });
writeFileSync(join(DIST, 'blog', 'feed.xml'), blog.rss(publicados, SITE));
writeFileSync(join(DIST, 'llms.txt'), blog.llms(SITE, paginasSite.filter(p => p.titulo).sort((a, b) => a.path.localeCompare(b.path)), produtos, publicados));
writeFileSync(join(DIST, 'llms-full.txt'), blog.llmsFull(SITE, publicados));

const lastmod = u => { const p = publicados.find(x => x.url === u); return p ? `<lastmod>${(p.atualizado || p.data).slice(0, 10)}</lastmod>` : ''; };
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.sort().map(u => `  <url><loc>${SITE}${u}</loc>${lastmod(u)}</url>`).join('\n')}\n</urlset>\n`);
// Buscadores e assistentes de IA podem ler tudo, inclusive /llms.txt. O brandbook é interno.
const robosIA = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Meta-ExternalAgent', 'CCBot'];
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /brandbook/\n\n${robosIA.map(b => `User-agent: ${b}`).join('\n')}\nAllow: /\nDisallow: /brandbook/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Site gerado em dist/ com ${urls.length} páginas no sitemap (${publicados.length} posts publicados${rascunhos.length ? `, ${rascunhos.length} rascunho(s) só na prévia` : ''}):\n  ${urls.sort().join('\n  ')}`);
