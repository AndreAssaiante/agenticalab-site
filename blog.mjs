// AgenticaLab · Blog: lê content/blog/*.md e gera posts, categorias, paginação, RSS e textos para IAs.
// Usado pelo build.mjs. Sem dependências: só Node 18+.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const CATEGORIAS = [
  { slug: 'atendimento', nome: 'Atendimento' },
  { slug: 'comercial', nome: 'Comercial' },
  { slug: 'marketing', nome: 'Marketing' },
  { slug: 'operacoes', nome: 'Operações' },
  { slug: 'casos', nome: 'Casos' },
];
export const POR_PAGINA = 9;
export const IMG_PADRAO = '/assets/img/agentes-painel-time.jpg';
const AUTOR_PADRAO = 'André Assaiante';
const EQUIPE = 'Equipe AgenticaLab';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slugify = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const dataBR = iso => { const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number); return a ? `${d} de ${MESES[m - 1]} de ${a}` : ''; };
const jsonLd = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// ---------- front-matter (YAML simples: chave: valor, [lista], e listas de itens com "- q:" / "  a:") ----------
const valor = v => {
  v = v.trim();
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(x => valor(x)).filter(x => x !== '');
  if (/^(".*"|'.*')$/.test(v)) return v.slice(1, -1);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
};
export function frontMatter(txt) {
  const m = txt.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: txt };
  const meta = {}, linhas = m[1].split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const kv = l.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v.trim() !== '') { meta[k] = valor(v); continue; }
    const lista = [];
    while (i + 1 < linhas.length && /^\s+/.test(linhas[i + 1])) {
      const l2 = linhas[++i];
      const item = l2.match(/^\s+-\s+(?:([\w-]+):\s*)?(.*)$/);
      if (item) { if (item[1]) lista.push({ [item[1]]: valor(item[2]) }); else lista.push(valor(item[2])); continue; }
      const cont = l2.match(/^\s+([\w-]+):\s*(.*)$/);
      if (cont && lista.length && typeof lista[lista.length - 1] === 'object') lista[lista.length - 1][cont[1]] = valor(cont[2]);
    }
    meta[k] = lista;
  }
  return { meta, body: txt.replace(/\r\n/g, '\n').slice(m[0].length) };
}

// ---------- Markdown (o essencial: títulos, parágrafos, listas, citações, código, imagens, links, negrito, itálico) ----------
function inline(t) {
  const codes = [];
  t = t.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(esc(c)) - 1}\u0000`);
  t = esc(t)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" width="1200" height="675" loading="lazy" decoding="async">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => `<a href="${url}"${/^https?:/.test(url) && !url.includes('agenticalab.com.br') ? ' rel="noopener"' : ''}>${txt}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}
export function markdown(md) {
  const L = md.replace(/\r\n/g, '\n').split('\n'), out = [], toc = [], ids = new Set();
  let i = 0;
  const idDe = t => { let base = slugify(t) || 'secao', id = base, n = 2; while (ids.has(id)) id = `${base}-${n++}`; ids.add(id); return id; };
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    if (/^```/.test(l)) { const buf = []; i++; while (i < L.length && !/^```/.test(L[i])) buf.push(L[i++]); i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue; }
    const h = l.match(/^(#{2,4})\s+(.*)$/);
    if (h) { const n = h[1].length, txt = h[2].trim(), id = idDe(txt); if (n <= 3) toc.push({ n, txt, id }); out.push(`<h${n} id="${id}">${inline(txt)}</h${n}>`); i++; continue; }
    if (/^#\s+/.test(l)) { i++; continue; } // o título (h1) vem do front-matter
    if (/^>\s?/.test(l)) { const buf = []; while (i < L.length && /^>\s?/.test(L[i])) buf.push(L[i++].replace(/^>\s?/, '')); out.push(`<blockquote><p>${inline(buf.join(' '))}</p></blockquote>`); continue; }
    if (/^\|/.test(l) && i + 1 < L.length && /^\|\s*:?-{3,}/.test(L[i + 1])) {
      const cells = line => line.replace(/^\||\|$/g, '').split('|').map(x => x.trim());
      const header = cells(l).map(x => `<th scope="col">${inline(x)}</th>`).join('');
      i += 2; const rows = [];
      while (i < L.length && /^\|/.test(L[i])) rows.push(`<tr>${cells(L[i++]).map(x => `<td>${inline(x)}</td>`).join('')}</tr>`);
      out.push(`<div class="post-table-scroll"><table><thead><tr>${header}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`); continue;
    }
    if (/^\s*[-*]\s+/.test(l)) { const buf = []; while (i < L.length && /^\s*[-*]\s+/.test(L[i])) buf.push(`<li>${inline(L[i++].replace(/^\s*[-*]\s+/, ''))}</li>`); out.push(`<ul>${buf.join('')}</ul>`); continue; }
    if (/^\s*\d+[.)]\s+/.test(l)) { const buf = []; while (i < L.length && /^\s*\d+[.)]\s+/.test(L[i])) buf.push(`<li>${inline(L[i++].replace(/^\s*\d+[.)]\s+/, ''))}</li>`); out.push(`<ol>${buf.join('')}</ol>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(l.trim())) { out.push('<hr>'); i++; continue; }
    const buf = [];
    while (i < L.length && L[i].trim() && !/^(#{1,4}\s|```|>|\||\s*[-*]\s+|\s*\d+[.)]\s+)/.test(L[i])) buf.push(L[i++].trim());
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return { html: out.join('\n'), toc };
}
const textoPuro = md => md.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`_\[\]()!-]/g, ' ');

// ---------- leitura dos posts ----------
// Autores em data/autores.json: { "slug": { nome, cargo, ... } }. O post aponta pelo nome (campo autor).
export function lerAutores(root) {
  const f = join(root, 'data', 'autores.json');
  if (!existsSync(f)) return {};
  return Object.fromEntries(JSON.parse(readFileSync(f, 'utf8')).map(a => [a.slug, { ...a, url: `/autor/${a.slug}/` }]));
}

export function lerPosts(root, { incluirRascunhos = false } = {}) {
  const autores = lerAutores(root);
  const dir = join(root, 'content', 'blog');
  if (!existsSync(dir)) return [];
  const cats = Object.fromEntries(CATEGORIAS.map(c => [c.slug, c]));
  const posts = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')) {
    const { meta, body } = frontMatter(readFileSync(join(dir, f), 'utf8'));
    const nomeArq = f.replace(/\.md$/, ''), dataArq = (nomeArq.match(/^(\d{4}-\d{2}-\d{2})-/) || [])[1];
    const p = {
      arquivo: f,
      titulo: meta.titulo || meta.title,
      seoTitulo: meta.seo_title || meta.titulo || meta.title,
      subhead: meta.subhead || meta.descricao || meta.description || '',
      descricao: meta.descricao || meta.description || '',
      data: String(meta.data || meta.date || dataArq || ''),
      atualizado: String(meta.atualizado || meta.updated || ''),
      autor: meta.autor || meta.author || AUTOR_PADRAO,
      categoria: slugify(meta.categoria || meta.category || ''),
      tags: Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : [],
      imagem: meta.capa || meta.imagem || meta.image || '', // vazio = capa gerada no build
      capaPropria: !!(meta.capa || meta.imagem || meta.image),
      imagemAlt: meta.capa_alt || meta.imagem_alt || meta.titulo || '',
      faq: Array.isArray(meta.faq) ? meta.faq.filter(x => x && x.q && x.a) : [],
      icones: Array.isArray(meta.icones) ? meta.icones : [],
      rascunho: meta.draft === true || meta.rascunho === true,
      slug: slugify(meta.slug || nomeArq.replace(/^\d{4}-\d{2}-\d{2}-/, '')),
      md: body,
    };
    const erros = [];
    if (!p.titulo) erros.push('falta "titulo"');
    if (!p.descricao) erros.push('falta "descricao"');
    if (!/^\d{4}-\d{2}-\d{2}/.test(p.data) && !p.rascunho) erros.push('falta "data" (AAAA-MM-DD)');
    if (!cats[p.categoria]) erros.push(`categoria "${p.categoria}" não existe (use: ${CATEGORIAS.map(c => c.slug).join(', ')})`);
    p.autorInfo = autores[slugify(p.autor)] || null;
    if (p.autor !== EQUIPE && !p.autorInfo) erros.push(`autor "${p.autor}" não está em data/autores.json (ou use "${EQUIPE}")`);
    if (erros.length) throw new Error(`content/blog/${f}: ${erros.join('; ')}`);
    if (p.rascunho && !incluirRascunhos) continue;
    const { html, toc } = markdown(body);
    let iconIndex = 0;
    p.html = html.replace(/<h2(\s[^>]*)>([\s\S]*?)<\/h2>/g, (full, attrs, text) => {
      const icon = p.icones[iconIndex++];
      return icon ? `<h2${attrs}><img class="post-heading-icon" src="/assets/img/blog/icone-${esc(icon)}.svg" alt="" width="40" height="40" loading="lazy">${text}</h2>` : full;
    });
    p.toc = toc;
    p.cat = cats[p.categoria];
    p.minutos = Math.max(1, Math.round(textoPuro(body).split(/\s+/).filter(Boolean).length / 200));
    p.url = `/blog/${p.slug}/`;
    posts.push(p);
  }
  const vistos = new Set();
  for (const p of posts) { if (vistos.has(p.slug)) throw new Error(`Dois posts com o mesmo endereço: /blog/${p.slug}/`); vistos.add(p.slug); }
  return posts.sort((a, b) => (b.data + b.slug).localeCompare(a.data + a.slug));
}

// ---------- pedaços de HTML ----------
const metaLinha = p => `<span class="post-meta"><a class="post-cat" href="/blog/categoria/${p.cat.slug}/">${esc(p.cat.nome)}</a>${p.data ? ` · <time datetime="${p.data.slice(0, 10)}">${dataBR(p.data)}</time>` : ''} · ${p.minutos} min de leitura${p.rascunho ? ' · <span class="post-draft">Rascunho</span>' : ''}</span>`;
export const card = p => `<article class="post-card"><a class="post-img" href="${p.url}" tabindex="-1" aria-hidden="true"><img src="${esc(p.imagem)}" alt="" loading="lazy"></a><div class="post-body">${metaLinha(p)}<h3><a href="${p.url}">${esc(p.titulo)}</a></h3><p>${esc(p.descricao)}</p></div></article>`;
export const destaque = p => `<article class="post-feat"><a class="post-img" href="${p.url}" tabindex="-1" aria-hidden="true"><img src="${esc(p.imagem)}" alt="" loading="lazy"></a><div class="post-body">${metaLinha(p)}<h2><a href="${p.url}">${esc(p.titulo)}</a></h2><p>${esc(p.descricao)}</p><a class="post-more" href="${p.url}">Ler artigo →</a></div></article>`;
export const navCategorias = atual => `<nav class="blog-cats" aria-label="Categorias"><a href="/blog/"${!atual ? ' class="on" aria-current="page"' : ''}>Todos</a>${CATEGORIAS.map(c => `<a href="/blog/categoria/${c.slug}/"${atual === c.slug ? ' class="on" aria-current="page"' : ''}>${esc(c.nome)}</a>`).join('')}</nav>`;
export function paginacao(atual, total, base) {
  if (total <= 1) return '';
  const href = n => (n === 1 ? base : `${base}pagina/${n}/`);
  const itens = [];
  if (atual > 1) itens.push(`<a rel="prev" href="${href(atual - 1)}">← Anteriores</a>`);
  for (let n = 1; n <= total; n++) itens.push(n === atual ? `<span aria-current="page">${n}</span>` : `<a href="${href(n)}">${n}</a>`);
  if (atual < total) itens.push(`<a rel="next" href="${href(atual + 1)}">Próximos →</a>`);
  return `<nav class="blog-pages" aria-label="Páginas">${itens.join('')}</nav>`;
}
export function relacionados(p, todos) {
  const pontos = q => (q.categoria === p.categoria ? 2 : 0) + q.tags.filter(t => p.tags.includes(t)).length;
  return todos.filter(q => q.slug !== p.slug && !q.rascunho).map(q => [pontos(q), q]).sort((a, b) => b[0] - a[0] || b[1].data.localeCompare(a[1].data)).slice(0, 3).map(x => x[1]);
}
export function sumario(toc) {
  if (toc.filter(t => t.n === 2).length < 2) return '';
  return `<nav class="post-toc" aria-label="Neste artigo"><strong>Neste artigo</strong><ol>${toc.map(t => `<li class="toc-${t.n}"><a href="#${t.id}">${esc(t.txt)}</a></li>`).join('')}</ol></nav>`;
}
export const faqHtml = faq => faq.length ? `<section class="post-faq" aria-labelledby="perguntas"><h2 id="perguntas">Perguntas frequentes</h2>${faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${inline(f.a)}</p></details>`).join('')}</section>` : '';

// ---------- metadados para buscadores e IAs ----------
export const organizacao = SITE => ({ '@type': 'Organization', '@id': `${SITE}/#organizacao`, name: 'AgenticaLab', url: SITE + '/', logo: { '@type': 'ImageObject', url: `${SITE}/assets/brand/vertice.svg` } });
export function pessoa(a, SITE) {
  const o = { '@type': 'Person', '@id': `${SITE}${a.url}#pessoa`, name: a.nome, jobTitle: a.cargo, url: SITE + a.url, worksFor: { '@id': `${SITE}/#organizacao` } };
  const links = (a.links || []).filter(Boolean);
  if (links.length) o.sameAs = links;
  if (a.foto) o.image = /^https?:/.test(a.foto) ? a.foto : SITE + a.foto;
  return o;
}
export const jsonLdTag = jsonLd;
export function headPost(p, SITE) {
  const url = SITE + p.url, img = /^https?:/.test(p.imagem) ? p.imagem : SITE + p.imagem;
  const org = organizacao(SITE);
  const blocos = [
    `<meta property="og:image" content="${esc(img)}">`,
    p.capaGerada ? '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' : '',
    `<meta property="og:image:alt" content="${esc(p.imagemAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    p.data ? `<meta property="article:published_time" content="${esc(p.data.slice(0, 10))}">` : '',
    p.atualizado ? `<meta property="article:modified_time" content="${esc(p.atualizado.slice(0, 10))}">` : '',
    `<meta property="article:section" content="${esc(p.cat.nome)}">`,
    ...p.tags.map(t => `<meta property="article:tag" content="${esc(t)}">`),
    `<link rel="alternate" type="application/rss+xml" title="Blog AgenticaLab" href="${SITE}/blog/feed.xml">`,
    p.rascunho ? '<meta name="robots" content="noindex,nofollow">' : '',
    jsonLd({
      '@context': 'https://schema.org', '@type': 'Article', headline: p.titulo, description: p.descricao, image: img,
      ...(p.data ? { datePublished: p.data.slice(0, 10), dateModified: (p.atualizado || p.data).slice(0, 10) } : {}), inLanguage: 'pt-BR',
      author: p.autorInfo ? pessoa(p.autorInfo, SITE) : org, publisher: org,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url }, articleSection: p.cat.nome, keywords: p.tags.join(', '),
      wordCount: textoPuro(p.md).split(/\s+/).filter(Boolean).length,
    }),
    jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog/' },
      { '@type': 'ListItem', position: 3, name: p.cat.nome, item: `${SITE}/blog/categoria/${p.cat.slug}/` },
      { '@type': 'ListItem', position: 4, name: p.titulo, item: url }] }),
    p.faq.length ? jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) : '',
  ];
  return blocos.filter(Boolean).join('\n');
}
export function headLista(SITE, path, nome, { noindex = false } = {}) {
  return [
    `<meta property="og:image" content="${SITE}${IMG_PADRAO}">`,
    `<link rel="alternate" type="application/rss+xml" title="Blog AgenticaLab" href="${SITE}/blog/feed.xml">`,
    noindex ? '<meta name="robots" content="noindex,follow">' : '',
    jsonLd({ '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog AgenticaLab', url: `${SITE}/blog/`, inLanguage: 'pt-BR', publisher: { '@type': 'Organization', name: 'AgenticaLab', url: SITE } }),
    jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog/' },
      ...(nome ? [{ '@type': 'ListItem', position: 3, name: nome, item: SITE + path }] : [])] }),
  ].filter(Boolean).join('\n');
}

// ---------- RSS e textos para IAs ----------
export function rss(posts, SITE) {
  const itens = posts.slice(0, 50).map(p => `  <item>\n    <title>${esc(p.titulo)}</title>\n    <link>${SITE}${p.url}</link>\n    <guid isPermaLink="true">${SITE}${p.url}</guid>\n    <pubDate>${new Date(p.data.slice(0, 10) + 'T12:00:00-03:00').toUTCString()}</pubDate>\n    <category>${esc(p.cat.nome)}</category>\n    <description>${esc(p.descricao)}</description>\n  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>Blog AgenticaLab</title>\n  <link>${SITE}/blog/</link>\n  <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>\n  <description>Agentes de IA na prática para pequenas e médias empresas.</description>\n  <language>pt-BR</language>\n${itens}\n</channel>\n</rss>\n`;
}
export function llms(SITE, paginas, produtos, posts) {
  const linha = (t, u, d) => `- [${t}](${SITE}${u})${d ? `: ${d}` : ''}`;
  return [
    '# AgenticaLab', '',
    '> A AgenticaLab cria e opera agentes de inteligência artificial para processos operacionais de pequenas e médias empresas no Brasil: atendimento no WhatsApp, qualificação comercial, inteligência de mercado e rotinas de gestão. Todo projeto segue três etapas: mapear a tarefa, colocar o agente para executar e medir o antes e o depois.', '',
    'Público: Donos de Negócio. Contato: diagnóstico gratuito em https://agenticalab.com.br/#contato.', '',
    '## Páginas', ...paginas.map(p => linha(p.titulo, p.path, p.descricao)), '',
    '## Soluções', ...produtos.map(p => linha(p.nome, `/solucoes/${p.slug}/`, p.resumo)), '',
    '## Blog', linha('Todos os artigos', '/blog/', 'Agentes de IA na prática'),
    ...posts.map(p => linha(p.titulo, p.url, p.descricao)), '',
    '## Opcional', linha('Texto completo dos artigos', '/llms-full.txt'), linha('Feed RSS', '/blog/feed.xml'), '',
  ].join('\n');
}
export function llmsFull(SITE, posts) {
  const partes = ['# AgenticaLab · Blog (texto completo)', '', `> Artigos publicados em ${SITE}/blog/. Cada seção traz o endereço original.`, ''];
  for (const p of posts) partes.push('---', '', `# ${p.titulo}`, '', `URL: ${SITE}${p.url}`, `Publicado: ${p.data.slice(0, 10)}${p.atualizado ? ` · Atualizado: ${p.atualizado.slice(0, 10)}` : ''}`, `Categoria: ${p.cat.nome}${p.tags.length ? ` · Tags: ${p.tags.join(', ')}` : ''}`, '', `> ${p.descricao}`, '', p.md.trim(), '', ...(p.faq.length ? ['## Perguntas frequentes', '', ...p.faq.flatMap(f => [`**${f.q}**`, '', f.a, ''])] : []));
  if (!posts.length) partes.push('Ainda não há artigos publicados.', '');
  return partes.join('\n');
}
