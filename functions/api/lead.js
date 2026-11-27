// Cloudflare Pages Function: POST /api/lead
// Recebe as respostas do diagnóstico e grava no Delegra CRM (crm.agenticalab.com.br) pela API v1.
//
// Variáveis no Cloudflare Pages (Settings → Variables and Secrets, Production):
//   CRM_API_URL      ex.: https://crm.agenticalab.com.br/api/v1
//   CRM_API_KEY      chave de Integração da conta AgenticaLab, escopos: contacts:write, deals:write, events:write (Secret)
//   CRM_PIPELINE_ID  opcional: funil onde entram os qualificados (sem ele, usa o funil padrão)
//   CRM_STAGE_ID     opcional: etapa de entrada dos qualificados (sem ela, a primeira etapa)
//
// O que acontece em cada envio:
//   1. Contato criado ou atualizado pelo e-mail (sem duplicar), com as respostas em campos e tags.
//   2. Se veio "qualificado" (ou do Form Simples): negócio no funil.
//   Tags pelo formulário usado: form-simples, form-qualificacao ou form-qualificacao-agenda.
//   3. Evento "diagnostico_site" na linha do tempo, que pode disparar automações (ex.: avisar a equipe).
// Também recebe o pedido de demo do Delegra (origem "delegra-demo") e o cadastro do balão do Noah (origem "chat-site").
//
// API de Conversões da Meta (sem Stape): se a pessoa aceitou os cookies, o navegador manda "pixel" com o event_id
// e este servidor envia o mesmo evento "Lead" direto para a Meta, com e-mail, telefone e nome criptografados (SHA-256).
// Navegador e servidor usam o mesmo event_id, então a Meta conta uma vez só (deduplicação).
//   META_CAPI_TOKEN  token da API de Conversões, gerado no Gerenciador de Eventos (Secret). Sem ele, nada é enviado.
//   META_PIXEL_ID    opcional (padrão: 896432615417080, "Pixel - AgenticaLab")
//   META_TEST_CODE   opcional: código de teste do Gerenciador de Eventos, só enquanto confere a instalação
const ANSWERS = ['negocio', 'papel', 'faturamento', 'area', 'tarefas', 'prazo', 'nota', 'status', 'entrada', 'pagina',
  'instagram', 'site', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const clip = v => Array.isArray(v) ? v.map(x => String(x).slice(0, 80)).slice(0, 4) : String(v).slice(0, 200);

export async function onRequestPost({ request, env, waitUntil }) {
  let b; try { b = await request.json(); } catch { return json({ ok: false, erro: 'json' }, 400); }
  if (b.empresa_site) return json({ ok: true }); // robô preencheu o campo escondido
  const nome = String(b.nome || '').trim().slice(0, 120), email = String(b.email || '').trim().toLowerCase().slice(0, 160);
  const whatsapp = String(b.whatsapp || '').replace(/[^\d+]/g, '').slice(0, 20);
  if (!nome || !/^\S+@\S+\.\S+$/.test(email) || whatsapp.replace(/\D/g, '').length < 10) return json({ ok: false, erro: 'campos' }, 422);
  if (b.origem !== 'chat-site' || b.aceite === true) {
    const envio = metaLead(b, env, request, { nome, email, whatsapp }).catch(e => console.log('Meta CAPI erro', String(e)));
    if (waitUntil) waitUntil(envio); else await envio;
  }

  if (b.origem === 'delegra-demo') return demoDelegra(b, env, { nome, email, whatsapp });
  if (b.origem === 'chat-site') return chatSite(b, env, { nome, email, whatsapp });

  const respostas = {}; for (const k of ANSWERS) if (b[k] != null && b[k] !== '') respostas[k] = clip(b[k]);
  const qualificado = respostas.status === 'qualificado';

  if (!env.CRM_API_URL || !env.CRM_API_KEY) { console.log('LEAD sem CRM configurado', JSON.stringify({ nome, email, whatsapp, ...respostas })); return json({ ok: true, salvo: false }); }
  const api = (path, body) => fetch(env.CRM_API_URL.replace(/\/$/, '') + path, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CRM_API_KEY}` }, body: JSON.stringify(body) });

  const [firstName, ...resto] = nome.split(/\s+/);
  const simples = respostas.status === 'simples';
  const FORM = { simples: 'form-simples', contato: 'form-qualificacao', agenda: 'form-qualificacao-agenda' };
  const tags = ['site-diagnostico', FORM[respostas.entrada] || 'form-qualificacao'];
  if (!simples) tags.push(qualificado ? 'lead-qualificado' : 'lead-nutrir');
  if (respostas.area) tags.push(`area-${respostas.area}`);
  if (respostas.negocio) tags.push(`segmento-${respostas.negocio}`);

  const c = await api('/contacts', { email, firstName, lastName: resto.join(' ') || undefined, phone: whatsapp, source: 'site-diagnostico', fields: Object.fromEntries(Object.entries(respostas).map(([k, v]) => [`diagnostico_${k}`, Array.isArray(v) ? v.join(', ') : v])), tags });
  if (!c.ok) { console.log('CRM contato falhou', c.status, await c.text()); return json({ ok: false, salvo: false }, 502); }

  if (qualificado || simples) { // Form Simples: todo mundo vai para o funil, a equipe liga para todos
    const notes = Object.entries(respostas).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
    const d = await api('/deals', { title: `${simples ? 'Contato' : 'Diagnóstico'} · ${nome}`, contactEmail: email, pipelineId: env.CRM_PIPELINE_ID || undefined, stageId: env.CRM_STAGE_ID || undefined, tagNames: ['site-diagnostico'], notes });
    if (!d.ok) console.log('CRM negócio falhou', d.status, await d.text());
  }
  const e = await api('/events', { email, name: 'diagnostico_site', data: respostas });
  if (!e.ok) console.log('CRM evento falhou', e.status, await e.text());
  return json({ ok: true, salvo: true });
}

// Pedido de demonstração da página do Delegra CRM (/solucoes/delegra/). Não é o diagnóstico da AgenticaLab:
// contato com as tags site-delegra e delegra-demo, negócio "Demo Delegra" no funil e evento "delegra_demo".
const DEMO = ['empresa', 'equipe', 'plano', 'pagina', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
async function demoDelegra(b, env, { nome, email, whatsapp }) {
  const r = {}; for (const k of DEMO) if (b[k] != null && b[k] !== '') r[k] = String(b[k]).slice(0, 200);
  if (!env.CRM_API_URL || !env.CRM_API_KEY) { console.log('DEMO DELEGRA sem CRM configurado', JSON.stringify({ nome, email, whatsapp, ...r })); return json({ ok: true, salvo: false }); }
  const api = (path, body) => fetch(env.CRM_API_URL.replace(/\/$/, '') + path, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CRM_API_KEY}` }, body: JSON.stringify(body) });
  const [firstName, ...resto] = nome.split(/\s+/);
  const tags = ['site-delegra', 'delegra-demo']; if (r.plano) tags.push(`delegra-plano-${r.plano}`);
  const c = await api('/contacts', { email, firstName, lastName: resto.join(' ') || undefined, phone: whatsapp, source: 'site-delegra', fields: Object.fromEntries(Object.entries(r).map(([k, v]) => [`delegra_${k}`, v])), tags });
  if (!c.ok) { console.log('CRM contato (demo Delegra) falhou', c.status, await c.text()); return json({ ok: false, salvo: false }, 502); }
  const notes = Object.entries(r).map(([k, v]) => `${k}: ${v}`).join('\n');
  const d = await api('/deals', { title: `Demo Delegra · ${nome}${r.empresa ? ` (${r.empresa})` : ''}`, contactEmail: email, pipelineId: env.CRM_PIPELINE_ID || undefined, stageId: env.CRM_STAGE_ID || undefined, tagNames: ['site-delegra'], notes });
  if (!d.ok) console.log('CRM negócio (demo Delegra) falhou', d.status, await d.text());
  const e = await api('/events', { email, name: 'delegra_demo', data: r });
  if (!e.ok) console.log('CRM evento (demo Delegra) falhou', e.status, await e.text());
  return json({ ok: true, salvo: true });
}

// Cadastro pelo balão do Noah (chat do site). O balão é só a porta: a conversa continua no WhatsApp com o SDR da casa,
// que o Delegra liga a este mesmo contato pelo telefone. Contato com as tags site-chat e lead-site, negócio
// "Novo lead" no funil (todo cadastro entra) e evento "chat_site", que pode disparar automações (ex.: follow-up).
const CHAT = ['assunto', 'pagina', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const ASSUNTOS = ['marketing', 'comercial', 'operacao', 'diagnostico', 'atendimento', 'vendas']; // os 2 últimos: balão antigo ainda em cache no navegador
async function chatSite(b, env, { nome, email, whatsapp }) {
  if (b.aceite !== true) return json({ ok: false, erro: 'aceite' }, 422);
  const r = {}; for (const k of CHAT) if (b[k] != null && b[k] !== '') r[k] = String(b[k]).slice(0, 200);
  if (r.assunto && !ASSUNTOS.includes(r.assunto)) delete r.assunto;
  if (r.pagina) r.pagina = r.pagina.replace(/[^\w\/-]/g, '').slice(0, 120);
  r.aceite = new Date().toISOString();
  if (!env.CRM_API_URL || !env.CRM_API_KEY) { console.log('CHAT SITE sem CRM configurado', JSON.stringify({ nome, email, whatsapp, ...r })); return json({ ok: true, salvo: false }); }
  const api = (path, body) => fetch(env.CRM_API_URL.replace(/\/$/, '') + path, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CRM_API_KEY}` }, body: JSON.stringify(body) });
  const [firstName, ...resto] = nome.split(/\s+/);
  const tags = ['site-chat', 'lead-site']; if (r.assunto) tags.push(`assunto-${r.assunto}`);
  const c = await api('/contacts', { email, firstName, lastName: resto.join(' ') || undefined, phone: whatsapp, source: 'site-chat', fields: Object.fromEntries(Object.entries(r).map(([k, v]) => [`chat_${k}`, v])), tags });
  if (!c.ok) { console.log('CRM contato (chat do site) falhou', c.status, await c.text()); return json({ ok: false, salvo: false }, 502); }
  const notes = Object.entries(r).map(([k, v]) => `${k}: ${v}`).join('\n');
  const d = await api('/deals', { title: `Novo lead · ${nome}`, contactEmail: email, pipelineId: env.CRM_PIPELINE_ID || undefined, stageId: env.CRM_STAGE_ID || undefined, tagNames: ['site-chat'], notes });
  if (!d.ok) console.log('CRM negócio (chat do site) falhou', d.status, await d.text());
  const e = await api('/events', { email, name: 'chat_site', data: r });
  if (!e.ok) console.log('CRM evento (chat do site) falhou', e.status, await e.text());
  return json({ ok: true, salvo: true });
}

// Evento "Lead" pela API de Conversões. Só com aceite de cookies (o navegador só manda "pixel" nesse caso) e com token.
const sha = async v => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)))].map(x => x.toString(16).padStart(2, '0')).join('');
export async function metaLead(b, env, request, { nome, email, whatsapp }) {
  const p = b.pixel;
  if (!env.META_CAPI_TOKEN || !p || typeof p.event_id !== 'string' || !/^[\w.-]{8,80}$/.test(p.event_id)) return null;
  let ph = whatsapp.replace(/\D/g, ''); if (ph.length <= 11) ph = '55' + ph;
  const txt = (v, n) => typeof v === 'string' && v.length <= n ? v : undefined;
  const user_data = { em: [await sha(email)], ph: [await sha(ph)], fn: [await sha(nome.split(/\s+/)[0].toLowerCase())], country: [await sha('br')],
    client_ip_address: request.headers.get('cf-connecting-ip') || undefined, client_user_agent: request.headers.get('user-agent') || undefined,
    fbp: txt(p.fbp, 120), fbc: txt(p.fbc, 300) };
  const info = p.info && typeof p.info === 'object' ? p.info : {};
  const custom_data = { content_name: txt(info.content_name, 40) || txt(b.origem, 40) || 'diagnostico', status: txt(info.status, 20) };
  const corpo = { data: [{ event_name: 'Lead', event_time: Math.floor(Date.now() / 1000), event_id: p.event_id, action_source: 'website',
    event_source_url: txt(p.url, 500) && /^https:\/\//.test(p.url) ? p.url : undefined, user_data, custom_data }] };
  if (env.META_TEST_CODE) corpo.test_event_code = env.META_TEST_CODE;
  const r = await fetch(`https://graph.facebook.com/v21.0/${env.META_PIXEL_ID || '896432615417080'}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
  if (!r.ok) console.log('Meta CAPI falhou', r.status, await r.text());
  return r.status;
}
