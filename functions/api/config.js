// Cloudflare Pages Function: GET /api/config?p=/caminho/
// Diz ao popup qual formulário de entrada do lead está ligado. A escolha fica no CRM:
//   crm.agenticalab.com.br → Configurações → Site (entrada do lead)
//   simples  = Form Simples (só nome, e-mail e WhatsApp)
//   contato  = Form Qualificação (diagnóstico; a equipe entra em contato)
//   agenda   = Form Qualificação + Agenda (o qualificado já marca o horário)
// O CRM é lido com a mesma CRM_API_KEY do /api/lead (GET /site-config), guardado por 60 segundos.
// Se o CRM não responder, vale a variável ENTRADA_LEAD do Cloudflare e, sem ela, "contato".
const MODOS = ['simples', 'contato', 'agenda'];
const resp = o => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const norm = p => { let s = String(p || '/').split(/[?#]/)[0]; if (!s.startsWith('/')) s = '/' + s; if (!s.endsWith('/') && !/\.[a-z0-9]+$/i.test(s)) s += '/'; return s; };

async function doCrm(env, ctx) {
  if (!env.CRM_API_URL || !env.CRM_API_KEY) return null;
  const cache = caches.default, chave = new Request('https://cache.local/agenticalab/site-config');
  const salvo = await cache.match(chave);
  if (salvo) return salvo.json();
  try {
    const r = await fetch(env.CRM_API_URL.replace(/\/$/, '') + '/site-config', { headers: { authorization: `Bearer ${env.CRM_API_KEY}` }, signal: AbortSignal.timeout(2500) });
    if (!r.ok) { console.log('CRM site-config falhou', r.status); return null; }
    const cfg = await r.json();
    ctx.waitUntil(cache.put(chave, new Response(JSON.stringify(cfg), { headers: { 'cache-control': 'max-age=60' } })));
    return cfg;
  } catch (e) { console.log('CRM site-config erro', String(e)); return null; }
}

export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const cfg = await doCrm(env, ctx);
  const reserva = String(env.ENTRADA_LEAD || '').trim().toLowerCase();
  let entrada = MODOS.includes(reserva) ? reserva : 'contato', agendaLink = '';
  if (cfg) {
    const pagina = cfg.paginas?.[norm(new URL(request.url).searchParams.get('p'))];
    entrada = MODOS.includes(pagina) ? pagina : MODOS.includes(cfg.entrada) ? cfg.entrada : 'contato';
    if (typeof cfg.agendaLink === 'string' && /^[\w-]+(\/[\w-]+)*$/.test(cfg.agendaLink)) agendaLink = cfg.agendaLink;
  }
  return resp({ entrada, agendaLink, fonte: cfg ? 'crm' : 'reserva' });
}
